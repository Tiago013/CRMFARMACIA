import httpx
import asyncio

async def show_vars():
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
            'args': [db, uid, password, 'whatsapp.template.variable', 'search_read', [[('wa_template_id', '=', 4)]], {'fields': ['id', 'name', 'field_name', 'field_type']}]
        }
    }
    res = await client.post(f'{url}/jsonrpc', json=body)
    for v in res.json().get('result', []):
        print(v)

asyncio.run(show_vars())
