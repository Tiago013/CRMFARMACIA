import sqlite3
import xmlrpc.client
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

DB_PATH = "C:/Users/santi/Downloads/CRMFARMAIA/backend/farmaai_local.db"

def get_odoo_creds():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT odoo_url, odoo_db, odoo_username, odoo_password FROM odoo_config LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def wipe_sales():
    creds = get_odoo_creds()
    if not creds:
        logging.error("No Odoo credentials found in local DB.")
        return

    url = creds["odoo_url"]
    db = creds["odoo_db"]
    username = creds["odoo_username"]
    password = creds["odoo_password"]

    logging.info(f"Connecting to Odoo at {url}...")
    try:
        common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
        uid = common.authenticate(db, username, password, {})
        if not uid:
            logging.error("Odoo authentication failed.")
            return

        models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')
        
        # 1. Fetch all sale orders
        logging.info("Fetching sale orders from Odoo...")
        sale_ids = models.execute_kw(db, uid, password, 'sale.order', 'search', [[]])
        
        if sale_ids:
            logging.info(f"Found {len(sale_ids)} sale orders in Odoo. Canceling...")
            # Cancel them first (cannot delete confirmed sales)
            try:
                models.execute_kw(db, uid, password, 'sale.order', 'action_cancel', [sale_ids])
            except Exception as e:
                logging.warning(f"Error canceling some sales (they might already be canceled or draft): {e}")

            logging.info("Deleting sale orders from Odoo...")
            models.execute_kw(db, uid, password, 'sale.order', 'unlink', [sale_ids])
            logging.info(f"Successfully deleted {len(sale_ids)} sales from Odoo.")
        else:
            logging.info("No sale orders found in Odoo.")

        # 2. Delete local sales
        logging.info("Wiping local sales from farmaai_local.db...")
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sale_items")
        cursor.execute("DELETE FROM sales")
        conn.commit()
        conn.close()
        logging.info("Local sales and sale_items tables wiped successfully.")
        
    except Exception as e:
        logging.error(f"Failed to wipe sales: {e}")

if __name__ == "__main__":
    wipe_sales()
