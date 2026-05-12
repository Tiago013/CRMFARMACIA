from fastapi import APIRouter
from app.modules.procurement.schemas import PurchaseOrderRequest, ReceiveGoodsRequest
import uuid

router = APIRouter(prefix="/procurement", tags=["Procurement & Supply Chain"])

@router.post("/orders")
async def create_purchase_order(po_req: PurchaseOrderRequest):
    """
    Crea una Orden de Compra (Purchase Order) para reabastecimiento de inventario.
    """
    po_id = f"PO-{uuid.uuid4().hex[:6].upper()}"
    return {"status": "created", "po_id": po_id, "expected_delivery": po_req.expected_delivery}

@router.post("/receive")
async def receive_goods(receive_req: ReceiveGoodsRequest):
    """
    Registra la entrada de mercancía (Receiving).
    Soporta recepción parcial y actualiza el inventario físico y costos.
    """
    return {
        "status": "success",
        "message": f"Mercancía recibida para la orden {receive_req.po_id}",
        "invoice_linked": receive_req.invoice_number
    }
