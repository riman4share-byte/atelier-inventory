-- Atelier Inventory – Phase 8: customers, movement ledger, reservations.

-- Staff-or-admin helper (RLS shorthand).
create or replace function public.is_staff_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

-- Enums
do $$ begin
  create type public.dress_location as enum ('in_atelier','with_customer','alteration','cleaning','photoshoot','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.movement_direction as enum ('out','in');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.movement_reason as enum ('rental','sale_delivery','fitting','alteration','cleaning','photoshoot','return','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.movement_source as enum ('app','erpnext');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reservation_status as enum ('active','fulfilled','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.erp_sync_status as enum ('not_synced','pending','synced','failed');
exception when duplicate_object then null; end $$;

-- customers
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  whatsapp text,
  email text,
  notes text,
  erp_customer text,
  erp_contact text,
  erp_sync_status public.erp_sync_status not null default 'not_synced',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customers_name_idx on public.customers (full_name);
create index if not exists customers_phone_idx on public.customers (phone);

-- dress_movements (append-only ledger)
create table if not exists public.dress_movements (
  id uuid primary key default gen_random_uuid(),
  dress_id uuid not null references public.dresses (id) on delete restrict,
  direction public.movement_direction not null,
  reason public.movement_reason not null default 'other',
  customer_id uuid references public.customers (id) on delete set null,
  from_location text,
  to_location text not null,
  occurred_at timestamptz not null default now(),
  due_at timestamptz,
  deposit_amount numeric(12,2),
  condition_notes text,
  condition_photo_paths text[] not null default '{}',
  performed_by uuid references public.profiles (id) on delete set null,
  source public.movement_source not null default 'app',
  erp_stock_entry text,
  erp_sync_status public.erp_sync_status not null default 'not_synced',
  corrects_movement_id uuid references public.dress_movements (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists dress_movements_dress_idx on public.dress_movements (dress_id, occurred_at desc);
create index if not exists dress_movements_customer_idx on public.dress_movements (customer_id, occurred_at desc);

-- dress_reservations
create table if not exists public.dress_reservations (
  id uuid primary key default gen_random_uuid(),
  dress_id uuid not null references public.dresses (id) on delete restrict,
  customer_id uuid references public.customers (id) on delete set null,
  from_date date not null,
  to_date date not null,
  event_date date,
  status public.reservation_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (to_date >= from_date)
);
create index if not exists dress_reservations_dress_idx on public.dress_reservations (dress_id, from_date);

-- dresses: derived location + current customer
alter table public.dresses
  add column if not exists location public.dress_location not null default 'in_atelier',
  add column if not exists current_customer_id uuid references public.customers (id) on delete set null;

-- audit_log (minimal)
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

-- Trigger: derive dress location/customer from the latest movement.
create or replace function public.dresses_apply_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.dresses
  set location = new.to_location::public.dress_location,
      current_customer_id = case when new.direction = 'out' then new.customer_id else null end
  where id = new.dress_id;
  return new;
end;
$$;

drop trigger if exists dresses_apply_movement on public.dress_movements;
create trigger dresses_apply_movement
  after insert on public.dress_movements
  for each row execute function public.dresses_apply_movement();

-- RLS
alter table public.customers enable row level security;
alter table public.dress_movements enable row level security;
alter table public.dress_reservations enable row level security;
alter table public.audit_log enable row level security;

-- customers: staff+admin read/write (soft delete via deleted_at)
drop policy if exists "customers: staff read" on public.customers;
drop policy if exists "customers: staff insert" on public.customers;
drop policy if exists "customers: staff update" on public.customers;
create policy "customers: staff read" on public.customers for select
  to authenticated using (public.is_staff_or_admin());
create policy "customers: staff insert" on public.customers for insert
  to authenticated with check (public.is_staff_or_admin());
create policy "customers: staff update" on public.customers for update
  to authenticated using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

-- dress_movements: staff+admin read/insert only (append-only)
drop policy if exists "dress_movements: staff read" on public.dress_movements;
drop policy if exists "dress_movements: staff insert" on public.dress_movements;
create policy "dress_movements: staff read" on public.dress_movements for select
  to authenticated using (public.is_staff_or_admin());
create policy "dress_movements: staff insert" on public.dress_movements for insert
  to authenticated with check (public.is_staff_or_admin());

-- dress_reservations: staff+admin read/write
drop policy if exists "dress_reservations: staff read" on public.dress_reservations;
drop policy if exists "dress_reservations: staff insert" on public.dress_reservations;
drop policy if exists "dress_reservations: staff update" on public.dress_reservations;
create policy "dress_reservations: staff read" on public.dress_reservations for select
  to authenticated using (public.is_staff_or_admin());
create policy "dress_reservations: staff insert" on public.dress_reservations for insert
  to authenticated with check (public.is_staff_or_admin());
create policy "dress_reservations: staff update" on public.dress_reservations for update
  to authenticated using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

-- audit_log: admin read, staff insert
drop policy if exists "audit_log: admin read" on public.audit_log;
drop policy if exists "audit_log: staff insert" on public.audit_log;
create policy "audit_log: admin read" on public.audit_log for select
  to authenticated using (public.is_admin());
create policy "audit_log: staff insert" on public.audit_log for insert
  to authenticated with check (public.is_staff_or_admin());

-- service_role grants
grant all on public.customers to service_role;
grant all on public.dress_movements to service_role;
grant all on public.dress_reservations to service_role;
grant all on public.audit_log to service_role;
grant select, insert, update on public.dresses to service_role;
