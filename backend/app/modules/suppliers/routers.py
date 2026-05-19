from fastapi import APIRouter
from app.core.local_db import query_all, query_one
from app.modules.suppliers.schemas import SupplierCreate, SupplierResponse
import uuid

router = APIRouter(prefix="/suppliers", tags=["Suppliers Management"])

@router.post("/", response_model=SupplierResponse)
async def create_supplier(supplier: SupplierCreate):
    """Registra un nuevo proveedor."""
    return SupplierResponse(
        id=f"SUP-{uuid.uuid4().hex[:4]}",
        active=True,
        **supplier.model_dump()
    )

@router.get("/")
async def list_suppliers():
    """Lista proveedores REALES desde la base de datos SQLite."""
    return query_all("""
        SELECT id as id, name, nit, contact_name, contact_phone, contact_email,
               city, type, credit_days, early_payment_discount, rating
        FROM suppliers
        WHERE is_active = 1
        ORDER BY rating DESC
    """)
