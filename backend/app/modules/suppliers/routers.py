from fastapi import APIRouter
from app.modules.suppliers.schemas import SupplierCreate, SupplierResponse
import uuid

router = APIRouter(prefix="/suppliers", tags=["Suppliers Management"])

@router.post("/", response_model=SupplierResponse)
async def create_supplier(supplier: SupplierCreate):
    """
    Registra un nuevo proveedor en el sistema para gestión de abastecimiento.
    """
    return SupplierResponse(
        id=f"SUP-{uuid.uuid4().hex[:4]}",
        active=True,
        **supplier.model_dump()
    )

@router.get("/")
async def list_suppliers():
    """
    Lista los proveedores activos con sus calificaciones de desempeño.
    """
    return [
        {"id": "SUP-1", "name": "Bayer S.A.", "rating": 5},
        {"id": "SUP-2", "name": "Pfizer", "rating": 4}
    ]
