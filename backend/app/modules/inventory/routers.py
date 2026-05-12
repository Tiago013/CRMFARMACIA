from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.core.database import get_db
from app.modules.inventory.schemas import ProductWithStockResponse, StockMovementCreate
from app.modules.inventory.services import InventoryService
import uuid

router = APIRouter(prefix="/inventory", tags=["inventory"])

# Dummy dependency to simulate a logged-in user and get their ID
async def get_current_user_id() -> uuid.UUID:
    return uuid.uuid4() # In a real app, this extracts the user ID from the JWT

@router.get("/products", response_model=List[ProductWithStockResponse])
async def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    inventory_service = InventoryService(db)
    return await inventory_service.get_products_with_stock(skip=skip, limit=limit)

@router.post("/movements", response_model=dict)
async def register_movement(
    movement: StockMovementCreate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    inventory_service = InventoryService(db)
    result = await inventory_service.register_movement(movement, user_id)
    return {"status": "success", "movement_id": result.id}
