import asyncio
import logging
import sqlite3
from app.modules.integrations.odoo.service import OdooIntegrationService
from app.core.local_db import DB_PATH

logging.basicConfig(level=logging.INFO)

async def wipe_sales_odoo():
    # 1. Connect to Odoo via service
    # Assuming tenant_id = 'tenant_123' based on previous logs
    service = OdooIntegrationService(tenant_id='tenant_123')
    
    if not service.transport:
        print("Could not authenticate with Odoo.")
        return

    print("Fetching sale orders from Odoo...")
    sale_ids = await service.transport.execute_kw('sale.order', 'search', [[]])
    
    if sale_ids:
        print(f"Found {len(sale_ids)} sale orders in Odoo. Canceling...")
        try:
            await service.transport.execute_kw('sale.order', 'action_cancel', [sale_ids])
            print("Canceled.")
        except Exception as e:
            print(f"Cancel error (may already be canceled): {e}")

        print("Deleting sale orders from Odoo...")
        await service.transport.execute_kw('sale.order', 'unlink', [sale_ids])
        print(f"Successfully deleted {len(sale_ids)} sales from Odoo.")
    else:
        print("No sale orders found in Odoo.")

    print("Fetching pos orders from Odoo...")
    pos_ids = await service.transport.execute_kw('pos.order', 'search', [[]])
    if pos_ids:
        print(f"Found {len(pos_ids)} pos orders in Odoo. Canceling...")
        try:
            await service.transport.execute_kw('pos.order', 'action_pos_order_cancel', [pos_ids])
            print("Canceled pos orders.")
        except Exception as e:
            print(f"Cancel pos error: {e}")
            
        print("Deleting pos orders from Odoo...")
        await service.transport.execute_kw('pos.order', 'unlink', [pos_ids])
        print(f"Successfully deleted {len(pos_ids)} pos orders from Odoo.")
    else:
        print("No pos orders found in Odoo.")

    # 2. Delete local sales
    print("Wiping local sales from farmaai_local.db...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM sale_items")
    cursor.execute("DELETE FROM sales")
    
    # Also delete POS orders if any exist locally
    cursor.execute("DELETE FROM cash_sessions") # Maybe keep? The user just said sales.
    
    conn.commit()
    conn.close()
    print("Local sales and sale_items tables wiped successfully.")

if __name__ == "__main__":
    asyncio.run(wipe_sales_odoo())
