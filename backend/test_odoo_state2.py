import asyncio
import pprint
from app.modules.integrations.odoo.service import OdooIntegrationService

async def test():
    s = OdooIntegrationService('211e3e3d-10bf-4092-8897-6290aa6dc17d')
    await s.transport.authenticate()
    order = await s.transport.execute_kw('sale.order', 'search_read', [[('name', '=', 'S00152')]], {'fields':['picking_ids', 'state', 'delivery_status']})
    print("Order:", order)
    if order and order[0]['picking_ids']:
        picking = await s.transport.execute_kw('stock.picking', 'read', [order[0]['picking_ids']], {'fields':['state', 'move_ids', 'move_line_ids']})
        print("Picking:", picking)
        if picking and picking[0]['move_ids']:
            moves = await s.transport.execute_kw('stock.move', 'read', [picking[0]['move_ids']], {'fields':['product_id', 'product_uom_qty', 'quantity', 'state']})
            print("Moves:")
            pprint.pprint(moves)
            
        if picking and picking[0].get('move_line_ids'):
            lines = await s.transport.execute_kw('stock.move.line', 'read', [picking[0]['move_line_ids']], {'fields':['product_id', 'quantity', 'qty_done', 'state']})
            print("Move Lines:")
            pprint.pprint(lines)
    await s.transport.close()

if __name__ == '__main__':
    asyncio.run(test())
