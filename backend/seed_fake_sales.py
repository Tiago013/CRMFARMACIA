import sqlite3
import random
import uuid
from datetime import datetime, timedelta

DB_PATH = "C:/Users/santi/Downloads/CRMFARMAIA/backend/farmaai_local.db"
TENANT_ID = "tenant_123"

def generate_random_date(days_ago_start, days_ago_end):
    now = datetime.utcnow()
    delta = timedelta(days=random.randint(days_ago_end, days_ago_start),
                      hours=random.randint(0, 23),
                      minutes=random.randint(0, 59))
    return (now - delta).isoformat() + "Z"

def seed_sales():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get products
    cursor.execute("SELECT id, unit_price, cost_price FROM products WHERE tenant_id = ?", (TENANT_ID,))
    products = cursor.fetchall()

    if not products:
        print("No products found! Cannot generate sales.")
        return

    # Get patients
    cursor.execute("SELECT id FROM patients WHERE tenant_id = ?", (TENANT_ID,))
    patients = cursor.fetchall()
    patient_ids = [p["id"] for p in patients] if patients else [None]

    # Create time buckets to distribute sales
    # 7 days, this month (30 days), this quarter (90 days), this year (365 days)
    buckets = [
        {"name": "last_7_days", "start": 0, "end": 7, "count": 15},
        {"name": "last_30_days", "start": 8, "end": 30, "count": 25},
        {"name": "last_90_days", "start": 31, "end": 90, "count": 40},
        {"name": "last_365_days", "start": 91, "end": 365, "count": 60},
    ]

    total_sales_created = 0
    total_items_created = 0

    for bucket in buckets:
        for _ in range(bucket["count"]):
            sale_id = f"sale_{uuid.uuid4().hex[:8]}"
            created_at = generate_random_date(bucket["end"], bucket["start"])
            
            # 1 to 5 items per sale
            num_items = random.randint(1, 5)
            sale_items = []
            
            subtotal = 0.0
            cogs_total = 0.0
            
            # Select random products
            selected_products = random.sample(products, min(num_items, len(products)))
            
            for prod in selected_products:
                qty = random.randint(1, 3)
                price = prod["unit_price"] or 10000.0
                cost = prod["cost_price"] or (price * 0.6)
                
                item_subtotal = qty * price
                item_cogs = qty * cost
                
                subtotal += item_subtotal
                cogs_total += item_cogs
                
                sale_items.append((
                    f"item_{uuid.uuid4().hex[:8]}",
                    TENANT_ID,
                    sale_id,
                    prod["id"],
                    "batch_05c98811",
                    qty,
                    price,
                    item_cogs,
                    created_at,
                    1
                ))
            
            tax_total = subtotal * 0.19 # 19% IVA (Colombian VAT)
            grand_total = subtotal + tax_total
            
            patient_id = random.choice(patient_ids)
            
            # Insert Sale
            cursor.execute("""
                INSERT INTO sales (id, tenant_id, user_id, patient_id, subtotal, tax_total, discount_total, grand_total, cogs_total, status, idempotency_key, method, created_at, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (sale_id, TENANT_ID, "08e4bd5d-1aae-4ec1-b001-5902dafc6785", patient_id, subtotal, tax_total, 0.0, grand_total, cogs_total, 'completed', f"fake_{sale_id}", 'card', created_at, 1))
            
            # Insert Sale Items
            cursor.executemany("""
                INSERT INTO sale_items (id, tenant_id, sale_id, product_id, batch_id, quantity, unit_price_at_sale, cogs, created_at, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, sale_items)
            
            total_sales_created += 1
            total_items_created += len(sale_items)

    conn.commit()
    conn.close()
    
    print(f"Successfully created {total_sales_created} fake sales with {total_items_created} items!")

if __name__ == "__main__":
    seed_sales()
