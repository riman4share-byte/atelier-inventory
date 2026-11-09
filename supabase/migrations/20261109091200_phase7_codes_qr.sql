-- Atelier Inventory – Phase 7: transaction-safe codes, public QR page, public dress card.

-- 1) Atomic code allocation. Replaces the read-only suggest_dress_code() for
--    the create path: two simultaneous saves can never get the same number.
create or replace function public.allocate_dress_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_number int;
begin
  update public.app_settings
  set next_code_number = next_code_number + 1
  where id = 1
  returning code_prefix, next_code_number - 1 into v_prefix, v_number;
  if v_prefix is null then
    raise exception 'app_settings row missing';
  end if;
  return v_prefix || '-' || lpad(v_number::text, 4, '0');
end;
$$;

revoke all on function public.allocate_dress_code() from public;
grant execute on function public.allocate_dress_code() to authenticated, service_role;

-- 2) Auto-fill the code on insert when the caller leaves it blank.
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

-- 3) Public setting reader (staff cannot read app_settings directly).
create or replace function public.public_qr_page_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select public_qr_page from public.app_settings where id = 1), false);
$$;

revoke all on function public.public_qr_page_enabled() from public;
grant execute on function public.public_qr_page_enabled() to anon, authenticated, service_role;

-- 4) Minimal public dress card (no prices, no status). Empty when the page is
--    disabled or the code is unknown.
create or replace function public.get_public_dress(p_code text)
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
  where d.code = p_code
    and d.deleted_at is null
    and (select public_qr_page from public.app_settings where id = 1) = true
$$;

revoke all on function public.get_public_dress(text) from public;
grant execute on function public.get_public_dress(text) to anon, authenticated, service_role;
