import httpx
import asyncio

async def test():
    client = httpx.AsyncClient()
    url = 'https://farmaia1.odoo.com'
    db = 'farmaia1'
    uid = 2
    password = 'admin'
    
    # Check whatsapp.template
    body = {
        'jsonrpc': '2.0',
        'method': 'call',
        'params': {
            'service': 'object',
            'method': 'execute_kw',
            'args': [db, uid, password, 'whatsapp.template', 'search_read', [[]], {'fields': ['name', 'state', 'model_id']}]
        }
    }
    res = await client.post(f'{url}/jsonrpc', json=body)
    print("Templates:", res.json())

    # Check whatsapp.message
    body2 = {
        'jsonrpc': '2.0',
        'method': 'call',
        'params': {
            'service': 'object',
            'method': 'execute_kw',
            'args': [db, uid, password, 'whatsapp.message', 'search_read', [[], 0, 5], {}]
        }
    }
    res2 = await client.post(f'{url}/jsonrpc', json=body2)
    print("\nMessages:", res2.json())

asyncio.run(test())
