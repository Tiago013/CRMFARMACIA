import asyncio
import sqlite3
import sys
import os
import uuid

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.modules.integrations.odoo.service import OdooIntegrationService
from app.core.local_db import DB_PATH

async def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Crear un paciente de prueba en la base de datos local
    test_id = "test_" + str(uuid.uuid4())[:8]
    cursor.execute("""
        INSERT INTO patients (id, tenant_id, first_name, last_name, document_id, phone)
        VALUES (?, 'tenant_123', 'Carlos', 'Integracion Directa', '8888888', '3109998877')
    """, (test_id,))
    conn.commit()
    conn.close()
    
    print(f"Paciente local creado con ID: {test_id}")
    
    # 2. Sincronizarlo con Odoo
    print("Enviando paciente a Odoo usando el Worker Service...")
    service = OdooIntegrationService('tenant_123')
    
    try:
        await service.sync_patient(test_id)
        
        # Verificar que se actualizó el ID de Odoo
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT odoo_partner_id FROM patients WHERE id = ?", (test_id,))
        patient = cursor.fetchone()
        conn.close()
        
        print(f"✅ Éxito! Paciente sincronizado. Odoo Partner ID: {patient['odoo_partner_id']}")
    except Exception as e:
        print(f"❌ Error sincronizando: {e}")

if __name__ == "__main__":
    asyncio.run(main())
