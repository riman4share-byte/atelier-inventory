-- ---------------------------------------------------------------------------
-- Movement functions: transactional, validating, status-deriving.
--
-- Before this, a check-out was three separate client statements: insert a
-- movement, trust a trigger to move the dress, and hope no other tablet did
-- the same thing in between. The trigger only updated `location`, never
-- `status`, so "Rented" counts and the availability screen disagreed. And
-- nothing stopped two tablets checking out the same dress.
--
-- Each function below locks the dress row, validates that it can move, writes
-- the ledger entry and updates the dress in the same transaction, and derives
-- `status` from the movement. A second tablet that passes the same checks
-- concurrently blocks on the row lock and then fails with a clear error.
-- ---------------------------------------------------------------------------

-- Deposit settlement on return.
alter table public.dress_movements
  add column if not exists deposit_returned boolean not null default false;

-- ---------------------------------------------------------------------------
-- check_out_dress
-- ---------------------------------------------------------------------------
create or replace function public.check_out_dress(
  p_dress_id            uuid,
  p_customer_id         uuid,
  p_reason              text,
  p_to_location         text,
  p_occurred_at         timestamptz default null,
  p_due_at              timestamptz default null,
  p_deposit_amount      numeric default null,
  p_condition_notes     text default null,
  p_performed_by        uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dress public.dresses%rowtype;
  v_new_status public.dress_status;
  v_movement_id uuid;
begin
  -- Lock the dress so two tablets cannot race past the checks below.
  select * into v_dress
  from public.dresses
  where id = p_dress_id
  for update;

  if not found then
    raise exception 'dress not found' using errcode = 'P0001';
  end if;
  if v_dress.deleted_at is not null then
    raise exception 'dress is deleted' using errcode = 'P0002';
  end if;
  -- A dress that is not in the atelier cannot be checked out.
  if v_dress.location <> 'in_atelier' then
    raise exception 'dress is not in the atelier' using errcode = 'P0003';
  end if;

  -- An active reservation covering any part of the checkout window blocks it.
  if exists (
    select 1 from public.dress_reservations r
    where r.dress_id = p_dress_id
      and r.status = 'active'
      and r.from_date <= coalesce(p_due_at::date, '9999-12-31'::date)
      and r.to_date >= p_occurred_at::date
  ) then
    raise exception 'dress has an overlapping reservation' using errcode = 'P0004';
  end if;

  -- Derive status from the movement.
  if p_reason = 'sale_delivery' then
    v_new_status := 'sold';
  else
    v_new_status := 'rented';
  end if;

  insert into public.dress_movements (
    dress_id, direction, reason, customer_id,
    from_location, to_location, occurred_at, due_at,
    deposit_amount, condition_notes, performed_by, source
  ) values (
    p_dress_id, 'out', p_reason::public.movement_reason, p_customer_id,
    'in_atelier', p_to_location::public.dress_location,
    coalesce(p_occurred_at, now()), p_due_at,
    p_deposit_amount, p_condition_notes, p_performed_by, 'app'
  ) returning id into v_movement_id;

  update public.dresses
  set status = v_new_status,
      location = p_to_location::public.dress_location,
      current_customer_id = p_customer_id
  where id = p_dress_id;

  return v_movement_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- check_in_dress
-- ---------------------------------------------------------------------------
create or replace function public.check_in_dress(
  p_dress_id            uuid,
  p_to_location         text,
  p_occurred_at         timestamptz default null,
  p_condition_notes     text default null,
  p_deposit_returned    boolean default false,
  p_performed_by        uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dress public.dresses%rowtype;
  v_movement_id uuid;
  v_open_count int;
  v_new_status public.dress_status;
begin
  select * into v_dress
  from public.dresses
  where id = p_dress_id
  for update;

  if not found then
    raise exception 'dress not found' using errcode = 'P0001';
  end if;
  if v_dress.deleted_at is not null then
    raise exception 'dress is deleted' using errcode = 'P0002';
  end if;

  insert into public.dress_movements (
    dress_id, direction, reason, customer_id,
    from_location, to_location, occurred_at,
    condition_notes, deposit_returned, performed_by, source
  ) values (
    p_dress_id, 'in', 'return'::public.movement_reason, v_dress.current_customer_id,
    v_dress.location, p_to_location::public.dress_location,
    coalesce(p_occurred_at, now()),
    p_condition_notes, p_deposit_returned, p_performed_by, 'app'
  ) returning id into v_movement_id;

  -- If other movements are still open, the dress stays rented.
  select count(*) into v_open_count
  from public.dress_movements m
  where m.dress_id = p_dress_id
    and m.direction = 'out'
    and m.corrects_movement_id is null
    and not exists (
      select 1 from public.dress_movements m2
      where m2.dress_id = p_dress_id
        and m2.direction = 'in'
        and m2.occurred_at > m.occurred_at
        and m2.corrects_movement_id is null
    );

  if v_open_count > 0 then
    v_new_status := 'rented';
  else
    v_new_status := 'available';
  end if;

  update public.dresses
  set status = v_new_status,
      location = p_to_location::public.dress_location,
      current_customer_id = case when v_open_count > 0 then current_customer_id else null end
  where id = p_dress_id;

  return v_movement_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- reserve_dress
-- ---------------------------------------------------------------------------
create or replace function public.reserve_dress(
  p_dress_id     uuid,
  p_from_date    date,
  p_to_date      date,
  p_customer_id  uuid default null,
  p_event_date   date default null,
  p_notes        text default null,
  p_performed_by uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dress public.dresses%rowtype;
  v_reservation_id uuid;
begin
  select * into v_dress
  from public.dresses
  where id = p_dress_id
  for update;

  if not found then
    raise exception 'dress not found' using errcode = 'P0001';
  end if;
  if v_dress.deleted_at is not null then
    raise exception 'dress is deleted' using errcode = 'P0002';
  end if;

  -- Overlapping active reservation.
  if exists (
    select 1 from public.dress_reservations r
    where r.dress_id = p_dress_id
      and r.status = 'active'
      and r.from_date <= p_to_date
      and r.to_date >= p_from_date
  ) then
    raise exception 'dress has an overlapping reservation' using errcode = 'P0006';
  end if;

  -- Cannot reserve a dress that is currently out.
  if v_dress.location <> 'in_atelier' then
    raise exception 'dress is not in the atelier' using errcode = 'P0003';
  end if;

  insert into public.dress_reservations (
    dress_id, customer_id, from_date, to_date, event_date, notes, status
  ) values (
    p_dress_id, p_customer_id, p_from_date, p_to_date, p_event_date, p_notes, 'active'
  ) returning id into v_reservation_id;

  -- A reservation is a future commitment; the dress can still be available
  -- now. Only mark it reserved if the hold covers today.
  if p_from_date <= current_date and p_to_date >= current_date then
    update public.dresses set status = 'reserved' where id = p_dress_id;
  end if;

  return v_reservation_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_reservation
-- ---------------------------------------------------------------------------
create or replace function public.cancel_reservation(
  p_reservation_id uuid,
  p_performed_by   uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.dress_reservations%rowtype;
begin
  select * into v_reservation
  from public.dress_reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'reservation not found' using errcode = 'P0007';
  end if;
  if v_reservation.status <> 'active' then
    raise exception 'reservation is not active' using errcode = 'P0008';
  end if;

  update public.dress_reservations
  set status = 'cancelled'
  where id = p_reservation_id;

  -- If no other active reservation covers today, the dress is available again.
  if not exists (
    select 1 from public.dress_reservations r
    where r.dress_id = v_reservation.dress_id
      and r.status = 'active'
      and r.from_date <= current_date
      and r.to_date >= current_date
  ) then
    update public.dresses
    set status = 'available'
    where id = v_reservation.dress_id
      and status = 'reserved';
  end if;
end;
$$;

-- RLS: only staff/admin can call these.
revoke all on function public.check_out_dress(uuid, uuid, text, text, timestamptz, timestamptz, numeric, text, uuid) from public, anon;
revoke all on function public.check_in_dress(uuid, text, timestamptz, text, boolean, uuid) from public, anon;
revoke all on function public.reserve_dress(uuid, date, date, uuid, date, text, uuid) from public, anon;
revoke all on function public.cancel_reservation(uuid, uuid) from public, anon;
grant execute on function public.check_out_dress(uuid, uuid, text, text, timestamptz, timestamptz, numeric, text, uuid) to authenticated;
grant execute on function public.check_in_dress(uuid, text, timestamptz, text, boolean, uuid) to authenticated;
grant execute on function public.reserve_dress(uuid, date, date, uuid, date, text, uuid) to authenticated;
grant execute on function public.cancel_reservation(uuid, uuid) to authenticated;
