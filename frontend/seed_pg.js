const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres:Y%212msP_.Vtqtd67@db.bvxkcwjnsobhufvowgsb.supabase.co:5432/postgres",
});

async function main() {
  await client.connect();
  console.log('Connected to Supabase via pg');

  // 1. Ensure Pharmacy exists
  let res = await client.query('SELECT id FROM "pharmacies" LIMIT 1');
  let pharmacyId;
  if (res.rows.length === 0) {
    const insertPharm = await client.query('INSERT INTO "pharmacies" (id, name, updated_at) VALUES (gen_random_uuid(), $1, NOW()) RETURNING id', ['FarmaAI Default Pharmacy']);
    pharmacyId = insertPharm.rows[0].id;
    console.log('Created pharmacy:', pharmacyId);
  } else {
    pharmacyId = res.rows[0].id;
    console.log('Using pharmacy:', pharmacyId);
  }

  // 2. Add 25 products
  const products = [
    { brand_name: 'Dolex Forte', sku: 'MED-001', unit_price: 14500, cost_price: 9000, active_ingredient: 'Acetaminofén, Cafeína' },
    { brand_name: 'Advil Max', sku: 'MED-002', unit_price: 18000, cost_price: 12000, active_ingredient: 'Ibuprofeno' },
    { brand_name: 'Buscapina Compositum', sku: 'MED-003', unit_price: 22000, cost_price: 15000, active_ingredient: 'Hioscina, Ibuprofeno' },
    { brand_name: 'Noxpirin Plus', sku: 'MED-004', unit_price: 15500, cost_price: 10000, active_ingredient: 'Acetaminofén, Cetirizina' },
    { brand_name: 'Sevedol', sku: 'MED-005', unit_price: 16000, cost_price: 11000, active_ingredient: 'Ibuprofeno, Acetaminofén, Cafeína' },
    { brand_name: 'Loratadina 10mg (Genérico)', sku: 'MED-006', unit_price: 5000, cost_price: 2000, active_ingredient: 'Loratadina' },
    { brand_name: 'Desloratadina 5mg', sku: 'MED-007', unit_price: 28000, cost_price: 18000, active_ingredient: 'Desloratadina' },
    { brand_name: 'Omeprazol 20mg (Genérico)', sku: 'MED-008', unit_price: 6500, cost_price: 3000, active_ingredient: 'Omeprazol' },
    { brand_name: 'Esomeprazol 40mg', sku: 'MED-009', unit_price: 45000, cost_price: 30000, active_ingredient: 'Esomeprazol' },
    { brand_name: 'Gaviscon Doble Acción', sku: 'MED-010', unit_price: 35000, cost_price: 25000, active_ingredient: 'Alginato de sodio' },
    { brand_name: 'Vitamina C 1g (Cebión)', sku: 'MED-011', unit_price: 19500, cost_price: 13000, active_ingredient: 'Ácido Ascórbico' },
    { brand_name: 'Ensure Advance', sku: 'MED-012', unit_price: 85000, cost_price: 70000, active_ingredient: 'Suplemento Nutricional' },
    { brand_name: 'Losartán 50mg (Genérico)', sku: 'MED-013', unit_price: 8000, cost_price: 3500, active_ingredient: 'Losartán potásico' },
    { brand_name: 'Amlodipino 5mg (Genérico)', sku: 'MED-014', unit_price: 7500, cost_price: 3000, active_ingredient: 'Amlodipino' },
    { brand_name: 'Metformina 850mg (Genérico)', sku: 'MED-015', unit_price: 9000, cost_price: 4000, active_ingredient: 'Metformina' },
    { brand_name: 'Azitromicina 500mg', sku: 'MED-016', unit_price: 25000, cost_price: 15000, active_ingredient: 'Azitromicina' },
    { brand_name: 'Amoxicilina 500mg', sku: 'MED-017', unit_price: 12000, cost_price: 6000, active_ingredient: 'Amoxicilina' },
    { brand_name: 'Diclofenaco Gel 1%', sku: 'MED-018', unit_price: 14000, cost_price: 8000, active_ingredient: 'Diclofenaco' },
    { brand_name: 'Voltaren Emulgel', sku: 'MED-019', unit_price: 32000, cost_price: 22000, active_ingredient: 'Diclofenaco Dietilamonio' },
    { brand_name: 'Lágrimas Artificiales (Systane)', sku: 'MED-020', unit_price: 45000, cost_price: 32000, active_ingredient: 'Polietilenglicol' },
    { brand_name: 'Salbutamol Inhalador', sku: 'MED-021', unit_price: 18000, cost_price: 10000, active_ingredient: 'Salbutamol' },
    { brand_name: 'Pedialyte Zinc', sku: 'MED-022', unit_price: 12500, cost_price: 8500, active_ingredient: 'Sales de rehidratación' },
    { brand_name: 'Smecta', sku: 'MED-023', unit_price: 24000, cost_price: 16000, active_ingredient: 'Diosmectita' },
    { brand_name: 'Enterogermina', sku: 'MED-024', unit_price: 38000, cost_price: 28000, active_ingredient: 'Bacillus clausii' },
    { brand_name: 'Sildenafil 50mg (Genérico)', sku: 'MED-025', unit_price: 15000, cost_price: 5000, active_ingredient: 'Sildenafil' },
  ];

  let count = 0;
  for (const p of products) {
    const check = await client.query('SELECT id FROM "products" WHERE sku = $1', [p.sku]);
    if (check.rows.length === 0) {
      const insertProd = await client.query(`
        INSERT INTO "products" (id, tenant_id, brand_name, sku, unit_price, cost_price, active_ingredient, min_stock, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id
      `, [pharmacyId, p.brand_name, p.sku, p.unit_price, p.cost_price, p.active_ingredient, 5]);
      
      const prodId = insertProd.rows[0].id;
      
      // Batch
      const qty = Math.floor(Math.random() * 50) + 10;
      await client.query(`
        INSERT INTO "batches" (id, tenant_id, product_id, batch_number, expiration_date, quantity)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
      `, [pharmacyId, prodId, `LOTE-${p.sku}-2026`, '2026-12-31', qty]);
      
      console.log('Added', p.brand_name);
      count++;
    }
  }

  console.log('Successfully added', count, 'products!');
  await client.end();
}

main().catch(console.error);
