from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List, Optional
from uuid import UUID
from app.modules.inventory.models import Product, Batch, StockMovement
from app.core.middleware import get_current_tenant_id

class ProductRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, product_id: UUID) -> Optional[Product]:
        tenant_id = get_current_tenant_id()
        result = await self.db.execute(
            select(Product).where(Product.id == product_id, Product.tenant_id == tenant_id, Product.is_active == True)
        )
        return result.scalars().first()

    async def list_products_with_stock(self, skip: int = 0, limit: int = 50) -> List[tuple[Product, int]]:
        tenant_id = get_current_tenant_id()
        
        # Subquery to calculate total stock per product
        stock_subquery = (
            select(Batch.product_id, func.sum(Batch.quantity).label("total_stock"))
            .where(Batch.tenant_id == tenant_id)
            .group_by(Batch.product_id)
            .subquery()
        )
        
        query = (
            select(Product, func.coalesce(stock_subquery.c.total_stock, 0))
            .outerjoin(stock_subquery, Product.id == stock_subquery.c.product_id)
            .where(Product.tenant_id == tenant_id, Product.is_active == True)
            .offset(skip)
            .limit(limit)
        )
        
        result = await self.db.execute(query)
        return result.all()

class BatchRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_batches_fefo(self, product_id: UUID) -> List[Batch]:
        """Returns batches ordered by First Expired First Out with quantity > 0"""
        tenant_id = get_current_tenant_id()
        query = (
            select(Batch)
            .where(Batch.product_id == product_id, Batch.tenant_id == tenant_id, Batch.quantity > 0)
            .order_by(Batch.expiration_date.asc())
        )
        result = await self.db.execute(query)
        return result.scalars().all()
