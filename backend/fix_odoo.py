import asyncio
from app.modules.integrations.odoo.service import OdooIntegrationService

async def fix_odoo():
    print('Starting Odoo Fix Script...')
    service = OdooIntegrationService('tenant_123')
    
    if not service.transport:
        import sqlite3
        from app.core.local_db import DB_PATH
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT tenant_id FROM integration_configs WHERE provider = 'odoo'")
        row = cursor.fetchone()
        conn.close()
        if row:
            print(f'Found tenant: {row[0]}')
            service = OdooIntegrationService(row[0])
            
    if not service.transport:
        print('No Odoo integration config found!')
        return
        
    await service.transport.authenticate()
    print('Authenticated with Odoo.')
    
    # Fetch all products
    products = await service.transport.execute_kw(
        'product.template', 'search_read', 
        [[('sale_ok', '=', True)]],
        {'fields': ['id', 'name', 'list_price', 'standard_price']}
    )
    
    print(f'Found {len(products)} products in Odoo.')
    
    count = 0
    for p in products:
        if p.get('list_price', 0) > 10000000:  # If list price is over 10 million
            new_list = p.get('list_price', 0) / 1000.0
            new_standard = p.get('standard_price', 0) / 1000.0
            print(f"Fixing {p['name']} from {p.get('list_price')} to {new_list}")
            
            await service.transport.execute_kw(
                'product.template', 'write',
                [[p['id']], {'list_price': new_list, 'standard_price': new_standard}]
            )
            count += 1
            
    print(f'Fixed {count} products in Odoo successfully!')

asyncio.run(fix_odoo())
