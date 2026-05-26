from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.core.database import get_db
from app.core.local_db import query_all, query_one
from app.modules.inventory.schemas import ProductWithStockResponse, StockMovementCreate
from app.modules.auth.dependencies import require_role
import uuid

router = APIRouter(prefix="/inventory", tags=["inventory"], dependencies=[Depends(require_role(["admin", "regente"]))])

# Dummy dependency to simulate a logged-in user and get their ID
async def get_current_user_id() -> uuid.UUID:
    return uuid.uuid4() # In a real app, this extracts the user ID from the JWT

@router.get("/products")
async def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: str = Query("", description="Buscar por nombre, SKU o principio activo"),
):
    from app.core.middleware import get_current_branch_id, get_current_tenant_id
    branch_id = get_current_branch_id()
    tenant_id = get_current_tenant_id()
    branch_filter = ""
    
    # If we have a tenant_id, prepend it to params
    base_params = (tenant_id,) if tenant_id else ()
    where_tenant = "WHERE p.tenant_id = ?" if tenant_id else "WHERE 1=1"
    and_tenant = "AND p.tenant_id = ?" if tenant_id else ""
    
    if search:
        params = base_params + (f"%{search}%", f"%{search}%", f"%{search}%", f"%{search}%", limit, skip)
        rows = query_all(f"""
            SELECT p.id, p.sku, p.brand_name, p.active_ingredient, p.presentation,
                   p.unit_price, p.cost_price, p.min_stock, p.is_active,
                   COALESCE(b.quantity, 0) as total_stock,
                   b.batch_number, b.expiration_date,
                   c.name as category_name
            FROM products p
            LEFT JOIN batches b ON b.product_id = p.id {branch_filter}
            LEFT JOIN categories c ON p.category_id = c.id
            {where_tenant} AND (p.brand_name LIKE ? OR p.sku LIKE ? OR p.active_ingredient LIKE ? OR c.name LIKE ?)
            ORDER BY p.brand_name
            LIMIT ? OFFSET ?
        """, params)
    else:
        params = base_params + (limit, skip)
        rows = query_all(f"""
            SELECT p.id, p.sku, p.brand_name, p.active_ingredient, p.presentation,
                   p.unit_price, p.cost_price, p.min_stock, p.is_active,
                   COALESCE(b.quantity, 0) as total_stock,
                   b.batch_number, b.expiration_date,
                   c.name as category_name
            FROM products p
            LEFT JOIN batches b ON b.product_id = p.id {branch_filter}
            LEFT JOIN categories c ON p.category_id = c.id
            {where_tenant}
            ORDER BY p.brand_name
            LIMIT ? OFFSET ?
        """, params)

    return rows

@router.post("/products")
async def create_product(product: dict):
    from app.modules.integrations.odoo.service import OdooIntegrationService
    from app.core.local_db import get_sqlite
    from app.core.middleware import get_current_tenant_id
    import uuid
    
    tenant_id = get_current_tenant_id() or "tenant_123"
    service = OdooIntegrationService(tenant_id)
    
    odoo_data = {
        "name": product.get("brand_name"),
        "default_code": product.get("sku"),
        "list_price": float(product.get("unit_price", 0)),
        "standard_price": float(product.get("cost_price", 0)),
    }
    
    try:
        # 1. Create in Odoo
        odoo_id = await service.push_product_creation(odoo_data)
        
        # 2. Insert locally
        local_id = str(uuid.uuid4())
        with get_sqlite() as conn:
            conn.execute("""
                INSERT INTO products (id, tenant_id, sku, brand_name, unit_price, cost_price)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (local_id, tenant_id, product.get("sku"), product.get("brand_name"), 
                  float(product.get("unit_price", 0)), float(product.get("cost_price", 0))))
            conn.commit()
            
        return {"status": "success", "id": local_id, "odoo_id": odoo_id}
    except Exception as e:
        import traceback
        with open("error_product.txt", "w") as f:
            f.write(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/products/{product_id}")
async def update_product(product_id: str, product: dict):
    from app.modules.integrations.odoo.service import OdooIntegrationService
    from app.core.local_db import get_sqlite
    from app.core.middleware import get_current_tenant_id
    
    tenant_id = get_current_tenant_id() or "tenant_123"
    service = OdooIntegrationService(tenant_id)
    
    odoo_data = {
        "name": product.get("brand_name"),
        "list_price": float(product.get("unit_price", 0)),
        "standard_price": float(product.get("cost_price", 0)),
    }
    
    try:
        # 1. Update in Odoo using SKU
        await service.push_product_update(product.get("sku"), odoo_data)
        
        # 2. Update locally
        with get_sqlite() as conn:
            conn.execute("""
                UPDATE products 
                SET brand_name = ?, unit_price = ?, cost_price = ?
                WHERE (id = ? OR sku = ?) AND tenant_id = ?
            """, (product.get("brand_name"), float(product.get("unit_price", 0)), 
                  float(product.get("cost_price", 0)), product_id, product.get("sku"), tenant_id))
            conn.commit()
            
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    from app.core.local_db import get_sqlite
    from app.modules.integrations.odoo.service import OdooIntegrationService
    from app.core.middleware import get_current_tenant_id
    
    tenant_id = get_current_tenant_id() or "tenant_123"
    service = OdooIntegrationService(tenant_id)

    try:
        with get_sqlite() as conn:
            # Primero buscamos el SKU para archivarlo en Odoo
            cursor = conn.execute("SELECT sku FROM products WHERE id = ?", (product_id,))
            row = cursor.fetchone()
            sku = row[0] if row else None
            
            # Opción más segura: Eliminar físicamente si no tiene dependencias
            conn.execute("DELETE FROM products WHERE id = ? AND tenant_id = ?", (product_id, tenant_id))
            conn.commit()
            
        if sku:
            await service.push_product_archive(sku)
            
        return {"status": "success"}
    except Exception as e:
        # Si viola integridad referencial (tiene ventas/lotes atados), podríamos hacer un soft-delete
        try:
            with get_sqlite() as conn:
                conn.execute("UPDATE products SET is_active = 0 WHERE id = ? AND tenant_id = ?", (product_id, tenant_id))
                conn.commit()
            
            if sku:
                await service.push_product_archive(sku)
                
            return {"status": "success", "message": "Soft deleted"}
        except Exception as soft_e:
            raise HTTPException(status_code=500, detail=str(soft_e))


@router.get("/products/{product_id}")
async def get_product(product_id: str):
    from app.core.middleware import get_current_branch_id
    branch_id = get_current_branch_id()
    branch_filter = ""
    params = (product_id,)

    """Obtiene un producto específico con su stock y lote."""
    row = query_one(f"""
        SELECT p.*, b.quantity as total_stock, b.batch_number, b.expiration_date,
               c.name as category_name
        FROM products p
        LEFT JOIN batches b ON b.product_id = p.id {branch_filter}
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
    """, params)
    if not row:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return row

@router.get("/alerts")
async def get_inventory_alerts():
    from app.core.middleware import get_current_branch_id
    branch_id = get_current_branch_id()
    # branch_filter = "AND b.branch_id = ?" if branch_id else ""
    branch_filter = ""
    params = ()

    """
    Retorna alertas críticas de inventario:
    - Productos con stock bajo
    - Productos próximos a vencer
    """
    low_stock = query_all(f"""
        SELECT p.sku, p.brand_name, b.quantity as stock, p.min_stock
        FROM products p
        JOIN batches b ON b.product_id = p.id {branch_filter}
        WHERE b.quantity <= p.min_stock
        ORDER BY b.quantity ASC
    """, params)

    expiring_soon = query_all(f"""
        SELECT p.sku, p.brand_name, b.batch_number, b.expiration_date, b.quantity
        FROM products p
        JOIN batches b ON b.product_id = p.id {branch_filter}
        WHERE b.expiration_date < date('now', '+90 days')
        ORDER BY b.expiration_date ASC
    """, params)

    return {
        "low_stock": low_stock,
        "expiring_soon": expiring_soon
    }

@router.post("/movements", response_model=dict)
async def register_movement(
    movement: StockMovementCreate,
    db: AsyncSession = Depends(get_db),
    current_user_id: uuid.UUID = Depends(get_current_user_id)
):
    from app.modules.inventory.services import InventoryService
    service = InventoryService(db)
    new_movement = await service.register_movement(movement, current_user_id)
    return {"status": "success", "movement_id": str(new_movement.id)}

@router.post('/adjustments')
async def register_stock_adjustment(data: dict):
    product_id = data.get('product_id')
    new_quantity = data.get('new_quantity')
    if not product_id or new_quantity is None:
        raise HTTPException(status_code=400, detail='Missing data')
    try:
        from app.core.local_db import query_one, get_sqlite
        from app.modules.integrations.odoo.service import OdooIntegrationService
        import asyncio
        
        # 1. Update local DB immediately
        with get_sqlite() as conn:
            # Check if product exists
            product = conn.execute("SELECT sku FROM products WHERE id = ?", (product_id,)).fetchone()
            if not product: raise HTTPException(status_code=404, detail='Not found')
            
            # Check if batch exists, otherwise create
            b_existing = conn.execute("SELECT id FROM batches WHERE product_id = ?", (product_id,)).fetchone()
            if b_existing:
                conn.execute("UPDATE batches SET quantity = ? WHERE id = ?", (new_quantity, b_existing['id']))
            else:
                import uuid
                conn.execute("INSERT INTO batches (id, tenant_id, product_id, quantity, expiration_date) VALUES (?, ?, ?, ?, ?)", 
                             ("batch_"+str(uuid.uuid4())[:8], 'tenant_123', product_id, new_quantity, '2099-12-31'))
            conn.commit()
            
        # 2. Push to Odoo in the background
        service = OdooIntegrationService('tenant_123')
        async def background_sync():
            try:
                await service.push_stock_adjustment(product['sku'], float(new_quantity))
            except Exception as e:
                import logging
                logging.getLogger("farmaai.core").error(f"Background Odoo sync failed: {e}")
        
        asyncio.create_task(background_sync())
        return {'status': 'success'}
    except Exception as e:
        import logging
        logging.getLogger("farmaai.core").error(f"Adjustment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/suggested-orders')
async def get_suggested_orders():
    from app.core.middleware import get_current_tenant_id
    tenant_id = get_current_tenant_id()
    where_tenant = "WHERE p.tenant_id = ?" if tenant_id else "WHERE 1=1"
    params = (tenant_id,) if tenant_id else ()
    
    rows = query_all(f"""
        SELECT p.id, p.brand_name, p.sku, COALESCE(SUM(b.quantity), 0) as total_stock
        FROM products p
        LEFT JOIN batches b ON b.product_id = p.id
        {where_tenant}
        GROUP BY p.id
        HAVING total_stock < 50
    """, params)
    suggestions = []
    for r in rows:
        suggestions.append({
            'id': str(r['id']),
            'name': r['brand_name'],
            'sku': r['sku'],
            'supplier': 'Distribuidora FarmaAI',
            'currentStock': r['total_stock'],
            'weeklyDemand': 20,
            'suggestedQty': 100
        })
    return suggestions

@router.post('/purchase-orders')
async def create_purchase_order(data: dict):
    sku = data.get('sku')
    qty = data.get('quantity')
    if not sku or not qty:
        raise HTTPException(status_code=400, detail='Missing sku or qty')
    try:
        from app.modules.integrations.odoo.service import OdooIntegrationService
        service = OdooIntegrationService('tenant_123')
        odoo_id = await service.push_purchase_order(sku, float(qty))
        return {'status': 'success', 'odoo_id': odoo_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
