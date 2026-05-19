from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.core.database import get_db
from app.core.local_db import query_all, query_one
from app.modules.inventory.schemas import ProductWithStockResponse, StockMovementCreate
import uuid

router = APIRouter(prefix="/inventory", tags=["inventory"])

# Dummy dependency to simulate a logged-in user and get their ID
async def get_current_user_id() -> uuid.UUID:
    return uuid.uuid4() # In a real app, this extracts the user ID from the JWT

@router.get("/products")
async def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: str = Query("", description="Buscar por nombre, SKU o principio activo"),
):
    from app.core.middleware import get_current_branch_id
    branch_id = get_current_branch_id()
    branch_filter = "AND b.branch_id = ?" if branch_id else ""
    params = (f"%{search}%", f"%{search}%", f"%{search}%") + ((branch_id,) if branch_id else ()) + (limit, skip) if search else ((branch_id,) if branch_id else ()) + (limit, skip)

    """
    Lista productos con stock REAL desde la base de datos SQLite.
    """
    if search:
        rows = query_all(f"""
            SELECT p.id, p.sku, p.brand_name, p.active_ingredient, p.presentation,
                   p.unit_price, p.cost_price, p.min_stock, p.is_active,
                   COALESCE(b.quantity, 0) as total_stock,
                   b.batch_number, b.expiration_date,
                   c.name as category_name
            FROM products p
            LEFT JOIN batches b ON b.product_id = p.id {branch_filter}
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.brand_name LIKE ? OR p.sku LIKE ? OR p.active_ingredient LIKE ?
            ORDER BY p.brand_name
            LIMIT ? OFFSET ?
        """, params)
    else:
        rows = query_all(f"""
            SELECT p.id, p.sku, p.brand_name, p.active_ingredient, p.presentation,
                   p.unit_price, p.cost_price, p.min_stock, p.is_active,
                   COALESCE(b.quantity, 0) as total_stock,
                   b.batch_number, b.expiration_date,
                   c.name as category_name
            FROM products p
            LEFT JOIN batches b ON b.product_id = p.id {branch_filter}
            LEFT JOIN categories c ON p.category_id = c.id
            ORDER BY p.brand_name
            LIMIT ? OFFSET ?
        """, params)

    return rows

@router.get("/products/{product_id}")
async def get_product(product_id: str):
    from app.core.middleware import get_current_branch_id
    branch_id = get_current_branch_id()
    branch_filter = "AND b.branch_id = ?" if branch_id else ""
    params = (product_id, branch_id) if branch_id else (product_id,)

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
    branch_filter = "AND b.branch_id = ?" if branch_id else ""
    params = (branch_id,) if branch_id else ()

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
async def register_movement(movement: StockMovementCreate):
    return {"status": "success", "movement_id": str(uuid.uuid4())}
