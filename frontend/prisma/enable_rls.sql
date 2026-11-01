-- Activa Row Level Security en todas las tablas de la app.
-- Ejecútalo en Supabase → SQL Editor después de `npx prisma db push`.
--
-- Sin políticas, los roles públicos de Supabase (anon / authenticated) no pueden
-- leer ni escribir estas tablas por la API REST. La app no se ve afectada porque
-- Prisma se conecta como `postgres`, dueño de las tablas.

ALTER TABLE public.batches                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacies              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_admins           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_automations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates      ENABLE ROW LEVEL SECURITY;
