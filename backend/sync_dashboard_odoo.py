import asyncio
import sqlite3
import uuid
import sys
import datetime

sys.path.append('c:/Users/santi/Downloads/CRMFARMAIA/backend')
from app.modules.integrations.odoo.service import OdooIntegrationService

tenant_id = '211e3e3d-10bf-4092-8897-6290aa6dc17d'

async def sync():
    service = OdooIntegrationService(tenant_id)
    print('Authenticating with Odoo...')
    await service.transport.authenticate()
    
    conn = sqlite3.connect('farmaai_local.db')
    c = conn.cursor()
    
    # 1. Fetch and Sync Categories
    print('Syncing Categories...')
    odoo_categories = await service.transport.execute_kw(
        "product.category", "search_read", [], {"fields": ["id", "name"]}
    )
    c.execute("DELETE FROM categories WHERE tenant_id = ?", (tenant_id,))
    
    cat_mapping = {} # odoo_id -> local_id
    for cat in odoo_categories:
        local_id = "cat_" + str(cat["id"])
        c.execute("INSERT INTO categories (id, tenant_id, name) VALUES (?, ?, ?)", (local_id, tenant_id, cat["name"]))
        cat_mapping[cat["id"]] = local_id
    
    # 2. Fetch Products and Update Categories
    print('Syncing Products and Categories...')
    odoo_products = await service.transport.execute_kw(
        "product.template", "search_read", [[("sale_ok", "=", True)]],
        {"fields": ["id", "name", "categ_id", "default_code", "list_price", "standard_price"]}
    )
    
    prod_mapping = {} # odoo_product_id -> local_product_id
    
    for p in odoo_products:
        sku = str(p.get("default_code", p["id"]))
        cat_tuple = p.get("categ_id")
        local_cat_id = cat_mapping.get(cat_tuple[0]) if cat_tuple else None
        
        c.execute("SELECT id FROM products WHERE sku = ? AND tenant_id = ?", (sku, tenant_id))
        row = c.fetchone()
        if row:
            local_pid = row[0]
            c.execute("UPDATE products SET category_id = ?, brand_name = ? WHERE id = ?", (local_cat_id, p["name"], local_pid))
        else:
            local_pid = "prod_" + str(uuid.uuid4())[:8]
            c.execute("INSERT INTO products (id, tenant_id, sku, brand_name, unit_price, cost_price, category_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
                      (local_pid, tenant_id, sku, p["name"], p.get("list_price", 0), p.get("standard_price", 0), local_cat_id))
        prod_mapping[p["id"]] = local_pid
        
    # 3. Fetch Sales
    print('Syncing Sales...')
    c.execute("DELETE FROM sale_items WHERE tenant_id = ?", (tenant_id,))
    c.execute("DELETE FROM sales WHERE tenant_id = ?", (tenant_id,))
    
    odoo_sales = await service.transport.execute_kw(
        "sale.order", "search_read", [[("state", "in", ["sale", "done"])]],
        {"fields": ["id", "partner_id", "amount_total", "date_order"]}
    )
    
    for s in odoo_sales:
        local_sale_id = "sale_" + str(s["id"])
        
        # Find local patient
        partner_tuple = s.get("partner_id")
        local_patient_id = None
        if partner_tuple:
            odoo_partner_id = str(partner_tuple[0])
            c.execute("SELECT id FROM patients WHERE odoo_partner_id = ? AND tenant_id = ?", (odoo_partner_id, tenant_id))
            pat_row = c.fetchone()
            if pat_row:
                local_patient_id = pat_row[0]
                
        date_str = str(s["date_order"]) if s.get("date_order") else datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        c.execute("""
            INSERT INTO sales (id, tenant_id, user_id, patient_id, subtotal, grand_total, status, method, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (local_sale_id, tenant_id, "admin", local_patient_id, s.get("amount_total", 0), s.get("amount_total", 0), "completed", "cash", date_str))
        
        # Fetch lines for this sale
        lines = await service.transport.execute_kw(
            "sale.order.line", "search_read", [[("order_id", "=", s["id"])]],
            {"fields": ["id", "product_template_id", "product_uom_qty", "price_unit"]}
        )
        
        for l in lines:
            pt_tuple = l.get("product_template_id")
            local_pid = None
            if pt_tuple:
                local_pid = prod_mapping.get(pt_tuple[0])
            
            if local_pid:
                c.execute("""
                    INSERT INTO sale_items (id, tenant_id, sale_id, product_id, batch_id, quantity, unit_price_at_sale, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, ("si_" + str(l["id"]), tenant_id, local_sale_id, local_pid, "dummy_batch", l.get("product_uom_qty", 1), l.get("price_unit", 0), date_str))
                
    conn.commit()
    conn.close()
    print("Sync completed!")

asyncio.run(sync())
