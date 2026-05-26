import asyncio
from app.modules.integrations.odoo.service import OdooIntegrationService

async def adjust_odoo_prices(multiplier=4000):
    service = OdooIntegrationService('211e3e3d-10bf-4092-8897-6290aa6dc17d')
    print("Connecting to Odoo...")
    
    # Update products
    print("Fetching products...")
    products = await service.transport.execute_kw(
        'product.template', 'search_read',
        [[]],
        {'fields': ['id', 'list_price', 'standard_price']}
    )
    for p in products:
        new_list_price = float(p.get('list_price', 0)) * multiplier
        new_standard_price = float(p.get('standard_price', 0)) * multiplier
        await service.transport.execute_kw(
            'product.template', 'write',
            [[p['id']], {'list_price': new_list_price, 'standard_price': new_standard_price}]
        )
    print(f"Updated {len(products)} products.")

    # Update sale order lines
    print("Fetching sale order lines...")
    sale_lines = await service.transport.execute_kw(
        'sale.order.line', 'search_read',
        [[]],
        {'fields': ['id', 'price_unit']}
    )
    for line in sale_lines:
        new_price = float(line.get('price_unit', 0)) * multiplier
        await service.transport.execute_kw(
            'sale.order.line', 'write',
            [[line['id']], {'price_unit': new_price}]
        )
    print(f"Updated {len(sale_lines)} sale lines.")
    
    # Update purchase order lines
    print("Fetching purchase order lines...")
    purchase_lines = await service.transport.execute_kw(
        'purchase.order.line', 'search_read',
        [[]],
        {'fields': ['id', 'price_unit']}
    )
    for line in purchase_lines:
        new_price = float(line.get('price_unit', 0)) * multiplier
        await service.transport.execute_kw(
            'purchase.order.line', 'write',
            [[line['id']], {'price_unit': new_price}]
        )
    print(f"Updated {len(purchase_lines)} purchase lines.")

if __name__ == "__main__":
    asyncio.run(adjust_odoo_prices())
