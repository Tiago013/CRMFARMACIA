import asyncio
import pprint
from app.modules.integrations.odoo.service import OdooIntegrationService

async def test():
    s = OdooIntegrationService('211e3e3d-10bf-4092-8897-6290aa6dc17d')
    await s.transport.authenticate()
    res = await s.get_odoo_pnl()
    print("Odoo PNL:")
    pprint.pprint(res)
    await s.transport.close()

if __name__ == '__main__':
    asyncio.run(test())
