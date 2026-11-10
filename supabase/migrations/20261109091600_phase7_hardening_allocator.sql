-- Atelier Inventory – Phase 7 hardening: self-healing code allocation.
--
-- The counter could drift behind the highest code already in use (e.g. after
-- seeding, importing or restoring data), which made the allocator hand out a
-- code that already existed and the insert fail with a unique violation.
-- The allocator now takes the greater of the stored counter and the highest
-- code actually present, so it can never collide.

create or replace function public.allocate_dress_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_number int;
  v_max_used int;
begin
  select code_prefix into v_prefix
  from public.app_settings
  where id = 1;

  if v_prefix is null then
    raise exception 'app_settings row missing';
  end if;

  -- Highest numeric suffix already used for this prefix (RF-0007 -> 7).
  select coalesce(max(substring(code from '[0-9]+$')::int), 0)
  into v_max_used
  from public.dresses
  where code ~ ('^' || v_prefix || '-[0-9]+$');

  select greatest(next_code_number, v_max_used + 1)
  into v_number
  from public.app_settings
  where id = 1;

  update public.app_settings
  set next_code_number = v_number + 1
  where id = 1;

  return v_prefix || '-' || lpad(v_number::text, 4, '0');
end;
$$;

revoke all on function public.allocate_dress_code() from public;
grant execute on function public.allocate_dress_code() to authenticated, service_role;

-- The trigger keeps working; it is recreated only to be certain of its shape.
create or replace function public.dresses_fill_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.code is null or btrim(new.code) = '' then
    new.code := public.allocate_dress_code();
  end if;
  return new;
end;
$$;

drop trigger if exists dresses_fill_code on public.dresses;
create trigger dresses_fill_code
  before insert on public.dresses
  for each row execute function public.dresses_fill_code();
