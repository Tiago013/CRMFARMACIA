-- Productos de una venta cuyo IVA o total no cuadra con la venta.
-- Ejecutar UNA VEZ en Supabase → SQL Editor (en el aviso de RLS: "Run without RLS").
--
-- A. Ventas antiguas del seed: la venta y su pago llevan IVA del 19 %, pero sus
--    productos se guardaron con IVA 0. Se recalcula el IVA de cada producto;
--    solo si así la suma coincide con el IVA de la venta.
-- B. El POS guardaba sale_items.total sin IVA (total = subtotal). Ahora el
--    total del producto es subtotal + IVA, como en el resto de los datos.
--
-- Se corrige la farmacia real, la demo y la foto de la demo (demo_template),
-- para que la restauración nocturna no vuelva a traer el error.

begin;

-- A. IVA 0 en los productos de una venta que sí cobró IVA
with bad as (
  select s.id from public.sales s
  where s.tax_total > 0
    and (select sum(tax_amount) from public.sale_items i where i.sale_id = s.id) = 0
    and abs(s.subtotal - (select sum(subtotal) from public.sale_items i where i.sale_id = s.id)) < 0.01
    and abs(s.tax_total - (select sum(round(subtotal * 0.19, 2)) from public.sale_items i where i.sale_id = s.id)) < 0.01
)
update public.sale_items i
set tax_rate = 0.19, tax_amount = round(i.subtotal * 0.19, 2), total = i.subtotal + round(i.subtotal * 0.19, 2)
from bad where i.sale_id = bad.id;

with bad as (
  select s.id from demo_template.sales s
  where s.tax_total > 0
    and (select sum(tax_amount) from demo_template.sale_items i where i.sale_id = s.id) = 0
    and abs(s.subtotal - (select sum(subtotal) from demo_template.sale_items i where i.sale_id = s.id)) < 0.01
    and abs(s.tax_total - (select sum(round(subtotal * 0.19, 2)) from demo_template.sale_items i where i.sale_id = s.id)) < 0.01
)
update demo_template.sale_items i
set tax_rate = 0.19, tax_amount = round(i.subtotal * 0.19, 2), total = i.subtotal + round(i.subtotal * 0.19, 2)
from bad where i.sale_id = bad.id;

-- B. Total del producto sin IVA
update public.sale_items set total = subtotal + tax_amount
where tax_amount > 0 and abs(total - subtotal) < 0.01;

update demo_template.sale_items set total = subtotal + tax_amount
where tax_amount > 0 and abs(total - subtotal) < 0.01;

-- Comprobación: ninguna venta debe quedar descuadrada (si queda alguna, se deshace todo)
do $$
declare n int;
begin
  select count(*) into n from (
    select s.id from public.sales s
    where abs(s.grand_total - (select sum(total) from public.sale_items i where i.sale_id = s.id)) > 0.01
    union all
    select s.id from demo_template.sales s
    where abs(s.grand_total - (select sum(total) from demo_template.sale_items i where i.sale_id = s.id)) > 0.01
  ) x;
  if n > 0 then
    raise exception 'Quedan % ventas descuadradas; no se aplicó nada', n;
  end if;
end $$;

commit;
