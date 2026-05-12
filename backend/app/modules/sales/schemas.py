from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime

class SaleItemCreate(BaseModel):
    product_id: UUID
    quantity: int = Field(gt=0)
    # The frontend shouldn't send price, the backend looks it up!
    # But for a basic MVP without a complex pricing engine, we might allow it or fetch it.
    # In a real enterprise app, frontend only sends product_id and quantity.

class PaymentCreate(BaseModel):
    payment_method: str = Field(pattern="^(cash|credit_card|transfer)$")
    amount_paid: float = Field(gt=0)

class SaleCreate(BaseModel):
    patient_id: Optional[UUID] = None
    items: List[SaleItemCreate] = Field(min_length=1)
    payments: List[PaymentCreate] = Field(min_length=1)
    idempotency_key: str

class SaleResponse(BaseModel):
    id: UUID
    subtotal: float
    grand_total: float
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True
