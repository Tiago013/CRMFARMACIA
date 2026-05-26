import asyncio
import sqlite3
import uuid
from loguru import logger

from app.modules.integrations.odoo.service import OdooIntegrationService
from app.core.local_db import DB_PATH

async def reset_inventory():
    tenant_id = 'tenant_123'
    service = OdooIntegrationService(tenant_id)
    if not service.transport:
        logger.error("No Odoo integration found!")
        return
        
    await service.transport.authenticate()

    # 5. CLEAR LOCAL SQLITE DB
    logger.info("Clearing local SQLite DB...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM batches")
    cursor.execute("DELETE FROM products")
    conn.commit()
    conn.close()

    # 6. PULL INVENTORY
    logger.info("Pulling inventory from Odoo to local DB...")
    await service.pull_initial_inventory()
    
    logger.info("DONE!")
    await service.transport.close()

if __name__ == "__main__":
    asyncio.run(reset_inventory())
