from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from app.modules.inventory.repositories import ProductRepository, BatchRepository
from app.modules.inventory.schemas import StockMovementCreate
from app.modules.inventory.models import StockMovement
from app.core.middleware import get_current_tenant_id
from fastapi import HTTPException

class InventoryService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.product_repo = ProductRepository(db)
        self.batch_repo = BatchRepository(db)

    async def get_products_with_stock(self, skip: int = 0, limit: int = 50):
        # We need to format the result from the repository which returns a tuple (Product, total_stock)
        results = await self.product_repo.list_products_with_stock(skip, limit)
        response = []
        for product, stock in results:
            product_dict = {c.name: getattr(product, c.name) for c in product.__table__.columns}
            product_dict["total_stock"] = stock
            response.append(product_dict)
        return response

    async def register_movement(self, movement_data: StockMovementCreate, user_id: UUID):
        tenant_id = get_current_tenant_id()
        if not tenant_id:
            raise HTTPException(status_code=401, detail="No tenant context found")

        # In a real app, we'd add pessimistic locking (SELECT FOR UPDATE) on the batch row here
        
        movement = StockMovement(
            tenant_id=tenant_id,
            user_id=user_id,
            product_id=movement_data.product_id,
            batch_id=movement_data.batch_id,
            movement_type=movement_data.movement_type,
            quantity=movement_data.quantity,
            reference_id=movement_data.reference_id
        )
        
        # If it's a manual adjust or sale out, we must decrement the batch quantity
        if movement_data.batch_id and movement_data.quantity != 0:
            # We would fetch the batch, update quantity, and save
            # This is a simplified version for scaffolding
            pass

        self.db.add(movement)
        await self.db.commit()
        return movement
