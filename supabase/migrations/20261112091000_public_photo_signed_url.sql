-- ---------------------------------------------------------------------------
-- A signed, short-lived URL for one photograph.
--
-- The public card is read by a customer who has never signed in, and the
-- photographs live in a private bucket. The browser cannot sign an object
-- it has no rights to, so the signature has to be made here, where the
-- function's rights are the owner's.
--
-- The function only answers for a dress whose public token the caller
-- already holds. It is not a way to list the catalogue: a guess still gets
-- nothing, because the token is the key.
-- ---------------------------------------------------------------------------
create or replace function public.get_public_dress_photo_url(p_token uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_path text;
  v_url text;
begin
  select p.original_path into v_path
  from public.dress_photos p
  join public.dresses d on d.id = p.dress_id
  where d.public_token = p_token
    and d.deleted_at is null
    and (select public_qr_page from public.app_settings where id = 1) = true
  order by p.sort_order, p.created_at
  limit 1;

  if v_path is null then
    return null;
  end if;

  -- A signature that lasts ten minutes: long enough for the page to load
  -- and the photograph to be looked at, short enough that the link cannot
  -- be passed on.
  v_url := storage.create_signed_url('dress-originals', v_path, 600);
  return v_url;
end;
$$;

revoke all on function public.get_public_dress_photo_url(uuid) from public;
grant execute on function public.get_public_dress_photo_url(uuid) to anon, authenticated, service_role;
