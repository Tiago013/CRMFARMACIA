from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from app.modules.sales.repositories import SaleRepository
from app.modules.sales.schemas import SaleCreate
from app.modules.sales.models import Sale, SaleItem, Payment
from app.modules.inventory.repositories import ProductRepository, BatchRepository
from app.modules.inventory.models import StockMovement
from app.core.middleware import get_current_tenant_id
from app.core.redis import get_redis_client
from app.core.events import event_bus
from fastapi import HTTPException
import json

class CheckoutService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.sale_repo = SaleRepository(db)
        self.product_repo = ProductRepository(db)
        self.batch_repo = BatchRepository(db)

    async def process_sale(self, data: SaleCreate, user_id: UUID) -> Sale:
        tenant_id = get_current_tenant_id()
        if not tenant_id:
            raise HTTPException(status_code=401, detail="Tenant context required")

        # 1. Idempotency Check
        redis = get_redis_client()
        idempotency_key = f"pos:idempotency:{tenant_id}:{data.idempotency_key}"
        if redis:
            exists = await redis.get(idempotency_key)
            if exists:
                raise HTTPException(status_code=409, detail="Sale already processed (Idempotency Hit)")

        # 2. Initialize Sale and calculate totals
        sale = Sale(
            tenant_id=tenant_id,
            user_id=user_id,
            patient_id=data.patient_id,
            idempotency_key=data.idempotency_key,
            subtotal=0,
            grand_total=0
        )
        
        # 3. Process Items and Inventory (FEFO)
        for item in data.items:
            product = await self.product_repo.get_by_id(item.product_id)
            if not product:
                raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
                
            # Line total
            line_total = product.unit_price * item.quantity
            sale.subtotal += line_total
            
            # FEFO Logic: Get batches sorted by expiration
            batches = await self.batch_repo.get_batches_fefo(item.product_id)
            remaining_to_deduct = item.quantity
            
            for batch in batches:
                if remaining_to_deduct <= 0:
                    break
                    
                deduct = min(batch.quantity, remaining_to_deduct)
                batch.quantity -= deduct
                remaining_to_deduct -= deduct
                
                # Create Sale Item
                sale_item = SaleItem(
                    tenant_id=tenant_id,
                    product_id=product.id,
                    batch_id=batch.id,
                    quantity=deduct,
                    unit_price_at_sale=product.unit_price
                )
                sale.items.append(sale_item)
                
                # Create Stock Movement
                movement = StockMovement(
                    tenant_id=tenant_id,
                    user_id=user_id,
                    product_id=product.id,
                    batch_id=batch.id,
                    movement_type="SALE_OUT",
                    quantity=-deduct
                )
                self.db.add(movement)
                
            if remaining_to_deduct > 0:
                raise HTTPException(status_code=400, detail=f"Not enough stock for product {product.brand_name}")

        sale.grand_total = sale.subtotal # Simplified: no tax/discount logic here

        # 4. Verify Payments
        total_paid = sum(p.amount_paid for p in data.payments)
        if total_paid < sale.grand_total:
            raise HTTPException(status_code=400, detail="Insufficient payment amount")

        for payment in data.payments:
            sale.payments.append(Payment(
                tenant_id=tenant_id,
                payment_method=payment.payment_method,
                amount_paid=payment.amount_paid
            ))

        # 5. Save to DB
        await self.sale_repo.create(sale)
        await self.db.commit() # ALL OR NOTHING ACID COMMIT
        
        # 6. Emit event
        sale_data = {
            "sale_id": str(sale.id),
            "patient_id": str(sale.patient_id) if sale.patient_id else None,
            "total": sale.grand_total,
            "tenant_id": str(tenant_id)
        }
        await event_bus.publish("sale.completed", sale_data)
        
        # 7. Mark as processed in Redis
        if redis:
            await redis.setex(idempotency_key, 86400, json.dumps({"sale_id": str(sale.id)})) # 24h TTL
            
        return sale
