from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.responses import HTMLResponse
import uuid

from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.pos.schemas import POSCheckoutRequest, POSCheckoutResponse
from app.modules.sales.schemas import SaleCreate, SaleItemCreate, PaymentCreate
from app.modules.sales.services import CheckoutService

router = APIRouter(prefix="/pos", tags=["POS Enterprise"])

@router.post("/checkout", response_model=POSCheckoutResponse)
async def process_pos_checkout(
    request: POSCheckoutRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Procesa un carrito de compras en la caja registradora.
    Incluye validación de pagos, stock y promociones automáticas.
    """
    try:
        checkout_service = CheckoutService(db)
        
        # Convert POSCheckoutRequest to SaleCreate
        sale_items = [
            SaleItemCreate(product_id=item.product_id, quantity=item.quantity)
            for item in request.items
        ]
        
        sale_payments = [
            PaymentCreate(payment_method=payment.method, amount_paid=payment.amount)
            for payment in request.payments
        ]
        
        patient_uuid = request.patient_id if request.patient_id else None
        
        sale_create = SaleCreate(
            patient_id=patient_uuid,
            items=sale_items,
            payments=sale_payments,
            idempotency_key=request.idempotency_key
        )
        
        user_id = uuid.UUID(current_user["id"])
        
        # Process sale with ACID, FEFO, and Events
        sale = await checkout_service.process_sale(sale_create, user_id)
        
        # Return response
        return POSCheckoutResponse(
            success=True,
            transaction_id=str(sale.id),
            total_amount=sale.grand_total,
            receipt_url=f"/api/v1/pos/receipts/{sale.id}.pdf"
        )
        
    except HTTPException as he:
        raise he
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        import logging
        logging.error(f"Error in checkout: {e}")
        raise HTTPException(status_code=500, detail="Error interno procesando la venta")

@router.get("/receipts/{transaction_id}.pdf", response_class=HTMLResponse)
async def get_receipt(transaction_id: str):
    """
    Genera un recibo (dummy PDF/HTML) para imprimir.
    En producción, esto puede renderizar un PDF usando reportlab o weasyprint.
    """
    html_content = f"""
    <html>
        <head><title>Receipt {transaction_id}</title></head>
        <body style="font-family: monospace; padding: 20px;">
            <h1 style="text-align: center;">FarmaAI</h1>
            <h3 style="text-align: center;">Comprobante de Venta</h3>
            <p><strong>Transacción:</strong> {transaction_id}</p>
            <p><strong>Fecha:</strong> Fecha de emisión</p>
            <hr />
            <p>¡Gracias por su compra!</p>
            <script>window.print();</script>
        </body>
    </html>
    """
    return html_content
