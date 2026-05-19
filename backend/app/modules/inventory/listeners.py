import logging
from app.core.events import event_bus
from app.core.database import AsyncSessionLocal

logger = logging.getLogger("farmaai.inventory.listeners")

async def on_sale_completed(topic: str, payload: dict):
    """
    Nota: El stock ya se decrementa sincrónicamente en CheckoutService.process_sale
    para garantizar integridad ACID en el momento de la venta.
    Aquí podríamos realizar acciones asíncronas como verificar si el stock 
    bajó del mínimo y generar una alerta de re-abastecimiento.
    """
    logger.info(f"Inventory procesando venta asíncrona: {payload.get('sale_id')}")
    # TODO: Implementar lógica de alertas de stock mínimo

def setup_inventory_listeners():
    event_bus.subscribe("sale.completed", on_sale_completed)
    logger.info("Listeners de Inventario configurados.")
