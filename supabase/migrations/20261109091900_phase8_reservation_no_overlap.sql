-- Atelier Inventory – Phase 8 hardening: no double-booking.
--
-- The app checked for an overlapping reservation before inserting one, but
-- that check lives in the browser: two tablets could pass it at the same
-- moment and both insert. The rule belongs in the database, where it cannot
-- be raced.
--
-- An exclusion constraint over a date range is exactly this rule. It needs
-- the btree_gist extension to combine the equality on dress_id with the
-- range overlap on the dates.

create extension if not exists btree_gist;

do $$
begin
  -- A dress can only hold one active reservation at a time. Touching ranges
  -- count as overlapping: a dress booked out on the 10th is not free for a
  -- booking that ends on the 10th.
  alter table public.dress_reservations
    add constraint dress_reservations_no_overlap
    exclude using gist (
      dress_id with =,
      daterange(from_date, to_date, '[]') with &&
    )
    where (status = 'active');
exception
  when duplicate_object then null;
  when others then
    -- The constraint may already exist from a previous run.
    raise notice 'could not add the reservation overlap constraint: %', sqlerrm;
end $$;

-- The constraint only applies to active reservations, so cancelling one must
-- free the slot. Excluded constraints are checked on every update, so an
-- update that changes the status from active to cancelled is allowed.
comment on constraint dress_reservations_no_overlap on public.dress_reservations is
  'A dress cannot have two active reservations whose date ranges overlap.';
