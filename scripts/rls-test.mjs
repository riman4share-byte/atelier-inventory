#!/usr/bin/env node
/**
 * RLS acceptance test.
 *
 * Creates two temporary users (staff and admin) and one temporary dress
 * through the service role, then uses the public anon key to prove that:
 *   - staff can read inventory and write a dress;
 *   - staff cannot read or write admin-only tables;
 *   - staff cannot read other profiles or promote themselves;
 *   - anon cannot read or write inventory;
 *   - a dress cannot be hard deleted.
 * Everything created here is deleted at the end.
 *
 * Run: npm run rls:test   (needs SUPABASE_URL, anon key and service role key)
 */
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

function loadEnvFiles() {
  for (const file of ['.env.local', '.env']) {
    try {
      process.loadEnvFile(file);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

function fail(message) {
  console.error(`\nRLS test cannot run: ${message}\n`);
  process.exit(1);
}

loadEnvFiles();

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) fail('set SUPABASE_URL (or VITE_SUPABASE_URL).');
if (!anonKey) fail('set SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY).');
if (!serviceRoleKey) fail('set SUPABASE_SERVICE_ROLE_KEY (the test needs it to create users).');
if (serviceRoleKey === anonKey) fail('the service role key and anon key are the same value.');

const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
const password = process.env.RLS_TEST_PASSWORD ?? `Rls-${suffix}-Aa1!`;
const staffEmail = `rls-staff-${suffix}@example.com`;
const adminEmail = `rls-admin-${suffix}@example.com`;
const dressCode = `RLSTEST-${suffix.toUpperCase()}`;

const service = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const results = [];

async function check(name, run) {
  try {
    const outcome = await run();
    if (outcome === true) {
      results.push({ name, ok: true, detail: '' });
    } else {
      results.push({ name, ok: false, detail: typeof outcome === 'string' ? outcome : 'unexpected access' });
    }
  } catch (error) {
    results.push({ name, ok: false, detail: error instanceof Error ? error.message : String(error) });
  }
}

function denied(result) {
  if (result.error) return true;
  return Array.isArray(result.data) ? result.data.length === 0 : result.data == null;
}

async function createUser(email) {
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'RLS check' },
  });
  if (error) throw new Error(`could not create ${email}: ${error.message}`);
  return data.user.id;
}

async function signIn(email) {
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`could not sign in ${email}: ${error.message}`);
  return client;
}

const createdUserIds = [];
let createdDressId = null;

async function main() {
  const staffId = await createUser(staffEmail);
  createdUserIds.push(staffId);
  const adminId = await createUser(adminEmail);
  createdUserIds.push(adminId);

  // Promote the second user through the service role.
  const { error: promoteError } = await service.from('profiles').update({ role: 'admin' }).eq('id', adminId);
  if (promoteError) throw new Error(`could not promote test admin: ${promoteError.message}`);

  const staff = await signIn(staffEmail);
  const adminUser = await signIn(adminEmail);
  const anon = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });

  await check('anon cannot read dresses', async () => {
    const result = await anon.from('dresses').select('id').limit(1);
    return denied(result) ? true : 'anon saw dress rows';
  });

  await check('anon cannot insert a dress', async () => {
    const result = await anon
      .from('dresses')
      .insert({ code: `${dressCode}-ANON`, name_en: 'Anon', name_ar: 'مجهول' })
      .select();
    return result.error ? true : 'anon inserted a dress';
  });

  await check('staff can read dresses', async () => {
    const result = await staff.from('dresses').select('id').limit(1);
    return result.error ? `read failed: ${result.error.message}` : true;
  });

  await check('staff cannot read app_settings', async () => {
    const result = await staff.from('app_settings').select('id');
    return denied(result) ? true : 'staff saw app settings';
  });

  await check('staff cannot update app_settings', async () => {
    const result = await staff.from('app_settings').update({ atelier_name: 'Hacked' }).eq('id', 1).select();
    return denied(result) ? true : 'staff changed app settings';
  });

  await check('staff cannot read integrations', async () => {
    const result = await staff.from('integrations').select('id');
    return denied(result) ? true : 'staff saw integrations';
  });

  await check('staff cannot insert an integration', async () => {
    const result = await staff
      .from('integrations')
      .insert({ kind: 'vision', provider: 'test', label: 'test', enabled: false })
      .select();
    return result.error ? true : 'staff inserted an integration';
  });

  await check('staff cannot read the audit log', async () => {
    const result = await staff.from('audit_log').select('id');
    return denied(result) ? true : 'staff saw the audit log';
  });

  await check('staff cannot read another profile', async () => {
    const result = await staff.from('profiles').select('id').eq('id', adminId);
    return denied(result) ? true : 'staff saw the admin profile';
  });

  await check('staff cannot promote themselves to admin', async () => {
    const result = await staff.from('profiles').update({ role: 'admin' }).eq('id', staffId).select();
    return result.error ? true : 'staff changed their own role';
  });

  await check('staff can create a dress', async () => {
    const result = await staff
      .from('dresses')
      .insert({ code: dressCode, name_en: 'RLS test', name_ar: 'اختبار' })
      .select('id')
      .single();
    if (result.error) return `insert failed: ${result.error.message}`;
    createdDressId = result.data.id;
    return true;
  });

  await check('staff cannot hard delete a dress', async () => {
    if (!createdDressId) return 'the dress was not created';
    const deleted = await staff.from('dresses').delete().eq('id', createdDressId).select();
    const stillThere = await staff.from('dresses').select('id').eq('id', createdDressId).maybeSingle();
    return deleted.error || stillThere.data ? true : 'the dress was deleted';
  });

  await check('admin can read app_settings', async () => {
    const result = await adminUser.from('app_settings').select('id').eq('id', 1);
    if (result.error) return `read failed: ${result.error.message}`;
    return result.data?.length === 1 ? true : 'admin could not see the settings row';
  });

  await check('admin can read integrations', async () => {
    const result = await adminUser.from('integrations').select('id').limit(1);
    return result.error ? `read failed: ${result.error.message}` : true;
  });

  await check('admin can read the audit log', async () => {
    const result = await adminUser.from('audit_log').select('id').limit(1);
    return result.error ? `read failed: ${result.error.message}` : true;
  });
}

async function cleanup() {
  if (createdDressId) await service.from('dresses').delete().eq('id', createdDressId);
  for (const id of createdUserIds) {
    await service.auth.admin.deleteUser(id).catch(() => undefined);
  }
}

main()
  .catch((error) => {
    console.error(`\nRLS test aborted: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();

    if (results.length === 0) {
      process.exit(process.exitCode ?? 1);
    }

    const width = Math.max(...results.map((result) => result.name.length));
    console.log('\nRLS acceptance checks\n');
    for (const result of results) {
      const mark = result.ok ? 'PASS' : 'FAIL';
      console.log(`${mark}  ${result.name.padEnd(width)}  ${result.detail}`);
    }
    const failed = results.filter((result) => !result.ok).length;
    console.log(`\n${results.length - failed}/${results.length} passed\n`);
    if (failed > 0) process.exitCode = 1;
  });
