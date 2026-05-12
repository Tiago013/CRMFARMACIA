from pydantic import BaseModel
from typing import List, Optional

class POSItem(BaseModel):
    product_id: str
    quantity: int
    unit_price: float
    discount: float = 0.0

class POSPayment(BaseModel):
    method: str  # "cash", "card", "mixed"
    amount: float

class POSCheckoutRequest(BaseModel):
    items: List[POSItem]
    payments: List[POSPayment]
    patient_id: Optional[str] = None
    session_id: str
    idempotency_key: str

class POSCheckoutResponse(BaseModel):
    success: bool
    transaction_id: str
    total_amount: float
    receipt_url: str
