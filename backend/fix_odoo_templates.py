import httpx
import asyncio

async def fix():
    client = httpx.AsyncClient()
    url = 'https://farmaia1.odoo.com'
    db = 'farmaia1'
    uid = 2
    password = '8d44e28e0f89aabd33f1d0e04e3afd4863ded8bd'
    
    # 1. Fetch templates
    body = {
        'jsonrpc': '2.0',
        'method': 'call',
        'params': {
            'service': 'object',
            'method': 'execute_kw',
            'args': [db, uid, password, 'whatsapp.template', 'search_read', [[]], {'fields': ['id', 'name', 'body', 'model']}]
        }
    }
    res = await client.post(f'{url}/jsonrpc', json=body)
    templates = res.json().get('result', [])
    print('Templates found:', len(templates))
    
    # 2. Fix template bodies
    for t in templates:
        body_text = t.get('body', '')
        model = t.get('model', '')
        changed = False
        
        if model == 'account.move' and 'amount' in body_text and 'amount_total' not in body_text:
            body_text = body_text.replace('object.amount', 'object.amount_total')
            changed = True
            
        if changed:
            print("Fixing template ID", t['id'], "new body:", body_text)
            update_body = {
                'jsonrpc': '2.0',
                'method': 'call',
                'params': {
                    'service': 'object',
                    'method': 'execute_kw',
                    'args': [db, uid, password, 'whatsapp.template', 'write', [[t['id']], {'body': body_text}]]
                }
            }
            res_upd = await client.post(f'{url}/jsonrpc', json=update_body)
            print('Update result:', res_upd.json())

asyncio.run(fix())
