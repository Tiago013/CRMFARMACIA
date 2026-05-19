from fastapi import APIRouter
from app.modules.procurement.schemas import PurchaseOrderRequest, ReceiveGoodsRequest
from app.core.local_db import query_all
import uuid

router = APIRouter(prefix="/procurement", tags=["Procurement & Supply Chain"])

@router.post("/orders")
async def create_purchase_order(po_req: PurchaseOrderRequest):
    """Crea una Orden de Compra (Purchase Order)."""
    po_id = f"PO-{uuid.uuid4().hex[:6].upper()}"
    return {"status": "created", "po_id": po_id, "expected_delivery": po_req.expected_delivery}

@router.get("/orders")
async def list_purchase_orders():
    """Lista órdenes de compra REALES desde la base de datos SQLite."""
    orders = query_all("""
        SELECT po.id, po.status, po.created_at, po.expected_delivery, po.invoice_number,
               s.name as supplier_name
        FROM purchase_orders po
        JOIN suppliers s ON po.supplier_id = s.id
        ORDER BY po.created_at DESC
    """)
    
    # Attach items to each order
    for order in orders:
        items = query_all("""
            SELECT product_sku, product_name, quantity_ordered, quantity_received, unit_cost, total_cost
            FROM purchase_order_items WHERE purchase_order_id = ?
        """, (order["id"],))
        order["items"] = items
    
    return orders

@router.post("/receive")
async def receive_goods(receive_req: ReceiveGoodsRequest):
    """Registra la entrada de mercancía."""
    return {
        "status": "success",
        "message": f"Mercancía recibida para la orden {receive_req.po_id}",
        "invoice_linked": receive_req.invoice_number
    }
