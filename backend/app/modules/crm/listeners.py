import logging
from app.core.events import event_bus
from app.modules.crm.services import CRMService
from app.modules.crm.schemas import TimelineEventCreate
from app.core.database import AsyncSessionLocal

logger = logging.getLogger("farmaai.crm.listeners")

async def on_sale_completed(topic: str, payload: dict):
    """
    Reacciona cuando se completa una venta en el POS.
    Actualiza el timeline del paciente y recalcula LTV.
    """
    patient_id = payload.get("patient_id")
    if not patient_id:
        return
        
    try:
        async with AsyncSessionLocal() as db:
            crm_service = CRMService(db)
            await crm_service.add_timeline_event(TimelineEventCreate(
                patient_id=patient_id,
                event_type="sale_completed",
                event_data={
                    "sale_id": payload.get("sale_id"),
                    "total": payload.get("total"),
                    "source": "pos_sync"
                }
            ))
            await db.commit()
            logger.info(f"Timeline actualizada para paciente {patient_id} por venta {payload.get('sale_id')}")
    except Exception as e:
        logger.error(f"Error procesando evento {topic} en CRM: {str(e)}")

def setup_crm_listeners():
    event_bus.subscribe("sale.completed", on_sale_completed)
    logger.info("Listeners de CRM configurados.")
