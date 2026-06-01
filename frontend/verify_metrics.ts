import { Client } from 'pg';

async function main() {
  const connectionString = "postgresql://postgres.bvxkcwjnsobhufvowgsb:Y%212msP_.Vtqtd67@aws-1-us-east-2.pooler.supabase.com:6543/postgres";
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("Connected to DB!");

  // ALL TIME
  const revRes = await client.query(`SELECT SUM(grand_total) as total FROM "sales" WHERE status = 'COMPLETED'`);
  const totalRevenue = parseFloat(revRes.rows[0].total) || 0;

  const cogsRes = await client.query(`
    SELECT SUM(si.quantity * CAST(p.cost_price AS numeric)) as total 
    FROM "sale_items" si
    JOIN "sales" s ON s.id = si.sale_id
    JOIN "products" p ON p.id = si.product_id
    WHERE s.status = 'COMPLETED'
  `);
  const cogs = parseFloat(cogsRes.rows[0].total) || 0;

  const opexRes = await client.query(`
    SELECT SUM(e.amount) as total
    FROM "expenses" e
    JOIN "expense_categories" c ON c.id = e.category_id
    WHERE e.status = 'COMPLETED' AND c.name NOT IN ('Compras de Inventario', 'Compras a Proveedores')
  `);
  const opex = parseFloat(opexRes.rows[0].total) || 0;

  const invRes = await client.query(`
    SELECT SUM(e.amount) as total
    FROM "expenses" e
    JOIN "expense_categories" c ON c.id = e.category_id
    WHERE e.status = 'COMPLETED' AND c.name IN ('Compras de Inventario', 'Compras a Proveedores')
  `);
  const inv = parseFloat(invRes.rows[0].total) || 0;

  console.log("---- HISTÓRICO (Todo el tiempo) ----");
  console.log(`Ingresos: $${totalRevenue.toLocaleString('es-CO')}`);
  console.log(`COGS (Costo de ventas): -$${cogs.toLocaleString('es-CO')}`);
  console.log(`OPEX (Gastos operativos): -$${opex.toLocaleString('es-CO')}`);
  console.log(`Compras Inventario (Activos): -$${inv.toLocaleString('es-CO')}`);
  const netProfit = totalRevenue - cogs - opex;
  console.log(`Utilidad Neta: $${netProfit.toLocaleString('es-CO')}`);

  // 7 DAYS
  console.log("\\n---- ÚLTIMOS 7 DÍAS ----");
  const rev7Res = await client.query(`SELECT SUM(grand_total) as total FROM "sales" WHERE status = 'COMPLETED' AND created_at >= NOW() - INTERVAL '7 days'`);
  const totalRevenue7 = parseFloat(rev7Res.rows[0].total) || 0;

  const cogs7Res = await client.query(`
    SELECT SUM(si.quantity * CAST(p.cost_price AS numeric)) as total 
    FROM "sale_items" si
    JOIN "sales" s ON s.id = si.sale_id
    JOIN "products" p ON p.id = si.product_id
    WHERE s.status = 'COMPLETED' AND s.created_at >= NOW() - INTERVAL '7 days'
  `);
  const cogs7 = parseFloat(cogs7Res.rows[0].total) || 0;

  const opex7Res = await client.query(`
    SELECT SUM(e.amount) as total
    FROM "expenses" e
    JOIN "expense_categories" c ON c.id = e.category_id
    WHERE e.status = 'COMPLETED' AND e.date >= NOW() - INTERVAL '7 days' AND c.name NOT IN ('Compras de Inventario', 'Compras a Proveedores')
  `);
  const opex7 = parseFloat(opex7Res.rows[0].total) || 0;

  const inv7Res = await client.query(`
    SELECT SUM(e.amount) as total
    FROM "expenses" e
    JOIN "expense_categories" c ON c.id = e.category_id
    WHERE e.status = 'COMPLETED' AND e.date >= NOW() - INTERVAL '7 days' AND c.name IN ('Compras de Inventario', 'Compras a Proveedores')
  `);
  const inv7 = parseFloat(inv7Res.rows[0].total) || 0;

  console.log(`Ingresos: $${totalRevenue7.toLocaleString('es-CO')}`);
  console.log(`COGS (Costo de ventas): -$${cogs7.toLocaleString('es-CO')}`);
  console.log(`OPEX (Gastos operativos): -$${opex7.toLocaleString('es-CO')}`);
  console.log(`Compras Inventario (Activos): -$${inv7.toLocaleString('es-CO')}`);
  const netProfit7 = totalRevenue7 - cogs7 - opex7;
  console.log(`Utilidad Neta: $${netProfit7.toLocaleString('es-CO')}`);

  await client.end();
}

main().catch(console.error);
