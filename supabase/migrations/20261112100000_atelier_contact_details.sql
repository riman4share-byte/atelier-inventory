-- ---------------------------------------------------------------------------
-- The atelier's details, for the printed documents and the spreadsheet.
--
-- The header of an export is more than a name: a bride reading a catalogue
-- wants to know where the atelier is and how to reach it. The settings table
-- had no place to put that.
-- ---------------------------------------------------------------------------
alter table public.app_settings
  add column if not exists tagline text,
  add column if not exists contact text;

comment on column public.app_settings.tagline is
  'One line under the atelier name: what it makes and where it is.';
comment on column public.app_settings.contact is
  'How to reach the atelier: phone, email, address. One line.';

-- The public branding function now carries them too.
-- It has to be dropped first: postgres will not let a function's return type
-- change in place.
drop function if exists public.get_atelier_branding();

create or replace function public.get_atelier_branding()
returns table (
  atelier_name text,
  tagline text,
  contact text,
  logo_path text,
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
    coalesce(s.public_qr_page, false)
  from public.app_settings s
  where s.id = 1
$$;

revoke all on function public.get_atelier_branding() from public;
grant execute on function public.get_atelier_branding() to anon, authenticated, service_role;
