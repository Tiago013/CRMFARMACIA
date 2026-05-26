import sqlite3
import random
from datetime import datetime, timedelta
import asyncio
from app.modules.integrations.odoo.service import OdooIntegrationService

def spread_local_sales():
    conn = sqlite3.connect('c:/Users/santi/Downloads/CRMFARMAIA/backend/farmaai_local.db')
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM sales")
    sales = cursor.fetchall()
    
    now = datetime.now()
    
    print(f"Spreading {len(sales)} sales across the last 365 days...")
    
    for (sale_id,) in sales:
        # Random date in the last 365 days, with a slight bias towards recent days
        # We can use a triangular or beta distribution, but random.random() ** 1.5 biases towards 0 (recent)
        days_ago = int((random.random() ** 1.5) * 365)
        new_date = now - timedelta(days=days_ago, hours=random.randint(0, 23), minutes=random.randint(0,59))
        date_str = new_date.strftime("%Y-%m-%d %H:%M:%S")
        
        cursor.execute("UPDATE sales SET created_at = ? WHERE id = ?", (date_str, sale_id))
        cursor.execute("UPDATE sale_items SET created_at = ? WHERE sale_id = ?", (date_str, sale_id))
        
    conn.commit()
    conn.close()
    print("Local sales dates spread successfully.")

async def spread_odoo_sales():
    service = OdooIntegrationService('211e3e3d-10bf-4092-8897-6290aa6dc17d')
    print("Connecting to Odoo...")
    orders = await service.transport.execute_kw(
        'sale.order', 'search_read',
        [[]],
        {'fields': ['id']}
    )
    now = datetime.now()
    print(f"Spreading {len(orders)} Odoo sales...")
    for o in orders:
        days_ago = int((random.random() ** 1.5) * 365)
        new_date = now - timedelta(days=days_ago, hours=random.randint(0, 23), minutes=random.randint(0,59))
        date_str = new_date.strftime("%Y-%m-%d %H:%M:%S")
        try:
            await service.transport.execute_kw(
                'sale.order', 'write',
                [[o['id']], {'date_order': date_str}]
            )
        except Exception as e:
            pass # Ignore if some can't be modified due to state
    print("Odoo sales dates spread successfully.")

if __name__ == "__main__":
    spread_local_sales()
    asyncio.run(spread_odoo_sales())
