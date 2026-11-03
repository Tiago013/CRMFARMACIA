-- Turnos de caja del POS (apertura y cierre con arqueo) guardados en la base,
-- en lugar del localStorage del navegador. Ejecutar en Supabase → SQL Editor.

begin;

create table if not exists public.cash_sessions (
  id                    text primary key default gen_random_uuid()::text,
  tenant_id             text not null references public.pharmacies(id) on delete cascade,
  status                text not null default 'OPEN' check (status in ('OPEN', 'CLOSED')),
  opened_by             text not null,
  opened_at             timestamp(3) not null default now(),
  opening_amount        numeric(12,2) not null,
  opening_denominations jsonb,
  closed_by             text,
  closed_at             timestamp(3),
  cash_sales            numeric(12,2),
  expected_amount       numeric(12,2),
  counted_amount        numeric(12,2),
  difference            numeric(12,2),
  closing_denominations jsonb
);

create index if not exists cash_sessions_tenant_id_status_idx on public.cash_sessions (tenant_id, status);

-- Una sola caja abierta por farmacia, aunque dos cajeros abran a la vez
create unique index if not exists cash_sessions_one_open_per_tenant
  on public.cash_sessions (tenant_id) where status = 'OPEN';

-- Igual que las demás tablas: sin acceso por la API pública de Supabase
alter table public.cash_sessions enable row level security;

commit;
