-- Update adjust_material_stock to reject negative stock.
create or replace function public.adjust_material_stock(
  p_material_id  uuid,
  p_delta        numeric,
  p_reason       public.stock_reason,
  p_performed_by uuid
) returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_qty numeric;
begin
  update public.materials
  set stock_qty = stock_qty + p_delta
  where id = p_material_id
    and stock_qty + p_delta >= 0
  returning stock_qty into v_new_qty;

  if v_new_qty is null then
    if not exists (select 1 from public.materials where id = p_material_id) then
      raise exception 'material not found' using errcode = 'P0001';
    end if;
    raise exception 'negative stock' using errcode = 'P0002';
  end if;

  insert into public.stock_movements (material_id, delta, reason, created_by)
  values (p_material_id, p_delta, p_reason, p_performed_by);

  return v_new_qty;
end;
$$;

revoke all on function public.adjust_material_stock(uuid, numeric, public.stock_reason, uuid) from public, anon;
grant execute on function public.adjust_material_stock(uuid, numeric, public.stock_reason, uuid) to authenticated;
