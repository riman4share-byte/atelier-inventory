-- ---------------------------------------------------------------------------
-- The atelier's own name and logo, on the printed hang tags, the printed
-- catalogue and the public page a customer reaches by scanning the QR.
--
-- Until now the printed documents said "Atelier Inventory" - the name of the
-- app - and the public page showed a placeholder icon instead of the dress.
-- A bride who scans the tag on her own dress has to see the dress and the
-- atelier's name, not the name of the software.
-- ---------------------------------------------------------------------------

-- 1) The logo lives in its own bucket. The existing `branding` bucket is
--    admin-only for reading, which is right for cover art, but the logo has
--    to be readable by anyone who opens the public page.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('atelier-logo', 'atelier-logo', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- The logo is public to read. Only an admin may write it.
drop policy if exists "atelier logo: public read" on storage.objects;
create policy "atelier logo: public read"
on storage.objects for select
to public
using (bucket_id = 'atelier-logo');

drop policy if exists "atelier logo: admin write" on storage.objects;
create policy "atelier logo: admin write"
on storage.objects for insert
to authenticated
with check (bucket_id = 'atelier-logo' and public.is_admin());

drop policy if exists "atelier logo: admin update" on storage.objects;
create policy "atelier logo: admin update"
on storage.objects for update
to authenticated
using (bucket_id = 'atelier-logo' and public.is_admin())
with check (bucket_id = 'atelier-logo' and public.is_admin());

drop policy if exists "atelier logo: admin delete" on storage.objects;
create policy "atelier logo: admin delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'atelier-logo' and public.is_admin());

-- 2) A public, read-only view of the shop's name and logo.
--
--    Staff cannot read app_settings (that is deliberate - it holds secrets),
--    and a customer reading the public page certainly cannot. This function
--    exposes only the two harmless fields the branding needs, and nothing
--    else. It is the same shape as get_public_dress.
create or replace function public.get_atelier_branding()
returns table (
  atelier_name text,
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
    s.logo_path,
    coalesce(s.public_qr_page, false)
  from public.app_settings s
  where s.id = 1
$$;

revoke all on function public.get_atelier_branding() from public;
grant execute on function public.get_atelier_branding() to anon, authenticated, service_role;

-- 3) The first photograph of a dress, for the public card.
--
--    The customer who scans the QR has to see the dress. The photos live in
--    a private bucket, so the public card needs a way to reach one without
--    opening the bucket. This returns the path of the first photo only, and
--    only for a dress whose token the caller already holds - it is not a
--    way to list the catalogue.
create or replace function public.get_public_dress_photo(p_token uuid)
returns table (
  original_path text,
  width integer,
  height integer
)
language sql
stable
security definer
set search_path = public
as $$
  select p.original_path, p.width, p.height
  from public.dress_photos p
  join public.dresses d on d.id = p.dress_id
  where d.public_token = p_token
    and d.deleted_at is null
    and (select public_qr_page from public.app_settings where id = 1) = true
  order by p.sort_order, p.created_at
  limit 1
$$;

revoke all on function public.get_public_dress_photo(uuid) from public;
grant execute on function public.get_public_dress_photo(uuid) to anon, authenticated, service_role;
