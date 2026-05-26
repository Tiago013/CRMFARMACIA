import httpx
import asyncio

async def show():
    client = httpx.AsyncClient()
    url = 'https://farmaia1.odoo.com'
    db = 'farmaia1'
    uid = 2
    password = '8d44e28e0f89aabd33f1d0e04e3afd4863ded8bd'
    
    body = {
        'jsonrpc': '2.0',
        'method': 'call',
        'params': {
            'service': 'object',
            'method': 'execute_kw',
            'args': [db, uid, password, 'whatsapp.template', 'search_read', [[('model', '=', 'account.move')]], {'fields': ['id', 'name', 'body']}]
        }
    }
    res = await client.post(f'{url}/jsonrpc', json=body)
    for t in res.json().get('result', []):
        print(t)

asyncio.run(show())
