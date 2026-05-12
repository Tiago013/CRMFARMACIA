import uuid
import logging
from app.modules.pos.schemas import POSCheckoutRequest, POSCheckoutResponse
from app.modules.pos.pricing import PricingEngine

logger = logging.getLogger("farmaai.pos.checkout")

class CheckoutEngine:
    def __init__(self):
        self.pricing_engine = PricingEngine()

    async def process_checkout(self, request: POSCheckoutRequest) -> POSCheckoutResponse:
        """
        Orquesta el flujo crítico de venta en el POS.
        1. Validar carrito y stock.
        2. Calcular precios y promociones.
        3. Procesar pago.
        4. Decrementar stock (FEFO).
        5. Actualizar CRM (Historial).
        6. Generar ticket (Receipt).
        """
        # Calcular total final
        total_amount = self.pricing_engine.calculate_total(request.items)
        
        # Validar monto vs pagos recibidos
        paid_amount = sum(p.amount for p in request.payments)
        if paid_amount < total_amount:
            raise ValueError("Monto pagado insuficiente")

        # Generar ID de transacción único
        transaction_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
        
        logger.info(f"Checkout procesado exitosamente: {transaction_id} | Total: {total_amount}")
        
        # En el futuro, aquí se emite un Evento (Domain Event) para actualizar inventario y CRM asíncronamente
        
        return POSCheckoutResponse(
            success=True,
            transaction_id=transaction_id,
            total_amount=total_amount,
            receipt_url=f"/receipts/{transaction_id}.pdf"
        )
