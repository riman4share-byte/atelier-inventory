#!/usr/bin/env node
/**
 * Phase 1 seed: one admin user, app settings, sample materials and four
 * dresses without photos. Idempotent: safe to run more than once.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (never expose it to the browser bundle).
 */
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
  console.error(`\nSeed failed: ${message}\n`);
  process.exit(1);
}

loadEnvFiles();

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.SEED_ADMIN_EMAIL;
const adminPassword = process.env.SEED_ADMIN_PASSWORD;
const atelierName = process.env.SEED_ATELIER_NAME ?? 'Atelier';

if (!url) fail('Set SUPABASE_URL (or VITE_SUPABASE_URL) in .env.local.');
if (!serviceRoleKey) fail('Set SUPABASE_SERVICE_ROLE_KEY in .env.local.');
if (serviceRoleKey === process.env.VITE_SUPABASE_ANON_KEY) {
  fail('SUPABASE_SERVICE_ROLE_KEY looks like the anon key. Use the service role key.');
}
if (!adminEmail || !adminPassword) {
  fail('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env.local.');
}
if (adminPassword.length < 6) fail('SEED_ADMIN_PASSWORD must be at least 6 characters.');

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SAMPLE_MATERIALS = [
  {
    name_en: 'Crystal 4 mm',
    name_ar: 'كريستال 4 مم',
    category: 'crystal',
    color: 'Clear',
    supplier: 'Swarovski',
    unit: 'piece',
    stock_qty: 1800,
    low_stock_threshold: 400,
    unit_cost: 0.9,
  },
  {
    name_en: 'Pearl 6 mm',
    name_ar: 'لؤلؤ 6 مم',
    category: 'pearl',
    color: 'Ivory',
    supplier: 'Supplier A',
    unit: 'piece',
    stock_qty: 140,
    low_stock_threshold: 200,
    unit_cost: 0.4,
  },
  {
    name_en: 'Soft tulle',
    name_ar: 'تول ناعم',
    category: 'fabric',
    color: 'Ivory',
    supplier: 'Fabric house',
    unit: 'meter',
    stock_qty: 38,
    low_stock_threshold: 15,
    unit_cost: 22,
  },
  {
    name_en: 'French lace',
    name_ar: 'دانتيل فرنسي',
    category: 'lace',
    color: 'Ivory',
    supplier: 'Fabric house',
    unit: 'meter',
    stock_qty: 22,
    low_stock_threshold: 10,
    unit_cost: 65,
  },
  {
    name_en: 'Bead, blush',
    name_ar: 'خرز وردي',
    category: 'bead',
    color: 'Blush',
    supplier: 'Supplier B',
    unit: 'kg',
    stock_qty: 5,
    low_stock_threshold: 2,
    unit_cost: 80,
  },
];

const SAMPLE_DRESSES = [
  {
    code: 'RF-0001',
    name_en: 'Seraphine',
    name_ar: 'سيرافين',
    description_en: 'A flowing A-line gown with a deep V-neckline and delicate lace sleeves.',
    description_ar: 'فستان بقصة A-line انسيابية مع رقبة V عميقة وأكمام دانتيل ناعمة.',
    silhouette: 'A-line',
    neckline: 'V-neck',
    sleeves: 'Long sleeve',
    fabrics: ['Lace', 'Tulle'],
    color: 'Ivory',
    size_label: 'M',
    status: 'available',
    listing_type: 'both',
    sale_price: 3500,
    rent_price: 600,
  },
  {
    code: 'RF-0002',
    name_en: 'Noor',
    name_ar: 'نور',
    description_en: 'A soft mermaid gown with hand-set pearls across the bodice.',
    description_ar: 'فستان حورية ناعم مع لؤلؤ مرصّع يدوياً على الصدر.',
    silhouette: 'Mermaid',
    neckline: 'Sweetheart',
    sleeves: 'Sleeveless',
    fabrics: ['Satin', 'Pearl'],
    color: 'Champagne',
    size_label: 'S',
    status: 'reserved',
    listing_type: 'rent',
    sale_price: null,
    rent_price: 750,
  },
  {
    code: 'RF-0003',
    name_en: 'Layla',
    name_ar: 'ليلى',
    description_en: 'A romantic ball gown with layered tulle and a crystal belt.',
    description_ar: 'فستان سهرة رومانسي بطبقات التول وحزام من الكريستال.',
    silhouette: 'Ball gown',
    neckline: 'Off-shoulder',
    sleeves: 'Cap sleeve',
    fabrics: ['Tulle', 'Crystal'],
    color: 'Blush',
    size_label: 'M',
    status: 'rented',
    listing_type: 'rent',
    sale_price: null,
    rent_price: 900,
  },
  {
    code: 'RF-0004',
    name_en: 'Amira',
    name_ar: 'أميرة',
    description_en: 'A clean crepe sheath with a dramatic open back.',
    description_ar: 'فستان كريب مستقيم بظهر مفتوح لافت.',
    silhouette: 'Sheath',
    neckline: 'Halter',
    sleeves: 'Sleeveless',
    fabrics: ['Crepe'],
    color: 'White',
    size_label: 'L',
    status: 'sold',
    listing_type: 'sale',
    sale_price: 5000,
    rent_price: null,
  },
];

async function ensureAdminUser() {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) fail(`could not list users: ${error.message}`);

  const existing = data.users.find((user) => user.email?.toLowerCase() === adminEmail.toLowerCase());
  let userId = existing?.id;

  if (!userId) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Atelier owner' },
    });
    if (createError) fail(`could not create the admin user: ${createError.message}`);
    userId = created.user.id;
    console.log(`Created admin user ${adminEmail}`);
  } else {
    console.log(`Admin user ${adminEmail} already exists`);
  }

  const { error: profileError } = await admin
    .from('profiles')
    .upsert({ id: userId, full_name: 'Atelier owner', role: 'admin', language: 'en' }, { onConflict: 'id' });
  if (profileError) fail(`could not save the admin profile: ${profileError.message}`);
  return userId;
}

async function ensureMaterial(material) {
  const { data, error } = await admin
    .from('materials')
    .select('id')
    .eq('name_en', material.name_en)
    .maybeSingle();
  if (error) fail(`could not read materials: ${error.message}`);
  if (data) return false;

  const { error: insertError } = await admin.from('materials').insert(material);
  if (insertError) fail(`could not insert ${material.name_en}: ${insertError.message}`);
  return true;
}

async function ensureDress(dress, adminId) {
  const { data, error } = await admin.from('dresses').select('id').eq('code', dress.code).maybeSingle();
  if (error) fail(`could not read dresses: ${error.message}`);
  if (data) return false;

  const { error: insertError } = await admin.from('dresses').insert({ ...dress, created_by: adminId });
  if (insertError) fail(`could not insert ${dress.code}: ${insertError.message}`);
  return true;
}

async function main() {
  const adminId = await ensureAdminUser();

  const { error: settingsError } = await admin
    .from('app_settings')
    .update({
      atelier_name: atelierName,
      code_prefix: 'RF',
      next_code_number: 5,
      default_language: 'en',
    })
    .eq('id', 1);
  if (settingsError) fail(`could not update app_settings: ${settingsError.message}`);
  console.log(`Settings ready for "${atelierName}"`);

  let newMaterials = 0;
  for (const material of SAMPLE_MATERIALS) {
    if (await ensureMaterial(material)) newMaterials += 1;
  }

  let newDresses = 0;
  for (const dress of SAMPLE_DRESSES) {
    if (await ensureDress(dress, adminId)) newDresses += 1;
  }

  console.log(`Added ${newMaterials} materials and ${newDresses} dresses (existing rows were kept).`);
  console.log('\nSeed complete. Sign in with the admin email and password from .env.local.\n');
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
