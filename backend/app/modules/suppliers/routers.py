from fastapi import APIRouter
from app.core.local_db import query_all, query_one
from app.modules.suppliers.schemas import SupplierCreate, SupplierResponse
import uuid

router = APIRouter(prefix="/suppliers", tags=["Suppliers Management"])

from fastapi import HTTPException

@router.post("/", response_model=SupplierResponse)
async def create_supplier(supplier: SupplierCreate):
    """Registra un nuevo proveedor en SQLite."""
    import sqlite3
    from app.core.local_db import DB_PATH
    
    sup_id = f"SUP-{uuid.uuid4().hex[:4].upper()}"
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO suppliers (id, name, nit, contact_name, contact_phone, contact_email, city, type, credit_days, early_payment_discount, rating, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ''', (
            sup_id, supplier.name, supplier.nit, supplier.contact_name,
            supplier.contact_phone, supplier.contact_email, supplier.city,
            supplier.type, supplier.credit_days, supplier.early_payment_discount,
            supplier.rating
        ))
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

    return SupplierResponse(
        id=sup_id,
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
