from loguru import logger
from app.modules.integrations.odoo.service import OdooIntegrationService
import sqlite3
from app.core.local_db import DB_PATH

async def sync_patient_to_odoo(ctx, tenant_id: str, patient_id: str):
    """
    Arq background job to synchronize a patient to Odoo.
    This runs outside the FastAPI request-response cycle.
    """
    logger.info(f"Worker received sync_patient_to_odoo: tenant={tenant_id}, patient={patient_id}")
    
    try:
        service = OdooIntegrationService(tenant_id)
        await service.sync_patient(patient_id)
        logger.info(f"Worker successfully processed sync_patient_to_odoo for {patient_id}")
    except Exception as e:
        logger.error(f"Worker failed sync_patient_to_odoo for {patient_id}: {str(e)}")
        # Arq will automatically retry based on worker settings if we raise the exception
        raise

async def archive_patient_in_odoo(ctx, tenant_id: str, odoo_partner_id: int):
    """
    Arq background job to archive a patient in Odoo.
    """
    logger.info(f"Worker received archive_patient_in_odoo: tenant={tenant_id}, odoo_partner_id={odoo_partner_id}")
    
    try:
        service = OdooIntegrationService(tenant_id)
        await service.archive_patient(odoo_partner_id)
        logger.info(f"Worker successfully processed archive_patient_in_odoo for {odoo_partner_id}")
    except Exception as e:
        logger.error(f"Worker failed archive_patient_in_odoo for {odoo_partner_id}: {str(e)}")
        raise

async def cron_pull_sales_from_odoo(ctx):
    """
    Arq Cron job to periodically pull historical/new sales from Odoo for all active integrations.
    """
    logger.info("Cron: Starting periodic pull of sales from Odoo.")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT tenant_id FROM integration_configs WHERE provider = 'odoo' AND is_active = 1")
    tenants = cursor.fetchall()
    conn.close()
    
    for row in tenants:
        tenant_id = row[0]
        try:
            service = OdooIntegrationService(tenant_id)
            await service.pull_historical_sales()
            logger.info(f"Cron: Successfully pulled sales for tenant {tenant_id}")
        except Exception as e:
            logger.error(f"Cron: Failed to pull sales for tenant {tenant_id}: {str(e)}")

async def cron_pull_inventory_from_odoo(ctx):
    """
    Arq Cron job to periodically pull inventory/products from Odoo for all active integrations.
    """
    logger.info("Cron: Starting periodic pull of inventory from Odoo.")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT tenant_id FROM integration_configs WHERE provider = 'odoo' AND is_active = 1")
    tenants = cursor.fetchall()
    conn.close()
    
    for row in tenants:
        tenant_id = row[0]
        try:
            service = OdooIntegrationService(tenant_id)
            await service.pull_initial_inventory()
            logger.info(f"Cron: Successfully pulled inventory for tenant {tenant_id}")
        except Exception as e:
            logger.error(f"Cron: Failed to pull inventory for tenant {tenant_id}: {str(e)}")
