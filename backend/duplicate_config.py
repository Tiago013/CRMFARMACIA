import sqlite3
import uuid

conn = sqlite3.connect("farmaai_local.db")
c = conn.cursor()

c.execute("SELECT * FROM integration_configs WHERE tenant_id = 'tenant_123' AND provider = 'odoo'")
row = c.fetchone()
if row:
    # id, tenant_id, provider, url, username, encrypted_api_key, db_name, is_active, created_at, updated_at
    c.execute("""
        INSERT INTO integration_configs (id, tenant_id, provider, url, db_name, username, encrypted_api_key, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (str(uuid.uuid4()), "211e3e3d-10bf-4092-8897-6290aa6dc17d", row[2], row[3], row[4], row[5], row[6], row[7], row[8]))
    conn.commit()
    print("Duplicated config for new tenant_id.")
else:
    print("No config found for tenant_123")
conn.close()
