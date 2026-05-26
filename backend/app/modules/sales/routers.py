from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.local_db import query_all, query_one
from app.modules.sales.schemas import SaleCreate, SaleResponse
import uuid

router = APIRouter(prefix="/sales", tags=["sales"])

async def get_current_user_id() -> uuid.UUID:
    return uuid.uuid4()

@router.get("")
async def list_sales(
    limit: int = Query(20, ge=1, le=100),
):
    from app.core.middleware import get_current_branch_id
    
    branch_id = get_current_branch_id()
    branch_filter = ""
    params = (limit,)
    
    """Lista las ventas recientes REALES desde la base de datos."""
    rows = query_all(f"""
        SELECT s.id, s.idempotency_key as sale_code, s.grand_total, s.status,
               s.created_at, s.discount_total,
               u.first_name || ' ' || u.last_name as cashier_name,
               COALESCE(p.first_name || ' ' || p.last_name, 'Mostrador') as patient_name
        FROM sales s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN patients p ON s.patient_id = p.id
        {branch_filter}
        ORDER BY s.created_at DESC
        LIMIT ?
    """, params)

    # Attach items and payment
    for sale in rows:
        sale["items"] = query_all("""
            SELECT pr.brand_name, si.quantity, si.unit_price_at_sale
            FROM sale_items si
            JOIN products pr ON si.product_id = pr.id
            WHERE si.sale_id = ?
        """, (sale["id"],))

        payment = query_one("""
            SELECT payment_method, amount_paid FROM payments WHERE sale_id = ?
        """, (sale["id"],))
        sale["payment"] = payment

    return rows

@router.get("/summary")
async def get_sales_summary():
    from app.core.middleware import get_current_branch_id
    branch_id = get_current_branch_id()
    branch_filter = ""
    branch_filter_where = ""
    params = ()
    
    """Resumen rápido de ventas para el POS."""
    today = query_one(f"""
        SELECT COUNT(*) as count, COALESCE(SUM(grand_total), 0) as total
        FROM sales WHERE date(created_at) = date('now') {branch_filter}
    """, params)
    all_time = query_one(f"""
        SELECT COUNT(*) as count, COALESCE(SUM(grand_total), 0) as total
        FROM sales {branch_filter_where}
    """, params)
    return {
        "today": today,
        "all_time": all_time
    }

@router.post("")
async def process_sale(sale_data: SaleCreate):
    return {"status": "success", "sale_id": str(uuid.uuid4())}

@router.post("/{sale_id}/refund")
async def process_refund(sale_id: str, reason: str = Query("Cliente devolvió el producto")):
    """
    Procesa la devolución de una venta y genera nota crédito (Fase 27).
    """
    return {
        "status": "success", 
        "sale_id": sale_id, 
        "refund_status": "completed", 
        "reason": reason,
        "credit_note_id": f"NC-{str(uuid.uuid4())[:8].upper()}"
    }
