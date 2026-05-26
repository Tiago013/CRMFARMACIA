import httpx
import asyncio

async def test():
    client = httpx.AsyncClient()
    body = {
        'jsonrpc':'2.0',
        'method':'call',
        'params': {
            'service':'common',
            'method':'authenticate',
            'args':['farmaia1', 'admin', 'admin', {}]
        }
    }
    res = await client.post('https://farmaia1.odoo.com/jsonrpc', json=body)
    print(res.json())
    await client.aclose()

if __name__ == "__main__":
    asyncio.run(test())
