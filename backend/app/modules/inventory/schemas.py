from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime

class ProductBase(BaseModel):
    sku: str
    barcode: Optional[str] = None
    brand_name: str
    active_ingredient: Optional[str] = None
    presentation: Optional[str] = None
    unit_price: float = Field(gt=0)
    cost_price: Optional[float] = None
    min_stock: int = 5
    category_id: Optional[UUID] = None

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: UUID
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class ProductWithStockResponse(ProductResponse):
    total_stock: int = 0

class BatchBase(BaseModel):
    product_id: UUID
    batch_number: str
    expiration_date: date
    quantity: int = Field(ge=0)

class BatchCreate(BatchBase):
    pass

class BatchResponse(BatchBase):
    id: UUID
    
    class Config:
        from_attributes = True

class StockMovementCreate(BaseModel):
    product_id: UUID
    batch_id: Optional[UUID] = None
    movement_type: str = Field(..., pattern="^(PURCHASE_IN|SALE_OUT|EXPIRED_ADJUST|MANUAL_ADJUST)$")
    quantity: int
    reference_id: Optional[str] = None
