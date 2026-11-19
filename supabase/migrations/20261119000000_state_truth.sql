-- ---------------------------------------------------------------------------
-- The movement ledger is the only source of truth for a dress's state.
--
-- Before this, `dresses.status` could be typed by hand: the segmented
-- control on the dress page, the status picker in the form and the bulk bar
-- in the table all wrote it directly, and nothing checked it against the
-- ledger. That is how the live database ended up with dresses that claimed
-- to be rented and reserved while having no movement behind them at all -
-- the calendar, the dashboard and the printed report then disagreed with
-- each other, and the only fix was to guess which one was right.
--
-- From now on the ledger decides:
--
--   an open outgoing movement       -> rented, or sold for a sale delivery
--   an active booking covering today -> reserved
--   nothing                         -> available
--
-- The four movement functions already write that truth, so they are
-- unaffected. A hand-written status that the ledger does not support is
-- refused with a clear error instead of being stored.
-- ---------------------------------------------------------------------------

-- The truth about one dress, in one place.
create or replace function public.derive_dress_status(p_dress_id uuid)
returns public.dress_status
language sql
stable
security definer
set search_path = public
as $$
  with open_out as (
    -- An outgoing movement that no later incoming movement has closed.
    select m.reason
    from public.dress_movements m
    where m.dress_id = p_dress_id
      and m.direction = 'out'
      and m.corrects_movement_id is null
      and not exists (
        select 1
        from public.dress_movements m2
        where m2.dress_id = p_dress_id
          and m2.direction = 'in'
          and m2.occurred_at > m.occurred_at
          and m2.corrects_movement_id is null
      )
  )
  select case
    when exists (select 1 from open_out where reason = 'sale_delivery')
      then 'sold'::public.dress_status
    when exists (select 1 from open_out)
      then 'rented'::public.dress_status
    when exists (
      select 1
      from public.dress_reservations r
      where r.dress_id = p_dress_id
        and r.status = 'active'
        and r.from_date <= current_date
        and r.to_date >= current_date
    ) then 'reserved'::public.dress_status
    else 'available'::public.dress_status
  end;
$$;

revoke all on function public.derive_dress_status(uuid) from public, anon;
grant execute on function public.derive_dress_status(uuid) to authenticated;

-- The guard. A new dress starts available; a status that the ledger does
-- not support is refused.
create or replace function public.enforce_dress_status_truth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_truth public.dress_status;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'available'::public.dress_status then
      raise exception
        'a new dress starts available - check it out or book it to change that'
        using errcode = 'P0009';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    v_truth := public.derive_dress_status(new.id);
    if new.status <> v_truth then
      raise exception
        'this dress is % according to the movement ledger, not % - check it out or book it instead',
        v_truth, new.status
        using errcode = 'P0009';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_dress_status_truth() from public, anon;

drop trigger if exists dresses_status_truth on public.dresses;
create trigger dresses_status_truth
before insert or update of status on public.dresses
for each row execute function public.enforce_dress_status_truth();

-- ---------------------------------------------------------------------------
-- The reserve function sets 'reserved' only when the hold covers today, and
-- it inserts the hold before it touches the dress, so the guard sees the
-- evidence. The same is true of check-out, check-in and cancel. This is
-- only a note for the next reader: the order matters.
-- ---------------------------------------------------------------------------
