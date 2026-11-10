-- Atelier Inventory – Phase 7 hardening: share-link ownership.
--
-- The share-link update policy is scoped to the creator (or an admin), so
-- the creator must be recorded. It is set by a trigger rather than by the
-- client, so a caller cannot create a link on someone else's behalf.

create or replace function public.share_links_set_creator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists share_links_set_creator on public.share_links;
create trigger share_links_set_creator
  before insert on public.share_links
  for each row execute function public.share_links_set_creator();

-- Links created before this trigger have no owner; give them to the admin
-- accounts so they stay manageable instead of becoming orphaned.
update public.share_links
set created_by = (
  select p.id from public.profiles p
  where p.role = 'admin'
  order by p.created_at
  limit 1
)
where created_by is null;
