-- Montos de Float (float8) a NUMERIC exacto. Ejecutar en Supabase → SQL Editor
-- DESPUÉS de desplegar el código que ya declara estos campos como Decimal.
-- Respaldo previo: esquema backup_20261102 (copia de las 6 tablas).

begin;

alter table public.sales
  alter column subtotal       type numeric(12,2) using round(subtotal::numeric, 2),
  alter column tax_total      type numeric(12,2) using round(tax_total::numeric, 2),
  alter column discount_total type numeric(12,2) using round(discount_total::numeric, 2),
  alter column grand_total    type numeric(12,2) using round(grand_total::numeric, 2);

alter table public.sale_items
  alter column unit_price type numeric(12,2) using round(unit_price::numeric, 2),
  alter column subtotal   type numeric(12,2) using round(subtotal::numeric, 2),
  alter column tax_rate   type numeric(5,4)  using round(tax_rate::numeric, 4),
  alter column tax_amount type numeric(12,2) using round(tax_amount::numeric, 2),
  alter column total      type numeric(12,2) using round(total::numeric, 2);

alter table public.payments
  alter column amount type numeric(12,2) using round(amount::numeric, 2);

alter table public.purchases
  alter column total_amount type numeric(12,2) using round(total_amount::numeric, 2);

alter table public.purchase_items
  alter column unit_cost  type numeric(12,2) using round(unit_cost::numeric, 2),
  alter column total_cost type numeric(12,2) using round(total_cost::numeric, 2);

alter table public.expenses
  alter column amount type numeric(12,2) using round(amount::numeric, 2);

commit;

-- Verificación: la diferencia contra el respaldo debe ser 0 (o centavos por redondeo)
select 'sales' as tabla,
       (select sum(grand_total) from public.sales) as ahora,
       (select round(sum(grand_total)::numeric, 2) from backup_20261102.sales) as antes
union all
select 'payments', (select sum(amount) from public.payments), (select round(sum(amount)::numeric, 2) from backup_20261102.payments)
union all
select 'purchases', (select sum(total_amount) from public.purchases), (select round(sum(total_amount)::numeric, 2) from backup_20261102.purchases)
union all
select 'expenses', (select sum(amount) from public.expenses), (select round(sum(amount)::numeric, 2) from backup_20261102.expenses);
