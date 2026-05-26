import sqlite3
import argparse
import sys
import os

# Add app to path to import security
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.core.security import encrypt_api_key
from app.core.local_db import DB_PATH

def configure_odoo(tenant_id: str, url: str, db: str, username: str, api_key: str):
    """
    Guarda las credenciales de Odoo de forma segura en la base de datos de FarmaAI.
    """
    encrypted_key = encrypt_api_key(api_key)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if config exists
        cursor.execute("SELECT id FROM integration_configs WHERE tenant_id = ? AND provider = 'odoo'", (tenant_id,))
        existing = cursor.fetchone()
        
        if existing:
            cursor.execute("""
                UPDATE integration_configs 
                SET url = ?, db_name = ?, username = ?, encrypted_api_key = ?, is_active = 1
                WHERE id = ?
            """, (url, db, username, encrypted_key, existing[0]))
            print(f"✅ Configuración de Odoo ACTUALIZADA para el tenant {tenant_id}")
        else:
            import uuid
            cursor.execute("""
                INSERT INTO integration_configs (id, tenant_id, provider, url, db_name, username, encrypted_api_key)
                VALUES (?, ?, 'odoo', ?, ?, ?, ?)
            """, (str(uuid.uuid4()), tenant_id, url, db, username, encrypted_key))
            print(f"✅ Configuración de Odoo CREADA exitosamente para el tenant {tenant_id}")
            
        conn.commit()
    except Exception as e:
        print(f"❌ Error al guardar la configuración: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Configura la integración de Odoo para un Tenant")
    parser.add_argument("--tenant", required=True, help="El ID de la farmacia (ej. tenant_123)")
    parser.add_argument("--url", required=True, help="URL de Odoo (ej. https://mifarmacia.odoo.com)")
    parser.add_argument("--db", required=True, help="Nombre de la base de datos de Odoo")
    parser.add_argument("--user", required=True, help="Usuario o Email de Odoo")
    parser.add_argument("--apikey", required=True, help="API Key de Odoo")
    
    args = parser.parse_args()
    configure_odoo(args.tenant, args.url, args.db, args.user, args.apikey)
