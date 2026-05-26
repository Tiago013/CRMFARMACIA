import asyncio
import sqlite3
import uuid
import random
from datetime import datetime, timedelta
from loguru import logger

from app.modules.integrations.odoo.service import OdooIntegrationService
from app.core.local_db import DB_PATH

PATIENTS = [
    {"first_name": "Juan", "last_name": "Pérez", "document_id": "12345678", "phone": "555-0001", "segment": "VIP"},
    {"first_name": "María", "last_name": "Gómez", "document_id": "87654321", "phone": "555-0002", "segment": "Regular"},
    {"first_name": "Carlos", "last_name": "López", "document_id": "45678912", "phone": "555-0003", "segment": "Churn Risk"},
    {"first_name": "Ana", "last_name": "Martínez", "document_id": "32165498", "phone": "555-0004", "segment": "VIP"},
    {"first_name": "Luisa", "last_name": "Fernández", "document_id": "98712365", "phone": "555-0005", "segment": "Regular"}
]

async def add_sales():
    tenant_id = 'tenant_123'
    service = OdooIntegrationService(tenant_id)
    if not service.transport:
        logger.error("No Odoo integration found!")
        return
        
    await service.transport.authenticate()

    # 1. Clear local tables
    logger.info("Clearing patients and sales in local SQLite...")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("DELETE FROM sale_items")
    cursor.execute("DELETE FROM sales")
    cursor.execute("DELETE FROM patients")
    conn.commit()

    # Fetch products to make sales
    cursor.execute("SELECT id, sku, brand_name, unit_price FROM products LIMIT 15")
    products = cursor.fetchall()
    if not products:
        logger.error("No products found locally! Cannot make sales.")
        return

    # 2. Insert new patients locally and sync to Odoo
    logger.info("Creating patients and syncing to Odoo...")
    patient_ids = []
    for pd in PATIENTS:
        pid = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO patients (id, tenant_id, first_name, last_name, document_id, phone, segment, ltv)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        """, (pid, tenant_id, pd["first_name"], pd["last_name"], pd["document_id"], pd["phone"], pd["segment"]))
        conn.commit()
        
        # Sync to Odoo
        s = OdooIntegrationService(tenant_id)
        await s.transport.authenticate()
        await s.sync_patient(pid)
        patient_ids.append(pid)

    # 3. Create sales and push to Odoo
    logger.info("Creating sales and syncing to Odoo...")
    
    for pid in patient_ids:
        # Get patient details and odoo_id
        cursor.execute("SELECT * FROM patients WHERE id = ?", (pid,))
        patient = cursor.fetchone()
        
        num_sales = random.randint(1, 3)
        for _ in range(num_sales):
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
            """, (sale_id, tenant_id, pid, total, total, datetime.now().isoformat()))
            conn.commit()
            
            # Update LTV
            cursor.execute("UPDATE patients SET ltv = ltv + ? WHERE id = ?", (total, pid))
            conn.commit()
            
            # Push to Odoo
            sale_data = {
                "odoo_partner_id": int(patient["odoo_partner_id"]) if patient["odoo_partner_id"] else 1,
                "items": sale_items_payload
            }
            try:
                s_sale = OdooIntegrationService(tenant_id)
                await s_sale.transport.authenticate()
                await s_sale.push_sale_order(sale_data)
                logger.info(f"Pushed sale {sale_id} for patient {patient['first_name']} to Odoo")
            except Exception as e:
                logger.error(f"Failed to push sale to Odoo: {e}")

    logger.info("DONE!")
    conn.close()
    await service.transport.close()

if __name__ == "__main__":
    asyncio.run(add_sales())
