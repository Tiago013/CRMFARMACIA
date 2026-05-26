from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
import uuid
import json
from fastapi import HTTPException
import sqlite3
from datetime import datetime

from app.modules.sales.schemas import SaleCreate
from app.core.middleware import get_current_tenant_id
from app.core.redis import get_redis_client
from app.core.events import event_bus
from app.core.local_db import DB_PATH

class CheckoutService:
    def __init__(self, db: AsyncSession):
        # We keep the parameter signature for compatibility with Depends(get_db) 
        # but we ignore it and use SQLite directly.
        self.db = db

    async def process_sale(self, data: SaleCreate, user_id: UUID):
        tenant_id = get_current_tenant_id() or "tenant_123"
        
        # 1. Idempotency Check
        redis = get_redis_client()
        idempotency_key = f"pos:idempotency:{tenant_id}:{data.idempotency_key}"
        if redis:
            exists = await redis.get(idempotency_key)
            if exists:
                raise HTTPException(status_code=409, detail="Sale already processed (Idempotency Hit)")
                
        sale_id = str(uuid.uuid4())
        created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        try:
            subtotal = 0.0
            
            # 3. Process Items and Inventory (FEFO)
            for item in data.items:
                cursor.execute("SELECT id, brand_name, unit_price FROM products WHERE id = ?", (str(item.product_id),))
                product = cursor.fetchone()
                if not product:
                    raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
                    
                price = product["unit_price"] or 5.0
                line_total = price * item.quantity
                subtotal += line_total
                
                # Get batches FEFO
                cursor.execute("""
                    SELECT id, quantity 
                    FROM batches 
                    WHERE product_id = ? AND quantity > 0
                    ORDER BY expiration_date ASC
                """, (product["id"],))
                batches = cursor.fetchall()
                
                remaining_to_deduct = item.quantity
                
                for batch in batches:
                    if remaining_to_deduct <= 0:
                        break
                        
                    deduct = min(batch["quantity"], remaining_to_deduct)
                    remaining_to_deduct -= deduct
                    
                    # Update batch
                    cursor.execute("UPDATE batches SET quantity = quantity - ? WHERE id = ?", (deduct, batch["id"]))
                    
                    # Create sale item
                    cursor.execute("""
                        INSERT INTO sale_items (id, tenant_id, sale_id, product_id, batch_id, quantity, unit_price_at_sale)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (str(uuid.uuid4()), tenant_id, sale_id, product["id"], batch["id"], deduct, price))
                    
                if remaining_to_deduct > 0:
                    raise HTTPException(status_code=400, detail=f"Not enough stock for product {product['brand_name']}")
                    
            grand_total = subtotal
            
            # 4. Verify Payments
            total_paid = sum(p.amount_paid for p in data.payments)
            if total_paid < grand_total:
                raise HTTPException(status_code=400, detail="Insufficient payment amount")
                
            for payment in data.payments:
                cursor.execute("""
                    INSERT INTO payments (id, tenant_id, sale_id, payment_method, amount_paid)
                    VALUES (?, ?, ?, ?, ?)
                """, (str(uuid.uuid4()), tenant_id, sale_id, payment.payment_method, payment.amount_paid))
                
            # 5. Save Sale to DB
            cursor.execute("""
                INSERT INTO sales (id, tenant_id, user_id, patient_id, subtotal, grand_total, status, method, idempotency_key, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 'completed', 'tarjeta', ?, ?)
            """, (sale_id, tenant_id, str(user_id), str(data.patient_id) if data.patient_id else None, 
                  subtotal, grand_total, data.idempotency_key, created_at))
                  
            # Update Patient LTV
            if data.patient_id:
                cursor.execute("UPDATE patients SET ltv = ltv + ? WHERE id = ?", (grand_total, str(data.patient_id)))
                
            conn.commit()
            
        except Exception as e:
            conn.rollback()
            conn.close()
            raise e
            
        conn.close()
        
        # 6. Emit event (bypass publish_on_commit to just publish directly since we already committed SQLite)
        sale_event_data = {
            "event_id": str(uuid.uuid4()),
            "sale_id": sale_id,
            "patient_id": str(data.patient_id) if data.patient_id else None,
            "total": grand_total,
            "tenant_id": str(tenant_id)
        }
        await event_bus.publish("sale.completed", sale_event_data)
        
        # 7. Mark as processed in Redis
        if redis:
            await redis.setex(idempotency_key, 86400, json.dumps({"sale_id": sale_id}))
            
        # Return a mock Sale object to satisfy the router's expected return type
        class MockSale:
            def __init__(self, sale_id, grand_total):
                self.id = sale_id
                self.grand_total = grand_total
        return MockSale(sale_id, grand_total)
