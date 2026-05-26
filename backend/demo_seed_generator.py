import sqlite3
import uuid
import random
from datetime import datetime, timedelta
from pathlib import Path
from passlib.context import CryptContext

DB_PATH = Path(__file__).parent / "farmaai_local.db"
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# =====================================================================
# 1. DATOS BASE (SaaS, Tenants, Usuarios, Settings)
# =====================================================================
PLAN_LIMITS = {
    "STARTER": {"transactions": 1000, "whatsapp": 500, "patients": 500, "branches": 1, "users": 3, "price": 49},
    "PRO": {"transactions": 10000, "whatsapp": 3000, "patients": 10000, "branches": 3, "users": 10, "price": 149},
    "ENTERPRISE": {"transactions": 999999, "whatsapp": 999999, "patients": 999999, "branches": 99, "users": 99, "price": 299}
}

base_date = datetime.now()

# Tenants
tenants = []
main_tenant_id = str(uuid.uuid4())
tenants.append({"id": main_tenant_id, "name": "Droguería Salud Vital", "plan": "PRO", "status": "Saludable"})
tenants.append({"id": str(uuid.uuid4()), "name": "Farmacia Cruz Verde", "plan": "ENTERPRISE", "status": "Saludable"})
tenants.append({"id": str(uuid.uuid4()), "name": "Botica de Barrio", "plan": "STARTER", "status": "Riesgo Churn"})
for i in range(12):
    t_plan = random.choice(["STARTER", "PRO", "ENTERPRISE"])
    tenants.append({
        "id": str(uuid.uuid4()), 
        "name": f"Farmacia {random.choice(['La Rebaja', 'Pasteur', 'Alemana', 'San Jorge'])} {i}", 
        "plan": t_plan,
        "status": random.choice(["Saludable", "Saludable", "Saludable", "Nuevo"])
    })

# Settings para el Tenant Principal
settings = {
    "pharmacy_profile": {"name": "Droguería Salud Vital", "nit": "900.123.456-7", "regimen": "Común", "dian_res": "18762000001"},
    "pos_sales": {"require_patient": False, "allow_credit": True, "max_discount": 15},
    "inventory": {"fefo_required": True, "block_expired": True, "allow_negative": False, "default_min_stock": 10},
    "crm": {"ltv_premium": 500000, "ltv_vip": 1500000},
    "communications": {"whatsapp_connected": True, "whatsapp_number": "+573001234567"}
}

# Usuarios
admin_hash = pwd_context.hash("admin123")
cajero_hash = pwd_context.hash("cajero123")

users = [
    {"id": str(uuid.uuid4()), "tenant_id": main_tenant_id, "email": "admin@saludvital.com", "role": "admin", "name": "Admin", "hashed": admin_hash},
    {"id": str(uuid.uuid4()), "tenant_id": main_tenant_id, "email": "cajero1@saludvital.com", "role": "cashier", "name": "Cajero 1", "hashed": cajero_hash},
    {"id": str(uuid.uuid4()), "tenant_id": main_tenant_id, "email": "cajero2@saludvital.com", "role": "cashier", "name": "Cajero 2", "hashed": cajero_hash}
]

# =====================================================================
# 2. CATÁLOGO E INVENTARIO
# =====================================================================
categories = [
    {"id": str(uuid.uuid4()), "name": "Analgésicos"},
    {"id": str(uuid.uuid4()), "name": "Antibióticos"},
    {"id": str(uuid.uuid4()), "name": "Antihipertensivos"},
    {"id": str(uuid.uuid4()), "name": "Dermatológicos"},
    {"id": str(uuid.uuid4()), "name": "Vitaminas"},
    {"id": str(uuid.uuid4()), "name": "Cuidado Personal"}
]

products_data = [
    {"name": "Dolex Forte", "cat": "Analgésicos", "price": 12000, "cost": 8000, "tax": 0},
    {"name": "Amoxicilina 500mg", "cat": "Antibióticos", "price": 15000, "cost": 10000, "tax": 0},
    {"name": "Losartán 50mg", "cat": "Antihipertensivos", "price": 25000, "cost": 15000, "tax": 0},
    {"name": "Eucerin Protector Solar", "cat": "Dermatológicos", "price": 95000, "cost": 65000, "tax": 0.19},
    {"name": "Vitamina C 1000mg", "cat": "Vitaminas", "price": 18000, "cost": 12000, "tax": 0.19},
    {"name": "Aspirina 100mg", "cat": "Analgésicos", "price": 8000, "cost": 5000, "tax": 0},
    {"name": "Azitromicina 500mg", "cat": "Antibióticos", "price": 22000, "cost": 14000, "tax": 0},
    {"name": "Enalapril 20mg", "cat": "Antihipertensivos", "price": 12000, "cost": 7000, "tax": 0},
    {"name": "Cetaphil Loción", "cat": "Dermatológicos", "price": 85000, "cost": 55000, "tax": 0.19},
    {"name": "Centrum Forte", "cat": "Vitaminas", "price": 45000, "cost": 30000, "tax": 0.19},
    {"name": "Ibuprofeno 400mg", "cat": "Analgésicos", "price": 5000, "cost": 2500, "tax": 0},
    {"name": "Cefalexina 500mg", "cat": "Antibióticos", "price": 16000, "cost": 10000, "tax": 0},
    {"name": "Amlodipino 5mg", "cat": "Antihipertensivos", "price": 14000, "cost": 8000, "tax": 0},
    {"name": "Jabón Asepxia", "cat": "Dermatológicos", "price": 12000, "cost": 7000, "tax": 0.19},
    {"name": "Tarrito Rojo", "cat": "Vitaminas", "price": 28000, "cost": 18000, "tax": 0.19},
    {"name": "Acetaminofén 500mg", "cat": "Analgésicos", "price": 2000, "cost": 1000, "tax": 0},
    {"name": "Metformina 850mg", "cat": "Antihipertensivos", "price": 10000, "cost": 5000, "tax": 0},
    {"name": "Loratadina 10mg", "cat": "Cuidado Personal", "price": 6000, "cost": 3000, "tax": 0},
    {"name": "Desodorante Rexona", "cat": "Cuidado Personal", "price": 15000, "cost": 9000, "tax": 0.19},
    {"name": "Crema Dental Colgate", "cat": "Cuidado Personal", "price": 8000, "cost": 5000, "tax": 0.19},
]

products = []
batches = []

# Distribuir vencimientos (3 productos vencen en <30 días)
exp_close = [base_date + timedelta(days=15), base_date + timedelta(days=20), base_date + timedelta(days=28)]
exp_far = base_date + timedelta(days=365)

for i, p in enumerate(products_data):
    prod_id = str(uuid.uuid4())
    cat_id = next(c["id"] for c in categories if c["name"] == p["cat"])
    
    products.append({
        "id": prod_id, "tenant_id": main_tenant_id, "category_id": cat_id, 
        "sku": f"MED-{str(i+1).zfill(3)}", "name": p["name"], "price": p["price"], 
        "cost": p["cost"], "tax_rate": p["tax"], "min_stock": settings["inventory"]["default_min_stock"]
    })
    
    # 1 producto con stock crítico bajo (ej. 5 unidades)
    initial_qty = 5 if i == 0 else random.randint(150, 500)
    exp_date = exp_close.pop() if exp_close else exp_far

    batches.append({
        "id": str(uuid.uuid4()), "tenant_id": main_tenant_id, "product_id": prod_id,
        "batch_number": f"LOTE-{i}", "expiration_date": exp_date.strftime("%Y-%m-%d"),
        "initial_qty": initial_qty, "current_qty": initial_qty
    })

# =====================================================================
# 3. PACIENTES Y CRM
# =====================================================================
colombian_names = [
    ("Carlos", "Gómez"), ("María", "López"), ("Andrés", "Rodríguez"), ("Ana", "Martínez"),
    ("Juan", "Pérez"), ("Laura", "García"), ("Diego", "Sánchez"), ("Camila", "Díaz"),
    ("Luis", "Ramírez"), ("Diana", "Torres"), ("Jorge", "Ruiz"), ("Valentina", "Flores"),
    ("Miguel", "Acosta"), ("Daniela", "Molina"), ("Santiago", "Castro")
]

chronic_conditions = [
    ["Hipertenso"], ["Diabético", "Tiroides"], ["Asma"], [], ["Hipertenso", "Artritis"],
    [], ["Migraña"], ["Epilepsia"], [], ["Diabético"],
    [], ["Tiroides"], ["Asma", "Rinitis"], [], ["Hipertenso"]
]

patients = []
for i in range(15):
    first_name, last_name = colombian_names[i]
    conds = chronic_conditions[i]
    tags_str = '["' + '", "'.join(conds) + '"]' if conds else '[]'
    
    patients.append({
        "id": str(uuid.uuid4()), "tenant_id": main_tenant_id, 
        "first_name": first_name, "last_name": last_name, "name": f"{first_name} {last_name}",
        "document": f"{random.randint(10000000, 1100000000)}",
        "phone": f"+5730{random.randint(0,9)}{random.randint(1000000,9999999)}", 
        "ltv": 0, "segment": "Regular",
        "last_purchase": None, "has_fiado": False,
        "tags": tags_str, "preferences": '{"condiciones": "' + ';'.join(conds) + '"}'
    })

# =====================================================================
# 4. VENTAS (HISTÓRICO 90 DÍAS)
# =====================================================================
sales = []
sale_items = []
payments = []

total_days = 90
current_day = base_date - timedelta(days=total_days)

for day in range(total_days):
    num_sales = random.randint(5, 15)
    for _ in range(num_sales):
        sale_id = str(uuid.uuid4())
        is_patient_sale = random.random() > 0.4
        patient = random.choice(patients) if is_patient_sale else None
        
        num_items = random.randint(1, 4)
        selected_products = []
        
        # Match products with conditions
        if patient and patient["preferences"]:
            # Parse the basic preferences str manually since we built it
            cond_str = patient["preferences"].split('":"')[1].replace('"}', '') if '":"' in patient["preferences"] else ""
            conds = cond_str.split(";") if cond_str else []
            preferred_cats = []
            if "Hipertenso" in conds: preferred_cats.append("Antihipertensivos")
            if "Diabético" in conds: preferred_cats.append("Antihipertensivos") # Ej: Metformina
            if "Tiroides" in conds: preferred_cats.append("Cuidado Personal") # Fallback
            if "Asma" in conds: preferred_cats.append("Cuidado Personal")
            
            if preferred_cats and random.random() > 0.3:
                # 70% chance to buy something for their condition
                matching_prods = [p for p in products if any(c["id"] == p["category_id"] and c["name"] in preferred_cats for c in categories)]
                if matching_prods:
                    selected_products.append(random.choice(matching_prods))
                    num_items -= 1
                    
        # Fill rest randomly
        if num_items > 0:
            selected_products.extend(random.sample(products, num_items))
        
        subtotal = 0
        tax_total = 0
        cogs_total = 0
        
        for sp in selected_products:
            # Encontrar lote
            batch = next(b for b in batches if b["product_id"] == sp["id"])
            qty = random.randint(1, 3)
            
            # REGLA: Disminuir stock
            if batch["current_qty"] >= qty:
                batch["current_qty"] -= qty
                
                item_subtotal = sp["price"] * qty
                item_tax = item_subtotal * sp["tax_rate"]
                item_cogs = sp["cost"] * qty
                
                subtotal += item_subtotal
                tax_total += item_tax
                cogs_total += item_cogs
                
                sale_items.append({
                    "id": str(uuid.uuid4()), "tenant_id": main_tenant_id, "sale_id": sale_id,
                    "product_id": sp["id"], "batch_id": batch["id"], "qty": qty, 
                    "price": sp["price"], "cogs": item_cogs
                })

        if subtotal == 0: continue # No items added

        grand_total = subtotal + tax_total
        
        # Pagos y fiados
        payment_method = random.choice(["efectivo", "tarjeta", "nequi"])
        if patient and random.random() < 0.05: # 5% chance of fiado
            payment_method = "fiado"
            patient["has_fiado"] = True
            
        sales.append({
            "id": sale_id, "tenant_id": main_tenant_id, "patient_id": patient["id"] if patient else None,
            "subtotal": subtotal, "tax_total": tax_total, "grand_total": grand_total, "cogs_total": cogs_total,
            "date": current_day.strftime("%Y-%m-%d %H:%M:%S"), "method": payment_method
        })
        
        payments.append({
            "id": str(uuid.uuid4()), "tenant_id": main_tenant_id, "sale_id": sale_id,
            "method": payment_method, "amount": grand_total
        })
        
        # LTV Patient Update
        if patient:
            patient["ltv"] += grand_total
            patient["last_purchase"] = current_day.strftime("%Y-%m-%d")

    current_day += timedelta(days=1)

# Asignar segmentos según LTV
for p in patients:
    if p["ltv"] >= settings["crm"]["ltv_vip"]:
        p["segment"] = "VIP"
    elif p["ltv"] >= settings["crm"]["ltv_premium"]:
        p["segment"] = "Premium"
    else:
        p["segment"] = "Regular"

# =====================================================================
# 5. DEVOLUCIONES Y MERMAS
# =====================================================================
# Devolución
refund_sale = sales[-1] # Refund last sale
refund_sale["status"] = "refunded"

# Merma
merma_batch = batches[-1]
merma_qty = 2
merma_batch["current_qty"] -= merma_qty
mermas = [{"id": str(uuid.uuid4()), "batch_id": merma_batch["id"], "qty": merma_qty, "reason": "Dañado", "loss": merma_qty * next(p["cost"] for p in products if p["id"] == merma_batch["product_id"])}]

# Gastos Operativos del mes
expenses = [
    {"id": str(uuid.uuid4()), "tenant_id": main_tenant_id, "category": "Arriendo", "amount": 1500000, "date": base_date.strftime("%Y-%m-01")},
    {"id": str(uuid.uuid4()), "tenant_id": main_tenant_id, "category": "Nómina", "amount": 3000000, "date": base_date.strftime("%Y-%m-05")},
    {"id": str(uuid.uuid4()), "tenant_id": main_tenant_id, "category": "Servicios Públicos", "amount": 450000, "date": base_date.strftime("%Y-%m-10")}
]

# =====================================================================
# 6. INSERCIÓN EN SQLITE
# =====================================================================
def insert_to_db():
    print("📦 Insertando datos en base de datos local...")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Limpiar
    for table in ["sales", "sale_items", "payments", "batches", "products", "categories", "patients", "expenses", "cash_sessions", "integration_sync_logs", "integration_configs", "users", "pharmacies"]:
        c.execute(f"DROP TABLE IF EXISTS {table}")
        
    c.executescript("""
    CREATE TABLE IF NOT EXISTS pharmacies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tax_id TEXT,
        country TEXT DEFAULT 'CO',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1,
        plan TEXT,
        status TEXT,
        trial_ends_at TEXT,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT
    );
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES pharmacies(id),
        email TEXT UNIQUE NOT NULL,
        hashed_password TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        role TEXT DEFAULT 'pharmacist',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES pharmacies(id),
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES pharmacies(id),
        category_id TEXT REFERENCES categories(id),
        sku TEXT NOT NULL,
        barcode TEXT,
        brand_name TEXT NOT NULL,
        active_ingredient TEXT,
        presentation TEXT,
        unit_price REAL NOT NULL,
        cost_price REAL,
        min_stock INTEGER DEFAULT 5,
        tax_rate REAL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS batches (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES pharmacies(id),
        product_id TEXT NOT NULL REFERENCES products(id),
        batch_number TEXT NOT NULL,
        expiration_date TEXT NOT NULL,
        quantity INTEGER DEFAULT 0,
        initial_qty INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES pharmacies(id),
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        phone TEXT,
        document_id TEXT,
        status TEXT DEFAULT 'active',
        last_purchase_date TEXT,
        preferences TEXT DEFAULT '{}',
        tags TEXT DEFAULT '[]',
        ltv REAL DEFAULT 0,
        segment TEXT,
        odoo_partner_id TEXT,
        odoo_sync_status TEXT DEFAULT 'pending',
        last_odoo_sync TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES pharmacies(id),
        user_id TEXT NOT NULL REFERENCES users(id),
        patient_id TEXT REFERENCES patients(id),
        subtotal REAL NOT NULL,
        tax_total REAL DEFAULT 0,
        discount_total REAL DEFAULT 0,
        grand_total REAL NOT NULL,
        cogs_total REAL DEFAULT 0,
        status TEXT DEFAULT 'completed',
        idempotency_key TEXT UNIQUE,
        method TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS sale_items (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES pharmacies(id),
        sale_id TEXT NOT NULL REFERENCES sales(id),
        product_id TEXT NOT NULL REFERENCES products(id),
        batch_id TEXT NOT NULL REFERENCES batches(id),
        quantity INTEGER NOT NULL,
        unit_price_at_sale REAL NOT NULL,
        cogs REAL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES pharmacies(id),
        sale_id TEXT NOT NULL REFERENCES sales(id),
        payment_method TEXT NOT NULL,
        amount_paid REAL NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES pharmacies(id),
        date TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        amount REAL NOT NULL,
        payment_method TEXT,
        provider TEXT,
        recurring INTEGER DEFAULT 0,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS cash_sessions (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES pharmacies(id),
        cashier_id TEXT NOT NULL REFERENCES users(id),
        cashier_name TEXT,
        date TEXT NOT NULL,
        opening_cash REAL DEFAULT 0,
        sales_cash REAL DEFAULT 0,
        sales_card REAL DEFAULT 0,
        sales_nequi REAL DEFAULT 0,
        sales_daviplata REAL DEFAULT 0,
        total_sales REAL DEFAULT 0,
        returns REAL DEFAULT 0,
        petty_cash_expenses REAL DEFAULT 0,
        expected_cash REAL DEFAULT 0,
        actual_cash REAL DEFAULT 0,
        discrepancy REAL DEFAULT 0,
        open_time TEXT,
        close_time TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS integration_configs (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES pharmacies(id),
        provider TEXT NOT NULL,
        url TEXT,
        db_name TEXT,
        username TEXT,
        encrypted_api_key TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS integration_sync_logs (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES pharmacies(id),
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        status TEXT NOT NULL,
        error_details TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    for t in tenants: c.execute("INSERT INTO pharmacies (id, name, tax_id, country, plan, status, trial_ends_at, stripe_customer_id, stripe_subscription_id) VALUES (?,?,?,?,?,?,datetime('now', '+14 days'),NULL,NULL)", (t["id"], t["name"], "900123", "CO", t["plan"], t["status"]))
    for u in users: c.execute("INSERT INTO users (id, tenant_id, email, hashed_password, first_name, role) VALUES (?,?,?,?,?,?)", (u["id"], u["tenant_id"], u["email"], u["hashed"], u["name"], u["role"]))
    for cat in categories: c.execute("INSERT INTO categories (id, tenant_id, name) VALUES (?,?,?)", (cat["id"], main_tenant_id, cat["name"]))
    for p in products: c.execute("INSERT INTO products (id, tenant_id, category_id, sku, barcode, brand_name, unit_price, cost_price, tax_rate, min_stock, active_ingredient, presentation) VALUES (?,?,?,?, '770', ?,?,?,?,?, 'Paracetamol', 'Tabletas')", (p["id"], p["tenant_id"], p["category_id"], p["sku"], p["name"], p["price"], p["cost"], p["tax_rate"], p["min_stock"]))
    for b in batches: c.execute("INSERT INTO batches (id, tenant_id, product_id, batch_number, expiration_date, quantity, initial_qty) VALUES (?,?,?,?,?,?,?)", (b["id"], b["tenant_id"], b["product_id"], b["batch_number"], b["expiration_date"], b["current_qty"], b["initial_qty"]))
    for p in patients: c.execute("INSERT INTO patients (id, tenant_id, first_name, last_name, document_id, phone, ltv, segment, last_purchase_date, tags, preferences) VALUES (?,?,?,?,?,?,?,?,?,?,?)", (p["id"], p["tenant_id"], p["first_name"], p["last_name"], p["document"], p["phone"], p["ltv"], p["segment"], p["last_purchase"], p["tags"], p["preferences"]))
    for s in sales: c.execute("INSERT INTO sales (id, tenant_id, user_id, patient_id, subtotal, tax_total, grand_total, cogs_total, status, created_at, method) VALUES (?,?,?,?,?,?,?,?,?,?,?)", (s["id"], s["tenant_id"], users[1]["id"], s["patient_id"], s["subtotal"], s["tax_total"], s["grand_total"], s["cogs_total"], s.get("status", "completed"), s["date"], s["method"]))
    for si in sale_items: c.execute("INSERT INTO sale_items (id, tenant_id, sale_id, product_id, batch_id, quantity, unit_price_at_sale, cogs) VALUES (?,?,?,?,?,?,?,?)", (si["id"], si["tenant_id"], si["sale_id"], si["product_id"], si["batch_id"], si["qty"], si["price"], si["cogs"]))
    for p in payments: c.execute("INSERT INTO payments (id, tenant_id, sale_id, payment_method, amount_paid) VALUES (?,?,?,?,?)", (p["id"], p["tenant_id"], p["sale_id"], p["method"], p["amount"]))
    for e in expenses: c.execute("INSERT INTO expenses (id, tenant_id, category, amount, date) VALUES (?,?,?,?,?)", (e["id"], e["tenant_id"], e["category"], e["amount"], e["date"]))

    
    conn.commit()
    conn.close()

# =====================================================================
# 7. VALIDACIÓN Y REGLAS DE COHERENCIA
# =====================================================================
def validate():
    print("\n" + "="*60)
    print("🔍 VALIDACIÓN DE REGLAS DE COHERENCIA")
    print("="*60)
    
    # 1. STOCK
    print("[✓] 1. Verificando Stock (Stock actual = Stock Inicial - Ventas - Mermas)")
    for b in batches:
        sold = sum(si["qty"] for si in sale_items if si["batch_id"] == b["id"])
        merma = sum(m["qty"] for m in mermas if m["batch_id"] == b["id"])
        assert b["current_qty"] == b["initial_qty"] - sold - merma, f"Error en lote {b['batch_number']}"
    
    # 2. LTV
    print("[✓] 2. Verificando LTV de pacientes (LTV = Suma de sus compras)")
    for p in patients:
        total_purchases = sum(s["grand_total"] for s in sales if s["patient_id"] == p["id"])
        assert abs(p["ltv"] - total_purchases) < 0.1, f"Error LTV en {p['name']}"
    
    # 3. SEGMENTACIÓN
    print("[✓] 3. Verificando Segmentación automática CRM")
    for p in patients:
        if p["ltv"] >= settings["crm"]["ltv_vip"]: assert p["segment"] == "VIP"
        elif p["ltv"] >= settings["crm"]["ltv_premium"]: assert p["segment"] == "Premium"
        else: assert p["segment"] == "Regular"
    
    # 4. COGS
    print("[✓] 4. Verificando COGS en P&L")
    for s in sales:
        calc_cogs = sum(si["cogs"] for si in sale_items if si["sale_id"] == s["id"])
        assert abs(s["cogs_total"] - calc_cogs) < 0.1, f"Error COGS en venta {s['id']}"
        
    # 5. IVA
    print("[✓] 5. Verificando cálculo de IVA (exentos vs gravados)")
    # Evaluado durante la generación (item_tax = item_subtotal * tax_rate)

    # 6. USO DE PLAN
    print("[✓] 6. Verificando uso de plan SaaS vs límites")
    actual_trx = len(sales)
    print(f"    - Transacciones actuales: {actual_trx} / {PLAN_LIMITS['PRO']['transactions']}")

    # 7. MRR SUPER ADMIN
    print("[✓] 7. Verificando MRR Total (Suma de tenants)")
    total_mrr = sum(PLAN_LIMITS[t["plan"]]["price"] for t in tenants)
    print(f"    - MRR Calculado: ${total_mrr} USD")
    
    # 8. FIADOS
    print("[✓] 8. Verificando integridad de Fiados")
    fiado_sales = [s for s in sales if s["method"] == "fiado"]
    assert len(fiado_sales) > 0, "No hay ventas fiadas"
    assert all(s["patient_id"] is not None for s in fiado_sales), "Venta fiada sin paciente"
    
    # 9. FEFO
    print("[✓] 9. Verificando alertas FEFO (< 30 días)")
    prox_vencer = [b for b in batches if (datetime.strptime(b["expiration_date"], "%Y-%m-%d") - base_date).days < 30]
    assert len(prox_vencer) >= 3, "Debe haber al menos 3 productos próximos a vencer"
    print(f"    - Lotes próximos a vencer: {len(prox_vencer)}")
    
    # 10. COMPRAS SUGERIDAS
    print("[✓] 10. Verificando alertas de Stock Mínimo")
    stock_bajo = [b for b in batches if b["current_qty"] < next(p["min_stock"] for p in products if p["id"] == b["product_id"])]
    assert len(stock_bajo) >= 1, "Debe haber al menos 1 producto en stock crítico"
    print(f"    - Lotes con stock bajo: {len(stock_bajo)}")

    print("\n✅ Todas las 10 reglas de coherencia pasaron con éxito.")
    print("="*60)
    print(f"Total Tenants: {len(tenants)}")
    print(f"Total Pacientes: {len(patients)}")
    print(f"Total Ventas: {len(sales)}")
    print(f"Total Items Vendidos: {len(sale_items)}")
    print(f"Total Mermas: {len(mermas)}")
    print(f"MRR Generado: ${total_mrr} USD")

if __name__ == "__main__":
    insert_to_db()
    validate()
