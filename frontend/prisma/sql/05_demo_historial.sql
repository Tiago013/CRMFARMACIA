-- Historial de ventas de la demo: 16 semanas en vez de 1 mes.
-- Ejecutar UNA VEZ en Supabase → SQL Editor, después de 04_demo_categorias.sql.
--
-- La foto demo solo tenía ~8 ventas diarias durante un mes: el pronóstico no
-- tenía con qué aprender el patrón semanal (error de la última semana de 140–
-- 300 %) y 55 de 101 productos pronosticaban 0. Esto agrega a la foto ventas de
-- mostrador (sin paciente, para no alterar el CRM) hasta llegar a ~16 diarias,
-- con un patrón por día de la semana, un leve crecimiento y popularidad por
-- producto. Cada venta trae sus ítems, su pago y sus movimientos SALE_OUT,
-- igual que las del punto de venta. La fecha de referencia no cambia.
--
-- Generación con semilla fija: volver a correrlo desde cero da el mismo
-- historial. Al final restaura la demo para que se vea de inmediato.

begin;

-- Solo una vez: si la foto ya tiene ventas de hace más de 40 días, ya se amplió
do $$ begin
  if (select min(created_at) from demo_template.sales) < (select snapshot_date - 40 from demo_template.config) then
    raise exception 'El historial de la demo ya se amplió';
  end if;
end $$;

select setseed(0.2026);

-- Popularidad: los que ya se vendían más siguen arriba; peso 1/rango^0,8
create temporary table g_prod on commit drop as
with ranked as (
  select p.id product_id, p.unit_price,
         row_number() over (order by count(i.id) desc, md5(p.id)) rnk
  from demo_template.products p
  left join demo_template.sale_items i on i.product_id = p.id
  group by p.id, p.unit_price
),
weighted as (
  select *, 1 / power(rnk, 0.8) w from ranked
)
select w.product_id, w.unit_price,
       (select b.id from demo_template.batches b where b.product_id = w.product_id order by b.quantity desc, b.id limit 1) batch_id,
       coalesce(sum(w.w) over (order by w.rnk rows between unbounded preceding and 1 preceding), 0) / sum(w.w) over () lo,
       sum(w.w) over (order by w.rnk) / sum(w.w) over () hi
from weighted w;

-- Días a generar: 16 semanas hasta el día anterior a la fecha de referencia
-- (ese día conserva solo sus ventas reales, así nada queda en el futuro)
create temporary table g_day on commit drop as
with cfg as (select snapshot_date snap from demo_template.config),
days as (
  select d::date dia, row_number() over (order by d) - 1 idx
  from cfg, generate_series(snap - 112, snap - 1, interval '1 day') d
),
existing as (
  select (created_at - interval '5 hour')::date dia, count(*) n
  from demo_template.sales group by 1
)
select days.dia,
       greatest(0, round(
         16
         * (array[1.00, 0.95, 0.95, 1.00, 1.15, 1.30, 0.60])[extract(isodow from days.dia)::int]  -- lun … dom
         * (0.88 + 0.24 * days.idx / 111.0)                                                       -- crecimiento suave
         * (0.85 + 0.30 * random())
       ) - coalesce(e.n, 0))::int n_sales
from days left join existing e on e.dia = days.dia;

-- Ventas: hora local 8:00–19:00 (UTC−5 → 13:00–24:00 en la base)
create temporary table g_sale on commit drop as
select gen_random_uuid()::text id,
       (d.dia + interval '13 hour' + random() * interval '10 hour 59 minutes')::timestamp created_at,
       case when random() < 0.5 then 'cash' else 'card' end payment_method,
       case when random() < 0.6 then '0301e2c0-121b-4108-a28b-f163a76fd942' else 'USER-ADMIN-1' end cashier_id,
       1 + floor(random() * 4)::int n_items
from g_day d, generate_series(1, d.n_sales);

-- Ítems: producto por sorteo ponderado, cantidad 1 (60 %), 2 (30 %) o 3 (10 %)
create temporary table g_item on commit drop as
with draws as (
  select s.id sale_id, k, random() r, random() q
  from g_sale s, generate_series(1, s.n_items) k
),
picked as (
  select distinct on (d.sale_id, p.product_id)
         d.sale_id, p.product_id, p.batch_id, p.unit_price,
         case when d.q < 0.6 then 1 when d.q < 0.9 then 2 else 3 end quantity
  from draws d join g_prod p on d.r >= p.lo and d.r < p.hi
  order by d.sale_id, p.product_id, d.k
)
select gen_random_uuid()::text id, sale_id, product_id, batch_id, quantity, unit_price,
       quantity * unit_price subtotal, 0.19 tax_rate,
       round(quantity * unit_price * 0.19, 2) tax_amount,
       quantity * unit_price + round(quantity * unit_price * 0.19, 2) total
from picked;

insert into demo_template.sales (id, tenant_id, patient_id, cashier_id, subtotal, tax_total, discount_total, grand_total, status, payment_method, created_at, updated_at)
select s.id, (select tenant_id from demo_template.sales limit 1), null, s.cashier_id,
       sum(i.subtotal), sum(i.tax_amount), 0, sum(i.total), 'COMPLETED', s.payment_method, s.created_at, s.created_at
from g_sale s join g_item i on i.sale_id = s.id
group by s.id, s.cashier_id, s.payment_method, s.created_at;

insert into demo_template.sale_items (id, sale_id, product_id, batch_id, quantity, unit_price, subtotal, tax_rate, tax_amount, total)
select id, sale_id, product_id, batch_id, quantity, unit_price, subtotal, tax_rate, tax_amount, total from g_item;

insert into demo_template.payments (id, sale_id, amount, payment_method, reference_code, created_at)
select gen_random_uuid()::text, s.id, s.grand_total, s.payment_method, null, s.created_at
from demo_template.sales s join g_sale g on g.id = s.id;

insert into demo_template.stock_movements (id, tenant_id, product_id, batch_id, user_id, movement_type, quantity, reference_id, created_at)
select gen_random_uuid()::text, s.tenant_id, i.product_id, i.batch_id, s.cashier_id, 'SALE_OUT', i.quantity, s.id, s.created_at
from g_item i join demo_template.sales s on s.id = i.sale_id;

commit;

select demo_template.reset_demo();
