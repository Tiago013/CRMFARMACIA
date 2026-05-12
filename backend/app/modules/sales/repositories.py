from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.sales.models import Sale
from app.core.middleware import get_current_tenant_id

class SaleRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, sale: Sale) -> Sale:
        self.db.add(sale)
        await self.db.flush()
        return sale
