from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.modules.procurement.schemas import PurchaseOrderRequest, ReceiveGoodsRequest
from app.core.local_db import query_all, query_one
from app.core.middleware import get_current_tenant_id, get_current_branch_id
from app.modules.inventory.services import InventoryService
from app.modules.inventory.schemas import StockMovementCreate
import uuid
import datetime
import random

router = APIRouter(prefix="/procurement", tags=["Procurement & Supply Chain"])

@router.post("/orders")
async def create_purchase_order(
    po_req: PurchaseOrderRequest,
    db: AsyncSession = Depends(get_db)
):
    """Crea una Orden de Compra (Purchase Order)."""
    tenant_id = get_current_tenant_id() or str(uuid.uuid4()) # Fallback for dummy middleware
    po_id = f"PO-{uuid.uuid4().hex[:6].upper()}"
    
    # 1. Insert Purchase Order (using raw SQL because we don't have SQLAlchemy models mapped for these yet)
    # We will use the SQLite connection directly for simplicity as per the current architecture pattern
    import sqlite3
    from app.core.local_db import DB_PATH
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO purchase_orders (id, tenant_id, supplier_id, status, expected_delivery, created_at)
            VALUES (?, ?, ?, 'Pending', ?, ?)
        ''', (po_id, tenant_id, po_req.supplier_id, po_req.expected_delivery, datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
        
        for item in po_req.items:
            poi_id = str(uuid.uuid4())
            # Fetch product details
            cursor.execute("SELECT brand_name FROM products WHERE id = ?", (item.product_id,))
            prod = cursor.fetchone()
            product_name = prod[0] if prod else "Producto Desconocido"
            
            cursor.execute('''
                INSERT INTO purchase_order_items (id, purchase_order_id, product_sku, product_name, quantity_ordered, quantity_received, unit_cost, total_cost)
                VALUES (?, ?, ?, ?, ?, 0, ?, ?)
            ''', (poi_id, po_id, item.product_id, product_name, item.quantity_ordered, item.unit_cost, item.quantity_ordered * item.unit_cost))
            
        conn.commit()
        
        # Odoo Integration: Push PO to Odoo
        import asyncio
        from app.modules.integrations.odoo.service import OdooIntegrationService
        service = OdooIntegrationService(tenant_id)
        
        async def push_po_to_odoo():
            try:
                await service.transport.authenticate()
                
                # Fetch supplier odoo_partner_id (if we had it, fallback to 1)
                conn2 = sqlite3.connect(DB_PATH)
                c2 = conn2.cursor()
                c2.execute("SELECT name FROM suppliers WHERE id = ?", (po_req.supplier_id,))
                # Assuming generic supplier ID 1 for now if we don't map suppliers
                supplier_odoo_id = 1 
                conn2.close()
                
                po_data = {
                    "supplier_id": supplier_odoo_id,
                    "expected_delivery": po_req.expected_delivery,
                    "items": [{"sku": item.product_id, "quantity": item.quantity_ordered, "price": item.unit_cost} for item in po_req.items]
                }
                odoo_po_id = await service.push_purchase_order_bulk(po_data)
                
                if odoo_po_id:
                    conn3 = sqlite3.connect(DB_PATH)
                    c3 = conn3.cursor()
                    c3.execute("UPDATE purchase_orders SET odoo_po_id = ? WHERE id = ?", (odoo_po_id, po_id))
                    conn3.commit()
                    conn3.close()
            except Exception as e:
                import logging
                logging.error(f"Failed to push PO to Odoo: {e}")
                
        asyncio.create_task(push_po_to_odoo())
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

    return {"status": "created", "po_id": po_id, "expected_delivery": po_req.expected_delivery}

@router.get("/orders")
async def list_purchase_orders():
    """Lista órdenes de compra REALES desde la base de datos SQLite."""
    orders = query_all("""
        SELECT po.id, po.status, po.created_at, po.expected_delivery, po.invoice_number,
               s.name as supplier_name
        FROM purchase_orders po
        JOIN suppliers s ON po.supplier_id = s.id
        ORDER BY po.created_at DESC
    """)
    
    # Attach items to each order
    for order in orders:
        items = query_all("""
            SELECT product_sku, product_name, quantity_ordered, quantity_received, unit_cost, total_cost
            FROM purchase_order_items WHERE purchase_order_id = ?
        """, (order["id"],))
        order["items"] = items
    
    return orders

@router.post("/receive")
async def receive_goods(
    receive_req: ReceiveGoodsRequest,
    db: AsyncSession = Depends(get_db)
):
    """Registra la entrada de mercancía."""
    import sqlite3
    from app.core.local_db import DB_PATH
    tenant_id = get_current_tenant_id() or str(uuid.uuid4())
    branch_id = None
    user_id = uuid.uuid4() # Mock user

    inventory_service = InventoryService(db)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        # Check PO
        cursor.execute("SELECT id FROM purchase_orders WHERE id = ?", (receive_req.po_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Orden de compra no encontrada")
            
        # Update PO Status and invoice
        cursor.execute("UPDATE purchase_orders SET status = 'Received', invoice_number = ? WHERE id = ?", 
                      (receive_req.invoice_number, receive_req.po_id))
                      
        odoo_received_items = []
                      
        for item in receive_req.received_items:
            # Update PO item received qty
            cursor.execute("UPDATE purchase_order_items SET quantity_received = quantity_received + ? WHERE purchase_order_id = ? AND product_sku = ?",
                          (item.quantity_received, receive_req.po_id, item.product_id))
            
            # Create a new Batch in SQLite
            batch_id = str(uuid.uuid4())
            batch_number = f"LOT-{datetime.datetime.now().strftime('%m%y')}-{random.randint(100,999)}"
            # Expiration date: 2 years from now for B2B supplies
            exp_date = (datetime.datetime.now() + datetime.timedelta(days=730)).strftime("%Y-%m-%d")
            
            cursor.execute("SELECT sku FROM products WHERE id = ?", (item.product_id,))
            p_row = cursor.fetchone()
            if p_row:
                odoo_received_items.append({
                    "sku": p_row[0],
                    "quantity": item.quantity_received,
                    "batch_number": batch_number,
                    "expiration_date": exp_date
                })
            
            cursor.execute('''
                INSERT INTO batches (id, tenant_id, product_id, batch_number, expiration_date, quantity, initial_qty)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (batch_id, tenant_id, item.product_id, batch_number, exp_date, item.quantity_received, item.quantity_received))
            
            # Record StockMovement via InventoryService
            movement = StockMovementCreate(
                product_id=uuid.UUID(item.product_id),
                batch_id=uuid.UUID(batch_id),
                movement_type="RESTOCK",
                quantity=item.quantity_received,
                reference_id=receive_req.po_id
            )
            await inventory_service.register_movement(movement, user_id)
            
        conn.commit()
        
        # Odoo Integration: Validate Receipt
        cursor.execute("SELECT odoo_po_id FROM purchase_orders WHERE id = ?", (receive_req.po_id,))
        po_row = cursor.fetchone()
        odoo_po_id = po_row[0] if po_row else None
        
        if odoo_po_id:
            import asyncio
            from app.modules.integrations.odoo.service import OdooIntegrationService
            service = OdooIntegrationService(tenant_id)
            
            async def receive_in_odoo():
                try:
                    await service.transport.authenticate()
                    await service.receive_purchase_order(odoo_po_id, received_items=odoo_received_items)
                except Exception as e:
                    import logging
                    logging.error(f"Failed to receive PO in Odoo: {e}")
                    
            asyncio.create_task(receive_in_odoo())
            
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
        
    return {
        "status": "success",
        "message": f"Mercancía recibida para la orden {receive_req.po_id}",
        "invoice_linked": receive_req.invoice_number
    }
