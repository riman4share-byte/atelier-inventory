-- Atelier Inventory – Phase 1 storage.
-- All buckets are private. The app reads photos with short-lived signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('dress-originals', 'dress-originals', false, 20971520, array['image/jpeg', 'image/png', 'image/webp']),
  ('dress-clean', 'dress-clean', false, 20971520, array['image/png', 'image/webp']),
  ('material-photos', 'material-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('branding', 'branding', false, 5242880, array['image/png', 'image/jpeg', 'image/svg+xml'])
on conflict (id) do nothing;

-- Dress and material photos: any signed-in staff member.
create policy "dress photos: staff read"
on storage.objects for select
to authenticated
using (bucket_id in ('dress-originals', 'dress-clean', 'material-photos'));

create policy "dress photos: staff upload"
on storage.objects for insert
to authenticated
with check (bucket_id in ('dress-originals', 'dress-clean', 'material-photos'));

create policy "dress photos: staff update"
on storage.objects for update
to authenticated
using (bucket_id in ('dress-originals', 'dress-clean', 'material-photos'))
with check (bucket_id in ('dress-originals', 'dress-clean', 'material-photos'));

create policy "dress photos: staff delete"
on storage.objects for delete
to authenticated
using (bucket_id in ('dress-originals', 'dress-clean', 'material-photos'));

-- Branding (logo, cover art): everyone signed in reads, admin writes.
create policy "branding: staff read"
on storage.objects for select
to authenticated
using (bucket_id = 'branding');

create policy "branding: admin upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'branding' and public.is_admin());

create policy "branding: admin update"
on storage.objects for update
to authenticated
using (bucket_id = 'branding' and public.is_admin())
with check (bucket_id = 'branding' and public.is_admin());

create policy "branding: admin delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'branding' and public.is_admin());
