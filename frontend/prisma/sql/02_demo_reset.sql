-- Farmacia demo separada + restauración nocturna.
-- Ejecutar UNA VEZ en Supabase → SQL Editor, después de 01_money_decimal.sql.
--
-- 1. Crea la farmacia "Droguería Demo FarmaAI" y mueve allí a demo@farmaai.com.
-- 2. Guarda en el esquema demo_template una foto de los datos actuales de la
--    farmacia principal (la del administrador, que no se toca).
-- 3. Crea demo_template.reset_demo(): borra los datos de la farmacia demo y los
--    vuelve a copiar desde la foto, con IDs nuevos y fechas desplazadas a hoy.
--    La llama cada noche /api/cron/reset-demo.

begin;

create schema if not exists demo_template;
revoke all on schema demo_template from public, anon, authenticated;

create table demo_template.config (
  id             int primary key default 1 check (id = 1),
  demo_tenant_id text not null,
  demo_email     text not null,
  demo_password  text not null,   -- ya es pública en el README
  snapshot_date  date not null,
  last_reset_at  timestamp
);

-- Farmacia demo, con la misma configuración (logo, nombre comercial) que la principal
with source as (select * from public.pharmacies order by created_at limit 1),
demo as (
  insert into public.pharmacies (id, name, tax_id, address, phone, plan_type, status, settings, created_at, updated_at)
  select gen_random_uuid()::text, 'Droguería Demo FarmaAI', tax_id, address, phone, plan_type, status, settings, now(), now()
  from source
  returning id
)
insert into demo_template.config (demo_tenant_id, demo_email, demo_password, snapshot_date)
select id, 'demo@farmaai.com', '123456', current_date from demo;

-- Foto de la farmacia principal
create temporary table src on commit drop as
  select id from public.pharmacies where id <> (select demo_tenant_id from demo_template.config) order by created_at limit 1;

create table demo_template.categories              as select * from public.categories              where tenant_id = (select id from src);
create table demo_template.suppliers               as select * from public.suppliers               where tenant_id = (select id from src);
create table demo_template.products                as select * from public.products                where tenant_id = (select id from src);
create table demo_template.batches                 as select * from public.batches                 where tenant_id = (select id from src);
create table demo_template.patients                as select * from public.patients                where tenant_id = (select id from src);
create table demo_template.patient_timeline_events as select * from public.patient_timeline_events where tenant_id = (select id from src);
create table demo_template.sales                   as select * from public.sales                   where tenant_id = (select id from src);
create table demo_template.sale_items              as select * from public.sale_items              where sale_id in (select id from demo_template.sales);
create table demo_template.payments                as select * from public.payments                where sale_id in (select id from demo_template.sales);
create table demo_template.purchases               as select * from public.purchases               where tenant_id = (select id from src);
create table demo_template.purchase_items          as select * from public.purchase_items          where purchase_id in (select id from demo_template.purchases);
create table demo_template.stock_movements         as select * from public.stock_movements         where tenant_id = (select id from src);
create table demo_template.expense_categories      as select * from public.expense_categories      where tenant_id = (select id from src);
create table demo_template.expenses                as select * from public.expenses                where tenant_id = (select id from src);
create table demo_template.whatsapp_templates      as select * from public.whatsapp_templates      where tenant_id = (select id from src);
create table demo_template.whatsapp_automations    as select * from public.whatsapp_automations    where tenant_id = (select id from src);

-- Fecha de referencia = última venta de la foto: al restaurar, esa venta cae en "hoy"
-- y los gráficos de los últimos días nunca quedan vacíos
update demo_template.config set snapshot_date = (select max(created_at)::date from demo_template.sales);

-- La demo es pública: teléfonos, documentos y correos claramente ficticios
with t as (select id, row_number() over (order by id) n from demo_template.patients where phone like '+%')
update demo_template.patients p set phone = '30099900' || lpad(t.n::text, 2, '0'), document_id = '1099900' || lpad(t.n::text, 3, '0')
from t where p.id = t.id;
update demo_template.suppliers set email = split_part(email, '@', 1) || '@example.com' where email is not null;

-- Tres lotes que vencen pronto (6, 14 y 22 días después de la fecha de referencia),
-- para que el recorrido muestre la alerta "PRÓXIMO A VENCER"
with pick as (
  select b.id, row_number() over (order by b.quantity desc, b.id) n
  from demo_template.batches b
  where b.quantity >= 10
    and b.expiration_date > (select snapshot_date from demo_template.config) + 30
    and (select count(*) from demo_template.batches x where x.product_id = b.product_id and x.quantity > 0) = 1
  limit 3)
update demo_template.batches b set expiration_date = (select snapshot_date from demo_template.config) + (array[6,14,22])[pick.n]
from pick where b.id = pick.id;

-- El esquema no se expone por la API, pero se activa RLS igual (defensa en profundidad)
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'demo_template' loop
    execute format('alter table demo_template.%I enable row level security', t);
  end loop;
end $$;

-- ID nuevo y estable para cada fila copiada: el mismo origen da siempre el mismo ID
create function demo_template.remap(tenant text, old_id text) returns text
language sql immutable as $$
  select case when old_id is null then null else md5(tenant || ':' || old_id)::uuid::text end
$$;

create function demo_template.reset_demo() returns jsonb
language plpgsql
set search_path = public, demo_template
as $$
declare
  cfg  demo_template.config;
  t    text;
  d    int;              -- días a desplazar
  s    interval;
begin
  select * into cfg from demo_template.config where id = 1;
  t := cfg.demo_tenant_id;
  d := current_date - cfg.snapshot_date;
  s := make_interval(days => d);

  -- 1. Borrar lo que haya en la farmacia demo (hijos primero)
  delete from payments       where sale_id in (select id from sales where tenant_id = t);
  delete from sale_items     where sale_id in (select id from sales where tenant_id = t);
  delete from sales          where tenant_id = t;
  delete from purchase_items where purchase_id in (select id from purchases where tenant_id = t);
  delete from purchases      where tenant_id = t;
  delete from stock_movements where tenant_id = t;
  delete from batches        where tenant_id = t;
  delete from patient_timeline_events where tenant_id = t;
  delete from patients       where tenant_id = t;
  delete from products       where tenant_id = t;
  delete from categories     where tenant_id = t;
  delete from suppliers      where tenant_id = t;
  delete from expenses       where tenant_id = t;
  delete from expense_categories where tenant_id = t;
  delete from whatsapp_automations where tenant_id = t;
  delete from whatsapp_templates   where tenant_id = t;

  -- 2. Copiar la foto con IDs nuevos y fechas movidas al día de hoy
  insert into categories (id, tenant_id, name, description)
    select remap(t, id), t, name, description from demo_template.categories;

  insert into suppliers (id, tenant_id, name, tax_id, email, phone, address, status, created_at, updated_at)
    select remap(t, id), t, name, tax_id, email, phone, address, status, created_at + s, updated_at + s from demo_template.suppliers;

  insert into products (id, tenant_id, category_id, supplier_id, sku, barcode, brand_name, active_ingredient, presentation, unit_price, cost_price, min_stock, created_at, updated_at)
    select remap(t, id), t, remap(t, category_id), remap(t, supplier_id), sku, barcode, brand_name, active_ingredient, presentation, unit_price, cost_price, min_stock, created_at + s, updated_at + s
    from demo_template.products;

  insert into batches (id, tenant_id, product_id, batch_number, expiration_date, quantity)
    select remap(t, id), t, remap(t, product_id), batch_number, expiration_date + d, quantity from demo_template.batches;

  insert into patients (id, tenant_id, first_name, last_name, phone, document_id, status, last_purchase_date, preferences, tags, created_at, updated_at,
                        address, allergies, birth_date, blood_group, email, emergency_contact_name, emergency_contact_phone, eps, medical_notes)
    select remap(t, id), t, first_name, last_name, phone, document_id, status, last_purchase_date + s, preferences, tags, created_at + s, updated_at + s,
           address, allergies, birth_date, blood_group, email, emergency_contact_name, emergency_contact_phone, eps, medical_notes
    from demo_template.patients;

  insert into patient_timeline_events (id, tenant_id, patient_id, user_id, event_type, event_data, created_at)
    select remap(t, id), t, remap(t, patient_id), user_id, event_type, event_data, created_at + s from demo_template.patient_timeline_events;

  insert into sales (id, tenant_id, patient_id, cashier_id, subtotal, tax_total, discount_total, grand_total, status, payment_method, created_at, updated_at)
    select remap(t, id), t, remap(t, patient_id), cashier_id, subtotal, tax_total, discount_total, grand_total, status, payment_method, created_at + s, updated_at + s
    from demo_template.sales;

  insert into sale_items (id, sale_id, product_id, batch_id, quantity, unit_price, subtotal, tax_rate, tax_amount, total)
    select remap(t, id), remap(t, sale_id), remap(t, product_id), remap(t, batch_id), quantity, unit_price, subtotal, tax_rate, tax_amount, total
    from demo_template.sale_items;

  insert into payments (id, sale_id, amount, payment_method, reference_code, created_at)
    select remap(t, id), remap(t, sale_id), amount, payment_method, reference_code, created_at + s from demo_template.payments;

  insert into purchases (id, tenant_id, supplier_id, user_id, invoice_number, total_amount, status, created_at, updated_at)
    select remap(t, id), t, remap(t, supplier_id), user_id, invoice_number, total_amount, status, created_at + s, updated_at + s from demo_template.purchases;

  insert into purchase_items (id, purchase_id, product_id, batch_number, expiration_date, quantity, unit_cost, total_cost)
    select remap(t, id), remap(t, purchase_id), remap(t, product_id), batch_number, expiration_date + d, quantity, unit_cost, total_cost
    from demo_template.purchase_items;

  insert into stock_movements (id, tenant_id, product_id, batch_id, user_id, movement_type, quantity, reference_id, created_at)
    select remap(t, id), t, remap(t, product_id), remap(t, batch_id), user_id, movement_type, quantity, remap(t, reference_id), created_at + s
    from demo_template.stock_movements;

  insert into expense_categories (id, tenant_id, name, description, color, created_at, updated_at)
    select remap(t, id), t, name, description, color, created_at + s, updated_at + s from demo_template.expense_categories;

  insert into expenses (id, tenant_id, category_id, user_id, amount, date, description, reference_code, status, created_at, updated_at)
    select remap(t, id), t, remap(t, category_id), user_id, amount, date + d, description, reference_code, status, created_at + s, updated_at + s
    from demo_template.expenses;

  insert into whatsapp_templates (id, tenant_id, name, content, variables, is_active, created_at, updated_at)
    select remap(t, id), t, name, content, variables, is_active, created_at + s, updated_at + s from demo_template.whatsapp_templates;

  insert into whatsapp_automations (id, tenant_id, trigger_event, template_id, is_active, created_at, updated_at)
    select remap(t, id), t, trigger_event, remap(t, template_id), is_active, created_at + s, updated_at + s from demo_template.whatsapp_automations;

  -- 3. La cuenta demo vuelve a su farmacia, rol y contraseña aunque alguien los cambie
  update user_profiles set tenant_id = t, role = 'cajero', updated_at = now()
   where auth_id in (select id::text from auth.users where email = cfg.demo_email);
  update auth.users set encrypted_password = extensions.crypt(cfg.demo_password, extensions.gen_salt('bf')), updated_at = now()
   where email = cfg.demo_email;

  update demo_template.config set last_reset_at = now() where id = 1;

  return jsonb_build_object(
    'tenant', t,
    'days_shifted', d,
    'sales', (select count(*) from sales where tenant_id = t),
    'patients', (select count(*) from patients where tenant_id = t),
    'products', (select count(*) from products where tenant_id = t)
  );
end;
$$;

revoke all on function demo_template.reset_demo() from public, anon, authenticated;
revoke all on function demo_template.remap(text, text) from public, anon, authenticated;

commit;

-- Primera restauración: llena la farmacia demo y mueve la cuenta demo a ella
select demo_template.reset_demo();
