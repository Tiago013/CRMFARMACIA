from pydantic import BaseModel
from typing import Optional

class SupplierCreate(BaseModel):
    name: str
    contact_email: str
    contact_phone: Optional[str] = None
    rating: int = 5 # 1-5 Performance rating

class SupplierResponse(SupplierCreate):
    id: str
    active: bool
