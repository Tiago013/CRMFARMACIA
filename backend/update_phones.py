import httpx
import asyncio

async def update_contacts():
    client = httpx.AsyncClient()
    url = 'https://farmaia1.odoo.com'
    db = 'farmaia1'
    uid = 2
    password = '8d44e28e0f89aabd33f1d0e04e3afd4863ded8bd'
    
    phone = '+573052946912'
    
    # 1. Fetch all partners
    body = {
        'jsonrpc': '2.0',
        'method': 'call',
        'params': {
            'service': 'object',
            'method': 'execute_kw',
            'args': [db, uid, password, 'res.partner', 'search_read', [[]], {'fields': ['id', 'name']}]
        }
    }
    res = await client.post(f'{url}/jsonrpc', json=body)
    partners = res.json().get('result', [])
    print(f"Found {len(partners)} contacts in Odoo.")
    
    # 2. Update phone for all partners
    partner_ids = [p['id'] for p in partners]
    if partner_ids:
        update_body = {
            'jsonrpc': '2.0',
            'method': 'call',
            'params': {
                'service': 'object',
                'method': 'execute_kw',
                'args': [db, uid, password, 'res.partner', 'write', [partner_ids, {'phone': phone}]]
            }
        }
        res_upd = await client.post(f'{url}/jsonrpc', json=update_body)
        print("Update result:", res_upd.json())
        
asyncio.run(update_contacts())
