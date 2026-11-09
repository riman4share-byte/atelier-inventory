/**
 * Reads the public Supabase configuration. Anything returned here is safe to
 * ship in the browser bundle: the anon key is a public key, protected by RLS.
 * The service role key must never be referenced by VITE_ variables.
 */
export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const PLACEHOLDER_PATTERN = /your-|example|changeme|xxxx/i;

export function readSupabaseConfig(): SupabaseConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (typeof url !== 'string' || typeof anonKey !== 'string') return null;
  if (!url.trim() || !anonKey.trim()) return null;
  if (PLACEHOLDER_PATTERN.test(url) || PLACEHOLDER_PATTERN.test(anonKey)) return null;
  if (!/^https?:\/\/[^/\s]+/.test(url.trim())) return null;

  return { url: url.trim().replace(/\/+$/, ''), anonKey: anonKey.trim() };
}
