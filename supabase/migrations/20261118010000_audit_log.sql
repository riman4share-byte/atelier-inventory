-- ---------------------------------------------------------------------------
-- Audit log: record who changed what, and when, for PII-bearing tables.
--
-- The audit_log table uses columns: entity, entity_id, action, user_id, diff.
-- ---------------------------------------------------------------------------

create or replace function public.audit_log_customers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (entity, entity_id, action, user_id, diff)
    values ('customers', new.id, 'insert', auth.uid(), jsonb_build_object('new', to_jsonb(new)));
  elsif tg_op = 'UPDATE' then
    insert into public.audit_log (entity, entity_id, action, user_id, diff)
    values ('customers', new.id, 'update', auth.uid(), jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new)));
  elsif tg_op = 'DELETE' then
    insert into public.audit_log (entity, entity_id, action, user_id, diff)
    values ('customers', old.id, 'delete', auth.uid(), jsonb_build_object('old', to_jsonb(old)));
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists customers_audit on public.customers;
create trigger customers_audit
  after insert or update or delete on public.customers
  for each row execute function public.audit_log_customers();

-- Dress movements are already append-only; log inserts for the audit trail.
create or replace function public.audit_log_dress_movements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (entity, entity_id, action, user_id, diff)
  values ('dress_movements', new.id, 'insert', auth.uid(), to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists dress_movements_audit on public.dress_movements;
create trigger dress_movements_audit
  after insert on public.dress_movements
  for each row execute function public.audit_log_dress_movements();
