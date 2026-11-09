import { afterEach, describe, expect, it, vi } from 'vitest';
import { readSupabaseConfig } from './env';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('readSupabaseConfig', () => {
  it('returns null when the project is not configured', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    expect(readSupabaseConfig()).toBeNull();
  });

  it('rejects the placeholder values from .env.example', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://your-project-ref.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'your-anon-key');
    expect(readSupabaseConfig()).toBeNull();
  });

  it('rejects a non-http url', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'file:///tmp/supabase');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
    expect(readSupabaseConfig()).toBeNull();
  });

  it('trims whitespace and a trailing slash', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '  https://abc123.supabase.co/  ');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '  anon-key  ');
    expect(readSupabaseConfig()).toEqual({
      url: 'https://abc123.supabase.co',
      anonKey: 'anon-key',
    });
  });
});
