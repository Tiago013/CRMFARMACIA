import asyncio
import logging
import random
from datetime import datetime, timedelta
from app.modules.integrations.odoo.service import OdooIntegrationService

logging.basicConfig(level=logging.INFO)

def generate_random_date(days_ago_start, days_ago_end):
    now = datetime.utcnow()
    delta = timedelta(days=random.randint(days_ago_end, days_ago_start),
                      hours=random.randint(0, 23),
                      minutes=random.randint(0, 59))
    return (now - delta).strftime('%Y-%m-%d %H:%M:%S')

async def seed_odoo_sales():
    service = OdooIntegrationService(tenant_id='tenant_123')
    if not service.transport:
        print("Could not authenticate with Odoo.")
        return

    print("Fetching products from Odoo...")
    product_ids = await service.transport.execute_kw('product.product', 'search', [[('sale_ok', '=', True)]])
    if not product_ids:
        print("No products found in Odoo. Cannot create sales.")
        return

    print("Fetching customers from Odoo...")
    partner_ids = await service.transport.execute_kw('res.partner', 'search', [[('customer_rank', '>', 0)]])
    if not partner_ids:
        # Fallback to any partner
        partner_ids = await service.transport.execute_kw('res.partner', 'search', [[]])
        if not partner_ids:
            print("No customers found in Odoo.")
            return

    # Create time buckets
    buckets = [
        {"name": "last_7_days", "start": 0, "end": 7, "count": 15},
        {"name": "last_30_days", "start": 8, "end": 30, "count": 25},
        {"name": "last_90_days", "start": 31, "end": 90, "count": 40},
        {"name": "last_365_days", "start": 91, "end": 365, "count": 60},
    ]

    print("Creating sales in Odoo...")
    total_sales = 0
    for bucket in buckets:
        print(f"Creating {bucket['count']} sales for {bucket['name']}...")
        for _ in range(bucket["count"]):
            date_order = generate_random_date(bucket["end"], bucket["start"])
            partner_id = random.choice(partner_ids)
            
            # Create sale.order
            order_data = {
                'partner_id': partner_id,
                'date_order': date_order,
            }
            
            try:
                order_id = await service.transport.execute_kw('sale.order', 'create', [order_data])
                
                # Add order lines
                num_items = random.randint(1, 5)
                selected_products = random.sample(product_ids, min(num_items, len(product_ids)))
                
                for prod_id in selected_products:
                    qty = random.randint(1, 3)
                    line_data = {
                        'order_id': order_id,
                        'product_id': prod_id,
                        'product_uom_qty': qty,
                    }
                    await service.transport.execute_kw('sale.order.line', 'create', [line_data])
                
                # Confirm the order (Odoo requires action_confirm to move from draft to sale)
                # Sometimes creating with state='sale' doesn't trigger all computations, so it's better to create draft and confirm
                # Actually, date_order might be overridden to NOW upon confirm in newer Odoo versions. 
                # Let's see if we can override date_order after confirm, or if we can force it.
                await service.transport.execute_kw('sale.order', 'action_confirm', [[order_id]])
                
                # Force the date_order back to our historical date because action_confirm sets it to NOW
                await service.transport.execute_kw('sale.order', 'write', [[order_id], {'date_order': date_order}])
                
                total_sales += 1
            except Exception as e:
                print(f"Error creating order: {e}")

    print(f"Successfully created {total_sales} sales in Odoo!")

if __name__ == "__main__":
    asyncio.run(seed_odoo_sales())
