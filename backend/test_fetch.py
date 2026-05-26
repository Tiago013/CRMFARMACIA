import asyncio
import sqlite3
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.modules.integrations.odoo.transport import JsonRpcTransport
from app.core.local_db import DB_PATH
from app.core.security import decrypt_api_key

async def test_fetch():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT url, db_name, username, encrypted_api_key FROM integration_configs WHERE tenant_id='tenant_123' AND provider='odoo'")
    config = cursor.fetchone()
    
    api_key = decrypt_api_key(config[3])
    transport = JsonRpcTransport(config[0], config[1], config[2], api_key)
    
    try:
        # Fetch some products
        print("Fetching products...")
        products = await transport.execute_kw(
            "product.template", "search_read", 
            [[]],
            {"fields": ["id", "name", "list_price", "standard_price", "default_code", "barcode", "qty_available"], "limit": 5}
        )
        for p in products:
            print(p)
            
        # Fetch some sales
        print("\nFetching sales...")
        sales = await transport.execute_kw(
            "sale.order", "search_read", 
            [[]],
            {"fields": ["id", "name", "date_order", "partner_id", "amount_total", "amount_tax", "amount_untaxed", "state"], "limit": 5}
        )
        for s in sales:
            print(s)
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await transport.close()

if __name__ == "__main__":
    asyncio.run(test_fetch())
