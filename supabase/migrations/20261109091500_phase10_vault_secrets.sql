-- Atelier Inventory – Phase 10: Vault-backed integration secrets.
--
-- API keys live in Supabase Vault; the `integrations` table only stores the
-- secret's uuid and a 4-character hint. No query can ever return the key.

create or replace function public.store_integration_secret(
  p_secret_name text,
  p_secret_value text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- one secret per name: replace any previous value
  delete from vault.secrets where name = p_secret_name;
  v_id := vault.create_secret(p_secret_name, p_secret_value);
  return v_id;
end;
$$;

revoke all on function public.store_integration_secret(text, text) from public;
revoke all on function public.store_integration_secret(text, text) from anon;
revoke all on function public.store_integration_secret(text, text) from authenticated;
grant execute on function public.store_integration_secret(text, text) to service_role;

-- Reading a secret for use (e.g. calling the provider) is service-role only.
create or replace function public.read_integration_secret(p_secret_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_value text;
begin
  select decrypted_secret into v_value
  from vault.decrypted_secrets
  where name = p_secret_name
  limit 1;
  return v_value;
end;
$$;

revoke all on function public.read_integration_secret(text) from public;
revoke all on function public.read_integration_secret(text) from anon;
revoke all on function public.read_integration_secret(text) from authenticated;
grant execute on function public.read_integration_secret(text) to service_role;
