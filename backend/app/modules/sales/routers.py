from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.modules.sales.schemas import SaleCreate, SaleResponse
from app.modules.sales.services import CheckoutService
import uuid

router = APIRouter(prefix="/sales", tags=["sales"])

# Dummy dependency
async def get_current_user_id() -> uuid.UUID:
    return uuid.uuid4()

@router.post("", response_model=SaleResponse)
async def process_sale(
    sale_data: SaleCreate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    checkout_service = CheckoutService(db)
    sale = await checkout_service.process_sale(sale_data, user_id)
    return sale
