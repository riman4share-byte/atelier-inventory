-- Atelier Inventory – Phase 2: suggest the next dress code.
--
-- app_settings is admin-only by design (G-20), but every staff member who
-- creates a dress needs the next code (prefix + zero-padded number). This
-- security definer function exposes only that string -- never the settings
-- row, and it does not reserve or consume a number. Uniqueness is still
-- enforced by the unique index on dresses.code until Phase 7 adds the
-- transaction-safe allocation on save.

create or replace function public.suggest_dress_code()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select s.code_prefix || '-' || lpad(s.next_code_number::text, 4, '0')
  from public.app_settings s
  where s.id = 1
$$;

revoke all on function public.suggest_dress_code() from public, anon;
grant execute on function public.suggest_dress_code() to authenticated, service_role;
