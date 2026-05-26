import logging
from app.core.events import event_bus
import sqlite3
import json
from app.core.local_db import DB_PATH
import uuid

logger = logging.getLogger("farmaai.crm.listeners")

async def on_sale_completed(topic: str, payload: dict):
    """
    Reacciona cuando se completa una venta en el POS.
    Actualiza el timeline del paciente y recalcula LTV.
    """
    event_id = payload.get("event_id")
    tenant_id = payload.get("tenant_id")
    patient_id = payload.get("patient_id")
    if not patient_id or not event_id or not tenant_id:
        return
        
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check Idempotency
        cursor.execute("SELECT event_id FROM event_log WHERE event_id = ?", (event_id,))
        if cursor.fetchone():
            logger.info(f"Evento {event_id} ya procesado, ignorando.")
            conn.close()
            return
            
        event_data = {
            "sale_id": payload.get("sale_id"),
            "total": payload.get("total"),
            "source": "pos_sync"
        }
        
        # Insert timeline event
        cursor.execute("""
            INSERT INTO patient_timeline_events (id, tenant_id, patient_id, event_type, event_data)
            VALUES (?, ?, ?, ?, ?)
        """, (str(uuid.uuid4()), tenant_id, patient_id, "sale_completed", json.dumps(event_data)))
        
        # Registrar evento procesado
        cursor.execute("""
            INSERT INTO event_log (event_id, tenant_id, event_type)
            VALUES (?, ?, ?)
        """, (event_id, tenant_id, topic))
        
        conn.commit()
        conn.close()
        logger.info(f"Timeline actualizada para paciente {patient_id} por venta {payload.get('sale_id')}")
        
    except Exception as e:
        logger.error(f"Error procesando evento {topic} en CRM: {str(e)}")

def setup_crm_listeners():
    event_bus.subscribe("sale.completed", on_sale_completed)
    logger.info("Listeners de CRM configurados.")
