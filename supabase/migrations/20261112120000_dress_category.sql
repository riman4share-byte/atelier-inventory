-- ---------------------------------------------------------------------------
-- What kind of garment a dress is.
--
-- The atelier's own list: a wedding dress, a party dress, an engagement
-- dress, a veil, or a jumpsuit. This is the list the AI is told to choose
-- from, so the catalogue and the photographs agree.
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.dress_category as enum (
    'wedding',
    'party',
    'engagement',
    'veil',
    'jumpsuit'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.dresses
  add column if not exists category public.dress_category;

comment on column public.dresses.category is
  'What kind of garment: wedding, party, engagement, veil, jumpsuit.';

-- The dresses that already exist are all wedding gowns.
update public.dresses
set category = 'wedding'
where category is null;

create index if not exists dresses_category_idx
  on public.dresses (category)
  where deleted_at is null;
