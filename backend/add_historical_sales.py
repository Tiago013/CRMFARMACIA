import asyncio
import sqlite3
import uuid
import random
from datetime import datetime, timedelta
from loguru import logger

from app.modules.integrations.odoo.service import OdooIntegrationService
from app.core.local_db import DB_PATH

async def add_historical_sales():
    tenant_id = 'tenant_123'

    # 1. Fetch patients and products
    logger.info("Fetching patients and products from SQLite...")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM patients")
    patients = cursor.fetchall()
    
    cursor.execute("SELECT id, sku, brand_name, unit_price FROM products LIMIT 25")
    products = cursor.fetchall()
    
    if not patients or not products:
        logger.error("Missing patients or products locally!")
        return

    logger.info(f"Generating historical sales for {len(patients)} patients over 12 months...")
    
    now = datetime.now()
    total_sales_created = 0
    
    for patient in patients:
        pid = patient["id"]
        odoo_partner_id = int(patient["odoo_partner_id"]) if patient["odoo_partner_id"] else 1
        
        # Loop over past 12 months
        for i in range(12):
            target_date = now - timedelta(days=30 * i)
            # Create 1 to 3 sales per month for this patient
            num_sales = random.randint(1, 3)
            
            for _ in range(num_sales):
                # Randomize day and time within that month
                day_offset = random.randint(1, 28)
                sale_time = target_date.replace(day=day_offset, hour=random.randint(9, 18), minute=random.randint(0, 59))
                created_at_str = sale_time.isoformat()
                date_order_str = sale_time.strftime("%Y-%m-%d %H:%M:%S")
                
                sale_id = str(uuid.uuid4())
                total = 0.0
                num_items = random.randint(1, 4)
                items_to_buy = random.sample(products, num_items)
                
                sale_items_payload = []
                
                for prod in items_to_buy:
                    qty = random.randint(1, 3)
                    price = prod["unit_price"] or 5.0
                    total += qty * price
                    
                    cursor.execute("""
                        INSERT INTO sale_items (id, tenant_id, sale_id, product_id, batch_id, quantity, unit_price_at_sale)
                        VALUES (?, ?, ?, ?, 'batch_none', ?, ?)
                    """, (str(uuid.uuid4()), tenant_id, sale_id, prod["id"], qty, price))
                    
                    sale_items_payload.append({
                        "sku": prod["sku"],
                        "quantity": qty,
                        "price": price
                    })
                
                # Insert sale
                cursor.execute("""
                    INSERT INTO sales (id, tenant_id, user_id, patient_id, subtotal, grand_total, status, method, created_at)
                    VALUES (?, ?, 'user_123', ?, ?, ?, 'completed', 'tarjeta', ?)
                """, (sale_id, tenant_id, pid, total, total, created_at_str))
                
                # Update LTV
                cursor.execute("UPDATE patients SET ltv = ltv + ? WHERE id = ?", (total, pid))
                conn.commit()
                
                # Push to Odoo
                sale_data = {
                    "odoo_partner_id": odoo_partner_id,
                    "date_order": date_order_str,
                    "items": sale_items_payload
                }
                
                try:
                    s_sale = OdooIntegrationService(tenant_id)
                    await s_sale.transport.authenticate()
                    await s_sale.push_sale_order(sale_data)
                    total_sales_created += 1
                    logger.info(f"Pushed historical sale {sale_id} ({created_at_str[:10]}) for {patient['first_name']} to Odoo")
                    await s_sale.transport.close()
                except Exception as e:
                    logger.error(f"Failed to push historical sale to Odoo: {e}")

    logger.info(f"DONE! Created {total_sales_created} historical sales.")
    conn.close()

if __name__ == "__main__":
    asyncio.run(add_historical_sales())
