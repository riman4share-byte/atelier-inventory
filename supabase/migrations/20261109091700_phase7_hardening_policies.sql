-- Atelier Inventory – Phase 7 hardening: RLS and public-surface tightening.
--
-- Fixes raised by the security review:
--   * audit_log: two permissive INSERT policies were OR-combined, so a staff
--     member could write an audit row attributed to another user. One policy
--     now requires user_id = auth.uid().
--   * is_staff_or_admin(): returned true for ANY profile row, and a profile
--     row is auto-created for every new auth user. It is now role-aware and
--     fails closed, and its EXECUTE grant no longer leaks to PUBLIC.
--   * allocate_dress_code(): was directly executable by every authenticated
--     user, so anyone could inflate the global counter. The insert trigger
--     calls it as the definer, so the direct grant is no longer needed.
--   * share_links: any staff member could rewrite another user's share link
--     (including un-revoking it). Updates are now scoped to the creator or an
--     admin.
--   * get_public_dress(code): dress codes are sequential and guessable, so
--     the function was an enumeration oracle for the whole catalogue. Each
--     dress now carries an unguessable public_token and the public card is
--     looked up by that token only.
--   * storage: the photo bucket policies scoped on bucket_id alone, so any
--     signed-in staff member could read, overwrite or delete objects at any
--     path. They are now scoped to the dress/material namespace.

-- ---------------------------------------------------------------------------
-- 1) Unguessable public token per dress.
-- ---------------------------------------------------------------------------
alter table public.dresses add column if not exists public_token uuid;

update public.dresses
set public_token = gen_random_uuid()
where public_token is null;

alter table public.dresses
  alter column public_token set default gen_random_uuid(),
  alter column public_token set not null;

create unique index if not exists dresses_public_token_idx
  on public.dresses (public_token);

-- ---------------------------------------------------------------------------
-- 2) The public card is looked up by token, never by code.
-- ---------------------------------------------------------------------------
create or replace function public.get_public_dress(p_token uuid)
returns table (
  code text,
  name_en text,
  name_ar text,
  description_en text,
  description_ar text
)
language sql
stable
security definer
set search_path = public
as $$
  select d.code, d.name_en, d.name_ar, d.description_en, d.description_ar
  from public.dresses d
  where d.public_token = p_token
    and d.deleted_at is null
    and (select public_qr_page from public.app_settings where id = 1) = true
$$;

revoke all on function public.get_public_dress(uuid) from public;
grant execute on function public.get_public_dress(uuid) to anon, authenticated, service_role;

-- The code-based reader is retired: it allowed anonymous enumeration of the
-- entire catalogue by incrementing a sequential number.
drop function if exists public.get_public_dress(text);

-- ---------------------------------------------------------------------------
-- 3) Role-aware staff check that fails closed.
-- ---------------------------------------------------------------------------
create or replace function public.is_staff_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('staff', 'admin')
  );
$$;

revoke all on function public.is_staff_or_admin() from public;
grant execute on function public.is_staff_or_admin() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) One audit-log insert policy, and it must be the caller's own row.
-- ---------------------------------------------------------------------------
drop policy if exists "audit_log: authenticated insert" on public.audit_log;
drop policy if exists "audit_log: staff insert" on public.audit_log;

create policy "audit_log: staff insert"
on public.audit_log for insert
to authenticated
with check (public.is_staff_or_admin() and user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5) The code allocator is no longer directly callable by staff.
-- ---------------------------------------------------------------------------
revoke all on function public.allocate_dress_code() from authenticated;

-- ---------------------------------------------------------------------------
-- 6) Share links: only the creator (or an admin) may change them.
-- ---------------------------------------------------------------------------
drop policy if exists "share_links: staff update" on public.share_links;

create policy "share_links: staff update"
on public.share_links for update
to authenticated
using (created_by = auth.uid() or public.is_admin())
with check (created_by = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- 7) Storage policies scoped to the object namespace.
--
-- Dress photos live at <dress_id>/<photo_id>.jpg and material photos at
-- <material_id>/<photo_id>.jpg, so the first path segment must be a real
-- dress or material row. `branding` stays admin-only as before.
-- ---------------------------------------------------------------------------
drop policy if exists "dress photos: staff read" on storage.objects;
drop policy if exists "dress photos: staff upload" on storage.objects;
drop policy if exists "dress photos: staff update" on storage.objects;
drop policy if exists "dress photos: staff delete" on storage.objects;

create policy "dress photos: staff read"
on storage.objects for select
to authenticated
using (
  bucket_id in ('dress-originals', 'dress-clean')
  and (
    (storage.foldername(name))[1] in (select d.id::text from public.dresses d)
    or (storage.foldername(name))[1] in (select m.id::text from public.materials m)
  )
);

create policy "dress photos: staff upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id in ('dress-originals', 'dress-clean')
  and (
    (storage.foldername(name))[1] in (select d.id::text from public.dresses d)
    or (storage.foldername(name))[1] in (select m.id::text from public.materials m)
  )
);

create policy "dress photos: staff update"
on storage.objects for update
to authenticated
using (
  bucket_id in ('dress-originals', 'dress-clean')
  and (
    (storage.foldername(name))[1] in (select d.id::text from public.dresses d)
    or (storage.foldername(name))[1] in (select m.id::text from public.materials m)
  )
)
with check (
  bucket_id in ('dress-originals', 'dress-clean')
  and (
    (storage.foldername(name))[1] in (select d.id::text from public.dresses d)
    or (storage.foldername(name))[1] in (select m.id::text from public.materials m)
  )
);

create policy "dress photos: staff delete"
on storage.objects for delete
to authenticated
using (
  bucket_id in ('dress-originals', 'dress-clean')
  and (
    (storage.foldername(name))[1] in (select d.id::text from public.dresses d)
    or (storage.foldername(name))[1] in (select m.id::text from public.materials m)
  )
);

-- material-photos keeps its own policy set, now also namespace-scoped.
drop policy if exists "material photos: staff read" on storage.objects;
drop policy if exists "material photos: staff upload" on storage.objects;

create policy "material photos: staff read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'material-photos'
  and (storage.foldername(name))[1] in (select m.id::text from public.materials m)
);

create policy "material photos: staff upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'material-photos'
  and (storage.foldername(name))[1] in (select m.id::text from public.materials m)
);
