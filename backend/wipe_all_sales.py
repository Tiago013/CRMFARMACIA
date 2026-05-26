import asyncio
import sqlite3
import logging
from app.modules.integrations.odoo.service import OdooIntegrationService

logging.basicConfig(level=logging.INFO)
DB_PATH = "C:/Users/santi/Downloads/CRMFARMAIA/backend/farmaai_local.db"

async def wipe_all_sales():
    print("Wiping local database sales...")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sale_items")
        cursor.execute("DELETE FROM sales")
        conn.commit()
        conn.close()
        print("Successfully deleted all local sales and sale_items.")
    except Exception as e:
        print(f"Error wiping local DB: {e}")

    print("Connecting to Odoo to cancel/delete sales...")
    try:
        service = OdooIntegrationService(tenant_id='tenant_123')
        if not service.transport:
            print("Could not authenticate with Odoo.")
            return

        # Find all sales in Odoo
        sales = await service.transport.execute_kw(
            "sale.order", "search", 
            [[]]
        )
        if not sales:
            print("No sales found in Odoo to delete.")
            return

        print(f"Found {len(sales)} sales in Odoo. Canceling...")
        # Cancel all sales so they can be deleted or at least ignored by sync
        try:
            await service.transport.execute_kw("sale.order", "action_cancel", [sales])
            print("Successfully canceled sales in Odoo.")
        except Exception as e:
            print(f"Error canceling sales (some might already be canceled or done): {e}")

        # Try to unlink (delete) them
        try:
            await service.transport.execute_kw("sale.order", "unlink", [sales])
            print("Successfully deleted sales from Odoo.")
        except Exception as e:
            print(f"Error deleting sales from Odoo (likely because some are confirmed and can't be deleted without proper cancellation): {e}")
            
    except Exception as e:
        print(f"Error connecting to Odoo: {e}")

if __name__ == "__main__":
    asyncio.run(wipe_all_sales())
