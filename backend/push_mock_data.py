import asyncio
import sqlite3
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.modules.integrations.odoo.transport import JsonRpcTransport
from app.core.local_db import DB_PATH
from app.core.security import decrypt_api_key

async def push_products():
    print("Conectando a FarmaAI Local...")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT url, db_name, username, encrypted_api_key FROM integration_configs WHERE tenant_id='tenant_123' AND provider='odoo'")
    config = cursor.fetchone()
    
    api_key = decrypt_api_key(config[3])
    transport = JsonRpcTransport(config[0], config[1], config[2], api_key)
    
    # Obtener productos que no se llamen "Administracion", etc (los que ya esten en Odoo)
    cursor.execute("SELECT brand_name, sku, unit_price, cost_price, barcode FROM products WHERE brand_name NOT IN ('Administracion', 'Communication', 'Expenses', 'Gifts', 'Imprevistos')")
    products = cursor.fetchall()
    
    print(f"Subiendo {len(products)} medicamentos de prueba a Odoo...")
    
    try:
        for p in products:
            # Create product.template in Odoo
            product_data = {
                "name": p["brand_name"],
                "default_code": p["sku"],
                "list_price": float(p["unit_price"]) if p["unit_price"] else 0.0,
                "standard_price": float(p["cost_price"]) if p["cost_price"] else 0.0,
            }
                
            odoo_id = await transport.execute_kw(
                "product.template", "create", 
                [product_data]
            )
            print(f"Subido: {p['brand_name']} (Odoo ID: {odoo_id})")
            
        print("¡Todos los medicamentos fueron subidos con éxito a Odoo!")
    except Exception as e:
        print(f"Error subiendo productos: {e}")
    finally:
        await transport.close()
        conn.close()

if __name__ == "__main__":
    asyncio.run(push_products())
