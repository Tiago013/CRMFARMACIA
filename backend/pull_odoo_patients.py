import asyncio
import sqlite3
import uuid
import sys
import json

sys.path.append('c:/Users/santi/Downloads/CRMFARMAIA/backend')
from app.modules.integrations.odoo.service import OdooIntegrationService

async def sync():
    tenant_id = 'tenant_123'
    service = OdooIntegrationService(tenant_id)
    
    print('Fetching from Odoo...')
    # Use transport from service
    if not service.transport.uid:
        await service.transport.authenticate()
        
    partners = await service.transport.execute_kw('res.partner', 'search_read', [[('active', '=', True)]], {'fields': ['id', 'name', 'phone', 'vat', 'comment']})
    print(f'Found {len(partners)} partners in Odoo.')
    
    conn = sqlite3.connect('farmaai_local.db')
    c = conn.cursor()
    
    for p in partners:
        name_parts = p.get('name', '').split(' ', 1)
        first_name = name_parts[0] if name_parts else ''
        last_name = name_parts[1] if len(name_parts) > 1 else ''
        phone = p.get('phone') or ''
        vat = p.get('vat') or ''
        odoo_id = p['id']
        
        # Check if exists in sqlite by odoo_partner_id
        c.execute('SELECT id FROM patients WHERE odoo_partner_id = ? AND tenant_id = ?', (str(odoo_id), tenant_id))
        row = c.fetchone()
        
        if row:
            c.execute('UPDATE patients SET first_name=?, last_name=?, phone=?, document_id=? WHERE id=?', (first_name, last_name, phone, vat, row[0]))
        else:
            # Check by VAT
            if vat:
                c.execute('SELECT id FROM patients WHERE document_id = ? AND tenant_id = ?', (vat, tenant_id))
                row2 = c.fetchone()
                if row2:
                    c.execute('UPDATE patients SET first_name=?, last_name=?, phone=?, odoo_partner_id=? WHERE id=?', (first_name, last_name, phone, str(odoo_id), row2[0]))
                    continue
            
            # Create new
            new_id = str(uuid.uuid4())
            c.execute('INSERT INTO patients (id, tenant_id, first_name, last_name, phone, document_id, odoo_partner_id, status, preferences, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                     (new_id, tenant_id, first_name, last_name, phone, vat, str(odoo_id), 'activo', '{}', '[]'))
                     
    conn.commit()
    conn.close()
    print('Synced all Odoo contacts to FarmaAI local DB!')

asyncio.run(sync())
