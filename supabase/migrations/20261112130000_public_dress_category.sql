-- ---------------------------------------------------------------------------
-- The public card shows the kind of garment, so a customer who scans the tag
-- knows whether the dress is a wedding gown, a party dress, an engagement
-- dress, a veil or a jumpsuit.
--
-- The function has to be dropped and recreated: Postgres cannot change the
-- return type of a function with `create or replace` (error 42P13). Both
-- statements run in the same migration transaction, so there is no window in
-- which the public page has no reader.
-- ---------------------------------------------------------------------------
drop function if exists public.get_public_dress(uuid);

create function public.get_public_dress(p_token uuid)
returns table (
  code text,
  name_en text,
  name_ar text,
  description_en text,
  description_ar text,
  category public.dress_category
)
language sql
stable
security definer
set search_path = public
as $$
  select
    d.code,
    d.name_en,
    d.name_ar,
    d.description_en,
    d.description_ar,
    d.category
  from public.dresses d
  where d.public_token = p_token
    and d.deleted_at is null
    and (select public_qr_page from public.app_settings where id = 1) = true
$$;

revoke all on function public.get_public_dress(uuid) from public;
grant execute on function public.get_public_dress(uuid) to anon, authenticated, service_role;
