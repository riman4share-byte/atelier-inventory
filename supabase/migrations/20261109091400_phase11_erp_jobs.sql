-- Atelier Inventory – Phase 11: ERPNext job queue and sync log.

create table if not exists public.erp_jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  payload jsonb not null default '{}',
  status text not null default 'pending',
  attempts int not null default 0,
  last_error text,
  run_after timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists erp_jobs_status_idx on public.erp_jobs (status, run_after);

create table if not exists public.erp_sync_log (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.erp_jobs (id) on delete set null,
  entity text not null,
  entity_id uuid,
  action text not null,
  status text not null,
  message text,
  created_at timestamptz not null default now()
);

alter table public.erp_jobs enable row level security;
alter table public.erp_sync_log enable row level security;

drop policy if exists "erp_jobs: staff read" on public.erp_jobs;
drop policy if exists "erp_jobs: staff insert" on public.erp_jobs;
create policy "erp_jobs: staff read" on public.erp_jobs for select
  to authenticated using (public.is_staff_or_admin());
create policy "erp_jobs: staff insert" on public.erp_jobs for insert
  to authenticated with check (public.is_staff_or_admin());

drop policy if exists "erp_sync_log: staff read" on public.erp_sync_log;
create policy "erp_sync_log: staff read" on public.erp_sync_log for select
  to authenticated using (public.is_staff_or_admin());

grant all on public.erp_jobs to service_role;
grant all on public.erp_sync_log to service_role;
