-- ---------------------------------------------------------------------------
-- The software credit.
--
-- The app was built for the atelier, and the atelier owns it. The credit
-- appears on the sign-in screen, on the account screen, on the public page
-- and in the footers of the printed documents.
--
-- It is a setting, not a hard-coded string, so the owner can change it or
-- clear it without touching the code.
-- ---------------------------------------------------------------------------
alter table public.app_settings
  add column if not exists powered_by text;

comment on column public.app_settings.powered_by is
  'The credit shown in the footers: the software made for the atelier. Empty means no credit.';

update public.app_settings
set powered_by = 'Powered by Kais'
where id = 1 and (powered_by is null or powered_by = '');

-- The public branding function carries it, so the public page and the
-- printed documents can show it too.
drop function if exists public.get_atelier_branding();

create or replace function public.get_atelier_branding()
returns table (
  atelier_name text,
  tagline text,
  contact text,
  logo_path text,
  powered_by text,
  public_qr_page boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(nullif(trim(s.atelier_name), ''), 'Atelier'),
    nullif(trim(s.tagline), ''),
    nullif(trim(s.contact), ''),
    s.logo_path,
    nullif(trim(s.powered_by), ''),
    coalesce(s.public_qr_page, false)
  from public.app_settings s
  where s.id = 1
$$;

revoke all on function public.get_atelier_branding() from public;
grant execute on function public.get_atelier_branding() to anon, authenticated, service_role;
