import httpx
import asyncio

async def test():
    client = httpx.AsyncClient()
    
    # Authenticate
    auth_body = {
        'jsonrpc':'2.0',
        'method':'call',
        'params': {
            'service':'common',
            'method':'authenticate',
            'args':['farmaia1', 'admin@saludvital.com', 'admin', {}]
        }
    }
    res = await client.post('https://farmaia1.odoo.com/jsonrpc', json=auth_body)
    uid = res.json().get('result')
    print("UID:", uid)
    
    if uid:
        # Fetch res.users
        read_body = {
            'jsonrpc':'2.0',
            'method':'call',
            'params': {
                'service':'object',
                'method':'execute_kw',
                'args':['farmaia1', uid, 'admin', 'res.users', 'read', [[uid]], {'fields':['name', 'groups_id']}]
            }
        }
        res2 = await client.post('https://farmaia1.odoo.com/jsonrpc', json=read_body)
        print("User details:", res2.json())
        
        # We also need to map groups. We can fetch group names!
        groups_ids = res2.json().get('result')[0]['groups_id']
        read_groups = {
            'jsonrpc':'2.0',
            'method':'call',
            'params': {
                'service':'object',
                'method':'execute_kw',
                'args':['farmaia1', uid, 'admin', 'res.groups', 'read', [groups_ids], {'fields':['name', 'full_name']}]
            }
        }
        res3 = await client.post('https://farmaia1.odoo.com/jsonrpc', json=read_groups)
        print("Groups:", [g['full_name'] for g in res3.json().get('result', [])])
        
    await client.aclose()

if __name__ == "__main__":
    asyncio.run(test())
