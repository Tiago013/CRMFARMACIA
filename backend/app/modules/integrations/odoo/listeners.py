import logging
from app.core.events import event_bus
import sqlite3
from app.core.local_db import DB_PATH
from app.modules.integrations.odoo.service import OdooIntegrationService
import asyncio

logger = logging.getLogger("farmaai.integrations.odoo.listeners")

async def on_sale_completed_sync_odoo(topic: str, payload: dict):
    """
    Listens to sale.completed events from POS/Sales and pushes the Sale Order to Odoo.
    """
    sale_id = payload.get("sale_id")
    tenant_id = payload.get("tenant_id")
    
    logger.info(f"Odoo Integrations procesando venta asíncrona: {sale_id} para tenant {tenant_id}")
    
    try:
        # 1. Fetch sale details from local SQLite DB
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT s.id, s.patient_id, p.odoo_partner_id, s.created_at,
                   si.quantity, si.unit_price_at_sale, pr.sku
            FROM sales s
            LEFT JOIN patients p ON s.patient_id = p.id
            JOIN sale_items si ON si.sale_id = s.id
            JOIN products pr ON si.product_id = pr.id
            WHERE s.id = ?
        """, (sale_id,))
        
        rows = cursor.fetchall()
        conn.close()
        
        if not rows:
            logger.error(f"No se encontró la venta {sale_id} para sincronizar con Odoo.")
            return

        # Format date for Odoo: from '2026-05-23T01:31:36.220571' to '2026-05-23 01:31:36'
        raw_date = str(rows[0]["created_at"])
        formatted_date = raw_date.replace("T", " ").split(".")[0]
        
        sale_data = {
            "odoo_partner_id": int(rows[0]["odoo_partner_id"]) if rows[0]["odoo_partner_id"] else 1,
            "date_order": formatted_date,
            "items": []
        }
        
        for row in rows:
            sale_data["items"].append({
                "sku": row["sku"],
                "quantity": row["quantity"],
                "price": float(row["unit_price_at_sale"])
            })
            
        # 2. Push to Odoo
        service = OdooIntegrationService(tenant_id)
        await service.transport.authenticate()
        odoo_order_id, odoo_invoice_id = await service.push_sale_order(sale_data)
        logger.info(f"Venta {sale_id} sincronizada a Odoo exitosamente con ID: {odoo_order_id}, Invoice: {odoo_invoice_id}")
        
        if odoo_invoice_id:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("UPDATE sales SET odoo_invoice_id = ? WHERE id = ?", (odoo_invoice_id, sale_id))
            conn.commit()
            conn.close()
            
    except Exception as e:
        logger.error(f"Error sincronizando venta {sale_id} hacia Odoo: {e}")

def setup_odoo_listeners():
    event_bus.subscribe("sale.completed", on_sale_completed_sync_odoo)
    logger.info("Listeners de Integración Odoo configurados.")
