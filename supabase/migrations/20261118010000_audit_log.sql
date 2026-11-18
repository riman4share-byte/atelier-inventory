-- ---------------------------------------------------------------------------
-- Audit log: record who changed what, and when, for PII-bearing tables.
--
-- Before this, audit_log existed (created in init) but nothing ever wrote to
-- it. Customer names, phones and measurements are personal data, and there
-- was no trail.
-- ---------------------------------------------------------------------------

create or replace function public.audit_log_customers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (table_name, row_id, action, performed_by, new_values)
    values ('customers', new.id, 'insert', auth.uid(), to_jsonb(new));
  elsif tg_op = 'UPDATE' then
    insert into public.audit_log (table_name, row_id, action, performed_by, old_values, new_values)
    values ('customers', new.id, 'update', auth.uid(), to_jsonb(old), to_jsonb(new));
  elsif tg_op = 'DELETE' then
    insert into public.audit_log (table_name, row_id, action, performed_by, old_values)
    values ('customers', old.id, 'delete', auth.uid(), to_jsonb(old));
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
  insert into public.audit_log (table_name, row_id, action, performed_by, new_values)
  values ('dress_movements', new.id, 'insert', auth.uid(), to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists dress_movements_audit on public.dress_movements;
create trigger dress_movements_audit
  after insert on public.dress_movements
  for each row execute function public.audit_log_dress_movements();
