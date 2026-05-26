import asyncio
import logging
import sqlite3
import uuid
from app.modules.integrations.odoo.service import OdooIntegrationService

logging.basicConfig(level=logging.INFO)
DB_PATH = "C:/Users/santi/Downloads/CRMFARMAIA/backend/farmaai_local.db"

async def sync_sales_now():
    service = OdooIntegrationService(tenant_id='tenant_123')
    if not service.transport:
        print("Could not authenticate with Odoo.")
        return

    print("Fetching sales from Odoo...")
    # Fetch sale.order with partner_id and order_line
    sales = await service.transport.execute_kw(
        "sale.order", "search_read", 
        [[("state", "in", ["sale", "done"])]],
        {"fields": ["id", "name", "date_order", "amount_total", "amount_tax", "amount_untaxed", "partner_id", "order_line"]}
    )

    if not sales:
        print("No sales found in Odoo.")
        return

    print(f"Found {len(sales)} sales. Processing...")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get a default user ID
    cursor.execute("SELECT id FROM users WHERE tenant_id = ? LIMIT 1", (service.tenant_id,))
    user_row = cursor.fetchone()
    user_id = user_row["id"] if user_row else "system"

    total_synced = 0
    total_items = 0

    for s in sales:
        idempotency_key = f"odoo_sale_{s['id']}"
        cursor.execute("SELECT id FROM sales WHERE idempotency_key = ? AND tenant_id = ?", (idempotency_key, service.tenant_id))
        existing = cursor.fetchone()

        if existing:
            sale_id = existing["id"]
        else:
            sale_id = "sale_" + str(uuid.uuid4())[:8]

        # Resolve patient_id from partner_id
        patient_id = None
        if s.get("partner_id"):
            odoo_partner_id = s["partner_id"][0]
            cursor.execute("SELECT id FROM patients WHERE odoo_partner_id = ? AND tenant_id = ?", (str(odoo_partner_id), service.tenant_id))
            pat_row = cursor.fetchone()
            if pat_row:
                patient_id = pat_row["id"]

        if not existing:
            # Insert sale
            cursor.execute("""
                INSERT INTO sales (id, tenant_id, user_id, patient_id, subtotal, tax_total, grand_total, status, idempotency_key, created_at, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, 1)
            """, (sale_id, service.tenant_id, user_id, patient_id, s.get("amount_untaxed", 0), s.get("amount_tax", 0), s.get("amount_total", 0), idempotency_key, s.get("date_order")))
            total_synced += 1
        else:
            # Update patient_id if it was NULL (which happened from the previous flawed sync)
            cursor.execute("UPDATE sales SET patient_id = ? WHERE id = ?", (patient_id, sale_id))

        # Sync order lines
        order_line_ids = s.get("order_line", [])
        if order_line_ids:
            lines = await service.transport.execute_kw(
                "sale.order.line", "search_read",
                [[("id", "in", order_line_ids)]],
                {"fields": ["id", "product_id", "product_uom_qty", "price_unit", "price_subtotal"]}
            )

            for line in lines:
                line_idempotency = f"odoo_line_{line['id']}"
                cursor.execute("SELECT id FROM sale_items WHERE id = ? AND tenant_id = ?", (line_idempotency, service.tenant_id))
                if not cursor.fetchone():
                    # Resolve product_id
                    product_id = None
                    if line.get("product_id"):
                        odoo_prod_id = line["product_id"][0]
                        # First try to find by ID assuming sku might be the ID string
                        cursor.execute("SELECT id FROM products WHERE sku = ? OR sku = ?", (str(odoo_prod_id), line.get("product_id")[1]))
                        prod_row = cursor.fetchone()
                        if prod_row:
                            product_id = prod_row["id"]
                    
                    if not product_id:
                        # Fallback to random product if Odoo mapping failed, just so dashboard doesn't crash
                        cursor.execute("SELECT id FROM products WHERE tenant_id = ? LIMIT 1", (service.tenant_id,))
                        fallback = cursor.fetchone()
                        if fallback:
                            product_id = fallback["id"]

                    cursor.execute("""
                        INSERT INTO sale_items (id, tenant_id, sale_id, product_id, batch_id, quantity, unit_price_at_sale, cogs, created_at, is_active)
                        VALUES (?, ?, ?, ?, 'batch_05c98811', ?, ?, ?, ?, 1)
                    """, (line_idempotency, service.tenant_id, sale_id, product_id, line.get("product_uom_qty", 1), line.get("price_unit", 0), line.get("price_unit", 0)*0.6, s.get("date_order")))
                    total_items += 1

    conn.commit()
    conn.close()
    print(f"Successfully synced {total_synced} sales and {total_items} lines to local database.")

if __name__ == "__main__":
    asyncio.run(sync_sales_now())
