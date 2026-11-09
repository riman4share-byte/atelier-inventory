-- Atelier Inventory – Phase 3: public share-link reader.
--
-- share_links has no anon select policy by design: anyone must not be able to
-- list tokens or dress ids. This security definer function is the only public
-- door: it validates the token (not revoked, not expired) and returns just the
-- shared dresses' public card. Prices only appear in the result when the share
-- was created with show_prices, and status never leaves the database.

create or replace function public.get_shared_dresses(p_token text)
returns table (
  id uuid,
  code text,
  name_en text,
  name_ar text,
  description_en text,
  description_ar text,
  sale_price numeric,
  rent_price numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    d.id,
    d.code,
    d.name_en,
    d.name_ar,
    d.description_en,
    d.description_ar,
    case when s.show_prices then d.sale_price end as sale_price,
    case when s.show_prices then d.rent_price end as rent_price
  from public.share_links s
  join public.dresses d
    on d.id = any (s.dress_ids)
   and d.deleted_at is null
  where s.token = p_token
    and not s.revoked
    and (s.expires_at is null or s.expires_at > now())
  order by array_position(s.dress_ids, d.id)
$$;

revoke all on function public.get_shared_dresses(text) from public;
grant execute on function public.get_shared_dresses(text) to anon, authenticated, service_role;
