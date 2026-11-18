-- Fix audit_log trigger column names (entity, entity_id, user_id, diff).
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
