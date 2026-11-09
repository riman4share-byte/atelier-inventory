import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { readSupabaseConfig } from './env';

const config = readSupabaseConfig();

/**
 * Null when the app has no Supabase project configured yet. Callers must
 * handle that state with the setup screen instead of crashing.
 */
export const supabase: SupabaseClient<Database> | null = config
  ? createClient<Database>(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const isSupabaseConfigured = supabase !== null;
