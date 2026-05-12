from pydantic import BaseModel
from typing import List, Optional

class PurchaseOrderItem(BaseModel):
    product_id: str
    quantity_ordered: int
    unit_cost: float

class PurchaseOrderRequest(BaseModel):
    supplier_id: str
    items: List[PurchaseOrderItem]
    expected_delivery: str

class ReceivingEntry(BaseModel):
    product_id: str
    quantity_received: int

class ReceiveGoodsRequest(BaseModel):
    po_id: str
    received_items: List[ReceivingEntry]
    invoice_number: Optional[str] = None
