-- Atelier Inventory – Phase 1 row level security.
-- Staff and admin write inventory. Only admin touches settings, integrations
-- and the audit log. Deleting dresses/materials is replaced by setting deleted_at.

-- ---------------------------------------------------------------------------
-- Grants (Supabase grants these by default; stated explicitly for clarity)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant select on tables to anon;

-- ---------------------------------------------------------------------------
-- Role helpers (security definer so they can read profiles under RLS)
-- ---------------------------------------------------------------------------
create or replace function public.app_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.app_role() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.app_role() to authenticated, anon;
grant execute on function public.is_admin() to authenticated, anon;

-- A user may edit their own name and language, but never grant themselves admin.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null for the service role and the SQL editor.
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only an admin can change a role.';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
before update on public.profiles
for each row execute function public.guard_profile_role();

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.dresses enable row level security;
alter table public.dress_photos enable row level security;
alter table public.materials enable row level security;
alter table public.dress_materials enable row level security;
alter table public.stock_movements enable row level security;
alter table public.integrations enable row level security;
alter table public.audit_log enable row level security;
alter table public.share_links enable row level security;
alter table public.erp_sync_log enable row level security;

-- ---------------------------------------------------------------------------
-- profiles: own row, or admin
-- ---------------------------------------------------------------------------
create policy "profiles: read own or admin"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles: update own or admin"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- Inserts happen only through the auth.users trigger (security definer).
-- Deletes are handled by the auth.users cascade.

-- ---------------------------------------------------------------------------
-- app_settings: admin only
-- ---------------------------------------------------------------------------
create policy "app_settings: admin read"
on public.app_settings for select
to authenticated
using (public.is_admin());

create policy "app_settings: admin update"
on public.app_settings for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- integrations: admin only
-- ---------------------------------------------------------------------------
create policy "integrations: admin read"
on public.integrations for select
to authenticated
using (public.is_admin());

create policy "integrations: admin insert"
on public.integrations for insert
to authenticated
with check (public.is_admin());

create policy "integrations: admin update"
on public.integrations for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "integrations: admin delete"
on public.integrations for delete
to authenticated
using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Inventory: staff and admin read and write. No hard deletes for dresses or
-- materials; soft delete is an update.
-- ---------------------------------------------------------------------------
create policy "dresses: staff read"
on public.dresses for select
to authenticated
using (true);

create policy "dresses: staff insert"
on public.dresses for insert
to authenticated
with check (true);

create policy "dresses: staff update"
on public.dresses for update
to authenticated
using (true)
with check (true);

create policy "dress_photos: staff read"
on public.dress_photos for select
to authenticated
using (true);

create policy "dress_photos: staff insert"
on public.dress_photos for insert
to authenticated
with check (true);

create policy "dress_photos: staff update"
on public.dress_photos for update
to authenticated
using (true)
with check (true);

create policy "dress_photos: staff delete"
on public.dress_photos for delete
to authenticated
using (true);

create policy "materials: staff read"
on public.materials for select
to authenticated
using (true);

create policy "materials: staff insert"
on public.materials for insert
to authenticated
with check (true);

create policy "materials: staff update"
on public.materials for update
to authenticated
using (true)
with check (true);

create policy "dress_materials: staff read"
on public.dress_materials for select
to authenticated
using (true);

create policy "dress_materials: staff insert"
on public.dress_materials for insert
to authenticated
with check (true);

create policy "dress_materials: staff update"
on public.dress_materials for update
to authenticated
using (true)
with check (true);

create policy "dress_materials: staff delete"
on public.dress_materials for delete
to authenticated
using (true);

-- The stock ledger is append-only: no update or delete policy exists.
create policy "stock_movements: staff read"
on public.stock_movements for select
to authenticated
using (true);

create policy "stock_movements: staff insert"
on public.stock_movements for insert
to authenticated
with check (true);

-- ---------------------------------------------------------------------------
-- audit_log: everyone may append their own action, only admin may read.
-- ---------------------------------------------------------------------------
create policy "audit_log: authenticated insert"
on public.audit_log for insert
to authenticated
with check (user_id is null or user_id = auth.uid());

create policy "audit_log: admin read"
on public.audit_log for select
to authenticated
using (public.is_admin());

-- ---------------------------------------------------------------------------
-- share_links: staff create and revoke; no hard deletes.
-- ---------------------------------------------------------------------------
create policy "share_links: staff read"
on public.share_links for select
to authenticated
using (true);

create policy "share_links: staff insert"
on public.share_links for insert
to authenticated
with check (true);

create policy "share_links: staff update"
on public.share_links for update
to authenticated
using (true)
with check (true);

-- ---------------------------------------------------------------------------
-- erp_sync_log: staff read; writes come from Edge Functions (service role).
-- ---------------------------------------------------------------------------
create policy "erp_sync_log: staff read"
on public.erp_sync_log for select
to authenticated
using (true);
