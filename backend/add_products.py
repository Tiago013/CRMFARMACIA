import asyncio
import sqlite3
import random
from loguru import logger

from app.modules.integrations.odoo.service import OdooIntegrationService
from app.core.local_db import DB_PATH

PHARMA_PRODUCTS = [
    ("Loratadina 10mg", "MED-004", 4.5, 1.5),
    ("Omeprazol 20mg", "MED-005", 6.0, 2.0),
    ("Azitromicina 500mg", "MED-006", 15.0, 7.0),
    ("Diclofenaco 50mg", "MED-007", 5.5, 2.5),
    ("Cetirizina 10mg", "MED-008", 4.0, 1.2),
    ("Losartan 50mg", "MED-009", 8.0, 3.5),
    ("Amlodipino 5mg", "MED-010", 7.5, 3.0),
    ("Metformina 850mg", "MED-011", 9.0, 4.0),
    ("Simvastatina 20mg", "MED-012", 11.0, 5.0),
    ("Aspirina 100mg", "MED-013", 3.0, 1.0),
    ("Vitamina C 1g", "MED-014", 6.5, 2.5),
    ("Ibuprofeno 600mg", "MED-015", 9.5, 4.0),
    ("Naproxeno 250mg", "MED-016", 7.0, 3.0),
    ("Clonazepam 2mg", "MED-017", 18.0, 8.0),
    ("Diazepam 10mg", "MED-018", 12.0, 5.5),
    ("Fluoxetina 20mg", "MED-019", 14.0, 6.0),
    ("Levotiroxina 100mcg", "MED-020", 10.0, 4.5),
    ("Pantoprazol 40mg", "MED-021", 13.0, 5.0),
    ("Tramadol 50mg", "MED-022", 16.0, 7.5),
    ("Salbutamol Inhalador", "MED-023", 22.0, 10.0),
    ("Amoxicilina + Ac. Clavulánico", "MED-024", 25.0, 12.0),
    ("Dexametasona 4mg", "MED-025", 5.0, 2.0),
    ("Ketorolaco 10mg", "MED-026", 8.5, 3.5),
    ("Meloxicam 15mg", "MED-027", 11.5, 5.5),
    ("Metoclopramida 10mg", "MED-028", 4.5, 1.8)
]

async def add_products():
    tenant_id = 'tenant_123'
    service = OdooIntegrationService(tenant_id)
    if not service.transport:
        logger.error("No Odoo integration found!")
        return
        
    await service.transport.authenticate()

    logger.info("Creating 25 new products in Odoo...")
    new_prods_data = []
    for name, code, price, cost in PHARMA_PRODUCTS:
        new_prods_data.append({
            "name": name, 
            "default_code": code, 
            "type": "consu", 
            "is_storable": True, 
            "list_price": price, 
            "standard_price": cost
        })
    
    # Find internal location for stock
    loc_res = await service.transport.execute_kw("stock.location", "search", [[("usage", "=", "internal")]], {"limit": 1})
    location_id = loc_res[0] if loc_res else 8 # Fallback
    
    for pd in new_prods_data:
        prod_tmpl_id = await service.transport.execute_kw("product.template", "create", [pd])
        logger.info(f"Created {pd['name']} in Odoo with Template ID {prod_tmpl_id}")
        
        # Add random stock between 10 and 250
        random_qty = random.randint(10, 250)
        
        search_res = await service.transport.execute_kw(
            "product.product", "search_read",
            [[("default_code", "=", pd["default_code"])]],
            {"fields": ["id"], "limit": 1}
        )
        if search_res:
            product_id = search_res[0]["id"]
            quant_id = await service.transport.execute_kw(
                "stock.quant", "create",
                [{"product_id": product_id, "location_id": location_id, "inventory_quantity": random_qty}]
            )
            await service.transport.execute_kw("stock.quant", "action_apply_inventory", [[quant_id]])
            logger.info(f"Added {random_qty} stock to {pd['name']}")

    # Pull inventory from Odoo to local DB
    logger.info("Pulling inventory from Odoo to local DB...")
    await service.pull_initial_inventory()
    
    logger.info("DONE!")
    await service.transport.close()

if __name__ == "__main__":
    asyncio.run(add_products())
