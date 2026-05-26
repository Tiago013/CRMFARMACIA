import asyncio
from app.modules.auth.routers import authenticate_with_odoo

async def test():
    res = await authenticate_with_odoo('admin@saludvital.com', 'admin', '211e3e3d-10bf-4092-8897-6290aa6dc17d')
    print("Odoo Auth Result:", res)

if __name__ == '__main__':
    asyncio.run(test())
