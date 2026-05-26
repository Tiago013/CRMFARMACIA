from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Dict, Any
import sqlite3
from loguru import logger
from app.core.local_db import DB_PATH
from app.modules.events.bus import EventBus
import uuid

router = APIRouter(prefix="/integrations/odoo", tags=["Integrations"])

@router.post("/webhook/{tenant_id}")
async def odoo_webhook_handler(tenant_id: str, payload: Dict[str, Any], request: Request):
    """
    Bi-directional Sync: Odoo to FarmaAI CRM.
    Receives events from Odoo (e.g. partner updated, credit hold).
    """
    # 1. Validate security token or signature (in a real app, from headers)
    # token = request.headers.get("X-Odoo-Signature")
    
    # 2. Extract Event Type and Data
    event_type = payload.get("event")
    
    logger.info(f"Odoo Webhook [{event_type}] received for tenant {tenant_id}")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        if event_type == "partner.updated":
            partner_id = payload.get("partner_id")
            if not partner_id:
                raise HTTPException(status_code=400, detail="Missing partner_id")
            new_phone = payload.get("phone")
            cursor.execute("""
                UPDATE patients 
                SET phone = COALESCE(?, phone), last_odoo_sync = CURRENT_TIMESTAMP
                WHERE odoo_partner_id = ? AND tenant_id = ?
            """, (new_phone, str(partner_id), tenant_id))
            _log_sync(cursor, tenant_id, "Patient", str(partner_id), "webhook_update", "success")
            
        elif event_type in ["product.updated", "sale.created"]:
            # Trigger full pull asynchronously in the background
            from app.modules.integrations.odoo.service import OdooIntegrationService
            import asyncio
            service = OdooIntegrationService(tenant_id)
            if event_type == "product.updated":
                asyncio.create_task(service.pull_initial_inventory())
            else:
                asyncio.create_task(service.pull_historical_sales())
            
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Error processing Odoo webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

    return {"status": "success"}

@router.post("/webhook/{tenant_id}/inventory")
async def odoo_inventory_webhook(tenant_id: str):
    """Native webhook endpoint for Odoo product.template updates"""
    logger.info(f"Odoo Inventory Webhook received for tenant {tenant_id}")
    from app.modules.integrations.odoo.service import OdooIntegrationService
    import asyncio
    service = OdooIntegrationService(tenant_id)
    asyncio.create_task(service.pull_initial_inventory())
    return {"status": "success"}

@router.post("/webhook/{tenant_id}/sales")
async def odoo_sales_webhook(tenant_id: str):
    """Native webhook endpoint for Odoo sale.order updates"""
    logger.info(f"Odoo Sales Webhook received for tenant {tenant_id}")
    from app.modules.integrations.odoo.service import OdooIntegrationService
    import asyncio
    service = OdooIntegrationService(tenant_id)
    asyncio.create_task(service.pull_historical_sales())
    return {"status": "success"}

@router.post("/sync-all/{tenant_id}")
async def sync_all_from_odoo(tenant_id: str):
    """Triggers a full download of Inventory and Sales from Odoo."""
    from app.modules.integrations.odoo.service import OdooIntegrationService
    service = OdooIntegrationService(tenant_id)
    
    try:
        await service.pull_initial_inventory()
        await service.pull_historical_sales()
        return {"status": "success", "message": "Sincronización masiva completada con éxito"}
    except Exception as e:
        logger.error(f"Error in sync-all: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _log_sync(cursor, tenant_id: str, entity_type: str, entity_id: str, action: str, status: str, error_details: str = None):
    cursor.execute("""
        INSERT INTO integration_sync_logs 
        (id, tenant_id, entity_type, entity_id, action, status, error_details)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (str(uuid.uuid4()), tenant_id, entity_type, entity_id, action, status, error_details))
    cursor.connection.commit()
