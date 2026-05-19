"""
FarmaAI Data Seed Script (Standalone)
=====================================
Carga los datos de la farmacia "Droguería Salud Vital"
desde los archivos CSV hacia una base de datos SQLite local.

No requiere Docker, PostgreSQL ni servicios externos.

Uso:
    cd backend
    python seed_data.py
"""

import csv
import os
import sys
import uuid
import sqlite3
from datetime import date, datetime
from pathlib import Path
import json

# Path to CSV files
DATA_DIR = Path(__file__).parent.parent / "data" / "sample"
DB_PATH = Path(__file__).parent / "farmaai_local.db"

# Fixed IDs
TENANT_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
ADMIN_USER_ID = "11111111-1111-1111-1111-111111111111"
CAJERO1_ID = "22222222-2222-2222-2222-222222222222"
CAJERO2_ID = "33333333-3333-3333-3333-333333333333"

# Maps
product_map = {}
batch_map = {}
patient_map = {}
category_map = {}


def create_tables(conn):
    """Create all necessary tables."""
    print("📦 Creando tablas...")
    c = conn.cursor()

    c.executescript("""
    CREATE TABLE IF NOT EXISTS pharmacies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tax_id TEXT,
        country TEXT DEFAULT 'CO',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1
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
        status TEXT DEFAULT 'completed',
        idempotency_key TEXT UNIQUE,
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
    CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES pharmacies(id),
        name TEXT NOT NULL,
        nit TEXT,
        contact_name TEXT,
        contact_phone TEXT,
        contact_email TEXT,
        city TEXT,
        type TEXT,
        credit_days INTEGER DEFAULT 30,
        early_payment_discount REAL DEFAULT 0,
        rating INTEGER DEFAULT 5,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS purchase_orders (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES pharmacies(id),
        supplier_id TEXT NOT NULL REFERENCES suppliers(id),
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        expected_delivery TEXT,
        invoice_number TEXT,
        is_active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS purchase_order_items (
        id TEXT PRIMARY KEY,
        purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id),
        product_sku TEXT NOT NULL,
        product_name TEXT NOT NULL,
        quantity_ordered INTEGER NOT NULL,
        quantity_received INTEGER DEFAULT 0,
        unit_cost REAL NOT NULL,
        total_cost REAL NOT NULL
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
    """)
    conn.commit()
    print("   ✅ Tablas creadas.\n")


def seed_tenant_and_users(conn):
    print("🏪 Creando Farmacia y Usuarios...")
    c = conn.cursor()

    c.execute("SELECT id FROM pharmacies WHERE id = ?", (TENANT_ID,))
    if c.fetchone():
        print("   ⚠️  Ya existen datos. Limpiando para re-cargar...\n")
        for table in ["cash_sessions", "expenses", "purchase_order_items", "purchase_orders",
                       "suppliers", "payments", "sale_items", "sales", "patients",
                       "batches", "products", "categories", "users", "pharmacies"]:
            c.execute(f"DELETE FROM {table}")
        conn.commit()

    c.execute("INSERT INTO pharmacies VALUES (?,?,?,?,datetime('now'),1)",
              (TENANT_ID, "Droguería Salud Vital", "901234567-1", "CO"))

    users = [
        (ADMIN_USER_ID, TENANT_ID, "admin@saludvital.com", "hashed_pw", "Camila", "Ruiz", "admin"),
        (CAJERO1_ID, TENANT_ID, "laura@saludvital.com", "hashed_pw", "Laura", "Gómez", "cashier"),
        (CAJERO2_ID, TENANT_ID, "miguel@saludvital.com", "hashed_pw", "Miguel Ángel", "Pardo", "cashier"),
    ]
    c.executemany("INSERT INTO users (id,tenant_id,email,hashed_password,first_name,last_name,role,created_at,is_active) VALUES (?,?,?,?,?,?,?,datetime('now'),1)", users)
    conn.commit()
    print("   ✅ Farmacia: Droguería Salud Vital")
    print("   ✅ 3 usuarios creados.\n")


def seed_categories(conn):
    print("📂 Creando Categorías...")
    c = conn.cursor()
    categories = [
        "Antihipertensivo", "Antidiabético", "Gastrointestinal", "Antibiótico",
        "Analgésico", "Suplemento", "Cardiovascular", "Hipolipemiante",
        "Tiroideo", "Antialérgico", "Antiinflamatorio", "Antifúngico",
        "Control Especial", "Diurético", "Hidratación", "Dermatológico",
        "Broncodilatador", "Antiemético", "Insumos",
    ]
    for cat in categories:
        cat_id = str(uuid.uuid4())
        category_map[cat] = cat_id
        c.execute("INSERT INTO categories (id,tenant_id,name,description,created_at,is_active) VALUES (?,?,?,?,datetime('now'),1)",
                  (cat_id, TENANT_ID, cat, f"Categoría: {cat}"))
    conn.commit()
    print(f"   ✅ {len(categories)} categorías creadas.\n")


def seed_inventory(conn):
    print("💊 Cargando Inventario...")
    c = conn.cursor()
    csv_path = DATA_DIR / "productos_inventario.csv"

    count = 0
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            prod_id = str(uuid.uuid4())
            batch_id = str(uuid.uuid4())
            sku = row["sku"]
            cat_id = category_map.get(row["categoria"])

            c.execute("""INSERT INTO products (id,tenant_id,category_id,sku,barcode,brand_name,active_ingredient,
                        presentation,unit_price,cost_price,min_stock,created_at,is_active)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'),1)""",
                      (prod_id, TENANT_ID, cat_id, sku, sku.replace("MED-", "7707"),
                       row["nombre"], row["principio_activo"], row["presentacion"],
                       float(row["precio_venta"]), float(row["precio_compra"]),
                       int(row["stock_minimo"])))

            c.execute("""INSERT INTO batches (id,tenant_id,product_id,batch_number,expiration_date,
                        quantity,created_at,is_active) VALUES (?,?,?,?,?,?,datetime('now'),1)""",
                      (batch_id, TENANT_ID, prod_id, row["lote"],
                       row["fecha_vencimiento"], int(row["stock_actual"])))

            product_map[sku] = prod_id
            batch_map[sku] = batch_id
            count += 1

    conn.commit()
    print(f"   ✅ {count} productos + lotes cargados.\n")


def seed_patients(conn):
    print("👥 Cargando Pacientes...")
    c = conn.cursor()
    csv_path = DATA_DIR / "pacientes_crm.csv"

    count = 0
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            pat_id = str(uuid.uuid4())
            pac_code = row["id_paciente"]

            prefs = json.dumps({
                "eps": row.get("eps", ""),
                "regimen": row.get("tipo_regimen", ""),
                "condiciones": row.get("condiciones_cronicas", ""),
                "alergias": row.get("alergias", ""),
                "medicamentos": row.get("medicamentos_actuales", ""),
                "email": row.get("email", ""),
                "direccion": row.get("direccion", ""),
                "barrio": row.get("barrio", ""),
                "nacimiento": row.get("fecha_nacimiento", ""),
                "genero": row.get("genero", ""),
            }, ensure_ascii=False)

            tags = json.dumps([row.get("segmento", "Regular")])

            c.execute("""INSERT INTO patients (id,tenant_id,first_name,last_name,phone,document_id,
                        status,last_purchase_date,preferences,tags,created_at,is_active)
                        VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'),1)""",
                      (pat_id, TENANT_ID, row["nombre"], row["apellido"],
                       row["telefono"], row["cedula"], "active",
                       row.get("ultima_visita", ""), prefs, tags))

            patient_map[pac_code] = pat_id
            count += 1

    conn.commit()
    print(f"   ✅ {count} pacientes cargados.\n")


def seed_sales(conn):
    print("💰 Cargando Ventas...")
    c = conn.cursor()
    csv_path = DATA_DIR / "ventas_historico.csv"

    sales_grouped = {}
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            sid = row["id_venta"]
            if sid not in sales_grouped:
                sales_grouped[sid] = []
            sales_grouped[sid].append(row)

    sale_count = 0
    item_count = 0

    for sale_code, items in sales_grouped.items():
        first = items[0]
        sale_id = str(uuid.uuid4())
        subtotal = sum(float(r["subtotal"]) for r in items)
        pac_code = first.get("id_paciente", "")
        patient_id = patient_map.get(pac_code)
        cajero = CAJERO1_ID if first.get("id_cajero") == "CAJ-01" else CAJERO2_ID

        c.execute("""INSERT INTO sales (id,tenant_id,user_id,patient_id,subtotal,tax_total,
                    discount_total,grand_total,status,idempotency_key,created_at,is_active)
                    VALUES (?,?,?,?,?,0,0,?,?,?,?,1)""",
                  (sale_id, TENANT_ID, cajero, patient_id, subtotal, subtotal,
                   "completed", sale_code, first["fecha"] + "T" + first["hora"]))

        for row in items:
            sku = row["sku_producto"]
            prod_id = product_map.get(sku)
            b_id = batch_map.get(sku)
            if prod_id and b_id:
                c.execute("""INSERT INTO sale_items (id,tenant_id,sale_id,product_id,batch_id,
                            quantity,unit_price_at_sale,created_at,is_active)
                            VALUES (?,?,?,?,?,?,?,datetime('now'),1)""",
                          (str(uuid.uuid4()), TENANT_ID, sale_id, prod_id, b_id,
                           int(row["cantidad"]), float(row["precio_unitario"])))
                item_count += 1

        c.execute("""INSERT INTO payments (id,tenant_id,sale_id,payment_method,amount_paid,
                    created_at,is_active) VALUES (?,?,?,?,?,datetime('now'),1)""",
                  (str(uuid.uuid4()), TENANT_ID, sale_id,
                   first["metodo_pago"].lower(), subtotal))
        sale_count += 1

    conn.commit()
    print(f"   ✅ {sale_count} ventas + {item_count} ítems cargados.\n")


def seed_suppliers(conn):
    print("🚚 Cargando Proveedores...")
    c = conn.cursor()
    csv_path = DATA_DIR / "proveedores.csv"

    count = 0
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            c.execute("""INSERT INTO suppliers (id,tenant_id,name,nit,contact_name,contact_phone,
                        contact_email,city,type,credit_days,early_payment_discount,rating,created_at,is_active)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),1)""",
                      (row["id_proveedor"], TENANT_ID, row["razon_social"], row["nit"],
                       row["contacto_nombre"], row["contacto_telefono"], row["contacto_email"],
                       row["ciudad"], row["tipo"], int(row["dias_credito"]),
                       float(row["descuento_pronto_pago"]), int(row["calificacion"])))
            count += 1

    conn.commit()
    print(f"   ✅ {count} proveedores cargados.\n")


def seed_expenses(conn):
    print("📊 Cargando Gastos Operativos...")
    c = conn.cursor()
    csv_path = DATA_DIR / "gastos_operativos.csv"

    count = 0
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            c.execute("""INSERT INTO expenses (id,tenant_id,date,category,description,amount,
                        payment_method,provider,recurring,notes,created_at)
                        VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'))""",
                      (row["id_gasto"], TENANT_ID, row["fecha"], row["categoria"],
                       row["descripcion"], float(row["monto"]), row["metodo_pago"],
                       row["proveedor_servicio"],
                       1 if row["recurrente"] == "Si" else 0,
                       row.get("notas", "")))
            count += 1

    conn.commit()
    print(f"   ✅ {count} gastos cargados.\n")


def seed_cash_sessions(conn):
    print("🏧 Cargando Arqueos de Caja...")
    c = conn.cursor()
    csv_path = DATA_DIR / "arqueos_caja.csv"

    count = 0
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cajero = CAJERO1_ID if row["id_cajero"] == "CAJ-01" else CAJERO2_ID
            c.execute("""INSERT INTO cash_sessions (id,tenant_id,cashier_id,cashier_name,date,
                        opening_cash,sales_cash,sales_card,sales_nequi,sales_daviplata,
                        total_sales,returns,petty_cash_expenses,expected_cash,actual_cash,
                        discrepancy,open_time,close_time,notes,created_at)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))""",
                      (row["sesion_caja"], TENANT_ID, cajero, row["nombre_cajero"],
                       row["fecha"], float(row["apertura_efectivo"]),
                       float(row["ventas_efectivo"]), float(row["ventas_tarjeta"]),
                       float(row["ventas_nequi"]), float(row["ventas_daviplata"]),
                       float(row["total_ventas"]), float(row["devoluciones"]),
                       float(row["gastos_caja_menor"]), float(row["efectivo_esperado"]),
                       float(row["efectivo_contado"]), float(row["diferencia"]),
                       row["hora_apertura"], row["hora_cierre"],
                       row.get("notas", "")))
            count += 1

    conn.commit()
    print(f"   ✅ {count} sesiones de caja cargadas.\n")


def print_summary(conn):
    c = conn.cursor()
    print("=" * 60)
    print("📈 RESUMEN DE DATOS CARGADOS")
    print("=" * 60)

    tables = [
        ("pharmacies", "Farmacia"),
        ("users", "Usuarios"),
        ("categories", "Categorías"),
        ("products", "Productos"),
        ("batches", "Lotes"),
        ("patients", "Pacientes"),
        ("sales", "Ventas"),
        ("sale_items", "Ítems de venta"),
        ("payments", "Pagos"),
        ("suppliers", "Proveedores"),
        ("expenses", "Gastos"),
        ("cash_sessions", "Sesiones de caja"),
    ]

    for table, label in tables:
        c.execute(f"SELECT COUNT(*) FROM {table}")
        count = c.fetchone()[0]
        print(f"  {label:.<30s} {count:>5}")

    # Some business metrics from the loaded data
    print()
    print("-" * 60)
    print("💡 MÉTRICAS DE NEGOCIO (calculadas desde datos cargados)")
    print("-" * 60)

    c.execute("SELECT SUM(grand_total) FROM sales")
    total_revenue = c.fetchone()[0] or 0
    print(f"  Ingresos totales (semana): ${total_revenue:,.0f} COP")

    c.execute("SELECT SUM(amount) FROM expenses")
    total_expenses = c.fetchone()[0] or 0
    print(f"  Gastos operativos (mes):   ${total_expenses:,.0f} COP")

    c.execute("SELECT COUNT(DISTINCT patient_id) FROM sales WHERE patient_id IS NOT NULL")
    unique_patients = c.fetchone()[0] or 0
    print(f"  Pacientes únicos atendidos: {unique_patients}")

    c.execute("SELECT payment_method, COUNT(*), SUM(amount_paid) FROM payments GROUP BY payment_method ORDER BY SUM(amount_paid) DESC")
    print(f"\n  Métodos de pago:")
    for row in c.fetchall():
        print(f"    {row[0]:.<20s} {row[1]:>3} pagos  ${row[2]:>12,.0f} COP")

    c.execute("""SELECT p.brand_name, SUM(si.quantity) as total_qty
                 FROM sale_items si JOIN products p ON si.product_id = p.id
                 GROUP BY p.brand_name ORDER BY total_qty DESC LIMIT 5""")
    print(f"\n  Top 5 productos más vendidos:")
    for i, row in enumerate(c.fetchall(), 1):
        print(f"    {i}. {row[0]} ({row[1]} unidades)")

    c.execute("""SELECT b.batch_number, p.brand_name, b.expiration_date, b.quantity
                 FROM batches b JOIN products p ON b.product_id = p.id
                 WHERE b.expiration_date < '2027-01-01' ORDER BY b.expiration_date""")
    prox = c.fetchall()
    if prox:
        print(f"\n  ⚠️  Productos próximos a vencer (antes de Ene 2027):")
        for row in prox:
            print(f"    🔴 {row[1]} (Lote: {row[0]}) — Vence: {row[2]} — Stock: {row[3]}")

    print()


def main():
    print()
    print("=" * 60)
    print("🚀 FarmaAI Data Seed — Droguería Salud Vital")
    print("   Base de datos local: SQLite")
    print(f"   Archivo: {DB_PATH}")
    print("=" * 60)
    print()

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA foreign_keys = ON")

    try:
        create_tables(conn)
        seed_tenant_and_users(conn)
        seed_categories(conn)
        seed_inventory(conn)
        seed_patients(conn)
        seed_sales(conn)
        seed_suppliers(conn)
        seed_expenses(conn)
        seed_cash_sessions(conn)
        print_summary(conn)

        print("🎉 ¡Todos los datos fueron cargados exitosamente!")
        print(f"   DB: {DB_PATH}")
        print(f"   Tamaño: {DB_PATH.stat().st_size / 1024:.1f} KB")
        print()

    finally:
        conn.close()


if __name__ == "__main__":
    main()
