import asyncio
import pprint
from app.modules.integrations.odoo.service import OdooIntegrationService

async def test():
    s = OdooIntegrationService('211e3e3d-10bf-4092-8897-6290aa6dc17d')
    await s.transport.authenticate()
    
    # Pass skip_sms in context
    res = await s.transport.execute_kw('stock.picking', 'button_validate', [[148]], {'context': {'skip_sms': True}})
    print("button_validate returned:")
    pprint.pprint(res)
    
    picking = await s.transport.execute_kw('stock.picking', 'read', [[148]], {'fields':['state']})
    print("Picking state now:")
    pprint.pprint(picking)
    
    await s.transport.close()

if __name__ == '__main__':
    asyncio.run(test())
