-- Atelier Inventory – Phase 1 schema
-- UUID keys, created_at/updated_at, soft delete on dresses and materials.
-- Every table has RLS enabled in 20261109090100_rls.sql.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('admin', 'staff');
create type public.language_code as enum ('en', 'ar');
create type public.dress_status as enum ('available', 'reserved', 'rented', 'sold');
create type public.listing_type as enum ('sale', 'rent', 'both');
create type public.photo_angle as enum ('front', 'back', 'side', 'neckline', 'detail', 'other');
create type public.material_category as enum (
  'crystal', 'bead', 'pearl', 'fabric', 'lace', 'trim', 'button', 'zipper', 'other'
);
create type public.material_unit as enum ('piece', 'gram', 'kg', 'meter');
create type public.stock_reason as enum ('purchase', 'used', 'adjustment', 'return');
create type public.integration_kind as enum (
  'vision', 'background_removal', 'translation', 'storage', 'erp', 'custom'
);
create type public.test_status as enum ('ok', 'failed', 'untested');
create type public.erp_entity as enum ('dress', 'material');
create type public.erp_action as enum ('create', 'update', 'skip', 'error');
create type public.erp_sync_status as enum ('not_synced', 'pending', 'synced', 'error', 'stale');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role public.user_role not null default 'staff',
  language public.language_code not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per auth user. Staff and admin are the only roles.';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- app_settings (singleton)
-- ---------------------------------------------------------------------------
create table public.app_settings (
  id smallint primary key default 1 check (id = 1),
  atelier_name text not null default 'Atelier',
  logo_path text,
  code_prefix text not null default 'RF' check (char_length(code_prefix) between 1 and 6),
  next_code_number integer not null default 1 check (next_code_number >= 1),
  default_language public.language_code not null default 'en',
  public_qr_page boolean not null default false,
  western_digits boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

create trigger app_settings_set_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- dresses
-- ---------------------------------------------------------------------------
create table public.dresses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_en text not null default '',
  name_ar text not null default '',
  description_en text,
  description_ar text,
  silhouette text,
  neckline text,
  sleeves text,
  fabrics text[] not null default '{}',
  color text,
  size_label text,
  status public.dress_status not null default 'available',
  listing_type public.listing_type not null default 'both',
  sale_price numeric(12, 2) check (sale_price is null or sale_price >= 0),
  rent_price numeric(12, 2) check (rent_price is null or rent_price >= 0),
  notes text,
  ai_raw jsonb,
  ai_model text,
  created_by uuid references public.profiles (id) on delete set null,
  erp_item_code text,
  erp_sync_status public.erp_sync_status not null default 'not_synced',
  erp_synced_at timestamptz,
  erp_error text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dresses_status_idx on public.dresses (status) where deleted_at is null;
create index dresses_created_at_idx on public.dresses (created_at desc) where deleted_at is null;
create index dresses_erp_status_idx on public.dresses (erp_sync_status) where deleted_at is null;

create trigger dresses_set_updated_at
before update on public.dresses
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- dress_photos
-- ---------------------------------------------------------------------------
create table public.dress_photos (
  id uuid primary key default gen_random_uuid(),
  dress_id uuid not null references public.dresses (id) on delete cascade,
  angle public.photo_angle not null default 'front',
  original_path text not null,
  clean_path text,
  background_style jsonb,
  sort_order integer not null default 0,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dress_photos_dress_idx on public.dress_photos (dress_id, sort_order);

create trigger dress_photos_set_updated_at
before update on public.dress_photos
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- materials
-- ---------------------------------------------------------------------------
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  name_en text not null default '',
  name_ar text not null default '',
  category public.material_category not null default 'other',
  color text,
  size text,
  supplier text,
  unit public.material_unit not null default 'piece',
  stock_qty numeric(12, 3) not null default 0 check (stock_qty >= 0),
  low_stock_threshold numeric(12, 3) not null default 0 check (low_stock_threshold >= 0),
  unit_cost numeric(12, 2) check (unit_cost is null or unit_cost >= 0),
  photo_path text,
  notes text,
  erp_item_code text,
  erp_sync_status public.erp_sync_status not null default 'not_synced',
  erp_synced_at timestamptz,
  erp_error text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index materials_category_idx on public.materials (category) where deleted_at is null;
create index materials_name_idx on public.materials (name_en) where deleted_at is null;

create trigger materials_set_updated_at
before update on public.materials
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- dress_materials
-- ---------------------------------------------------------------------------
create table public.dress_materials (
  dress_id uuid not null references public.dresses (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete cascade,
  quantity numeric(12, 3) not null default 1 check (quantity > 0),
  note text,
  primary key (dress_id, material_id)
);

create index dress_materials_material_idx on public.dress_materials (material_id);

-- ---------------------------------------------------------------------------
-- stock_movements (append-only stock ledger)
-- ---------------------------------------------------------------------------
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials (id) on delete cascade,
  delta numeric(12, 3) not null check (delta <> 0),
  reason public.stock_reason not null default 'adjustment',
  dress_id uuid references public.dresses (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index stock_movements_material_idx on public.stock_movements (material_id, created_at desc);
create index stock_movements_dress_idx on public.stock_movements (dress_id);

-- ---------------------------------------------------------------------------
-- integrations (provider keys live in Supabase Vault, never here)
-- ---------------------------------------------------------------------------
create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  kind public.integration_kind not null,
  provider text not null,
  label text not null default '',
  endpoint text,
  model text,
  config jsonb not null default '{}'::jsonb,
  vault_secret_id uuid,
  enabled boolean not null default false,
  last_test_at timestamptz,
  last_test_status public.test_status not null default 'untested',
  last_test_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only one active integration per kind; custom tools may have several.
create unique index integrations_one_active_per_kind
on public.integrations (kind)
where enabled and kind <> 'custom';

create trigger integrations_set_updated_at
before update on public.integrations
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  diff jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_created_at_idx on public.audit_log (created_at desc);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);

-- ---------------------------------------------------------------------------
-- share_links (read-only public pages, expiring and revocable)
-- ---------------------------------------------------------------------------
create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  dress_ids uuid[] not null default '{}',
  show_prices boolean not null default false,
  expires_at timestamptz,
  revoked boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index share_links_token_idx on public.share_links (token);

-- ---------------------------------------------------------------------------
-- erp_sync_log
-- ---------------------------------------------------------------------------
create table public.erp_sync_log (
  id uuid primary key default gen_random_uuid(),
  entity public.erp_entity not null,
  entity_id uuid not null,
  action public.erp_action not null,
  http_status integer,
  message text,
  created_at timestamptz not null default now()
);

create index erp_sync_log_entity_idx on public.erp_sync_log (entity, entity_id, created_at desc);
