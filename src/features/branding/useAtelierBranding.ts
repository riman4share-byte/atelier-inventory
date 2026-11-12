import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AtelierBranding {
  /** The shop's name: "Riman Fashion". */
  atelierName: string;
  /** One line under the name: what it makes and where it is. */
  tagline: string | null;
  /** How to reach the atelier: phone, email, address. */
  contact: string | null;
  /** The path of the logo in the `atelier-logo` bucket, or null. */
  logoPath: string | null;
  /** The public URL of the logo, ready for an <img> or a printed document. */
  logoUrl: string | null;
}

/**
 * The atelier's name and logo.
 *
 * Read through a public function rather than the settings table, because
 * staff cannot read the settings table (it holds secrets) and the public
 * page certainly cannot. The function exposes only the two fields the
 * branding needs.
 */
export function useAtelierBranding(): AtelierBranding {
  const client = supabase as NonNullable<typeof supabase>;

  const { data } = useQuery({
    queryKey: ['atelier-branding'],
    queryFn: async (): Promise<{
      atelier_name: string;
      tagline: string | null;
      contact: string | null;
      logo_path: string | null;
    } | null> => {
      const { data: rows, error } = await client.rpc('get_atelier_branding');
      if (error) return null;
      const row = (rows as unknown as {
        atelier_name?: string;
        tagline?: string | null;
        contact?: string | null;
        logo_path?: string | null;
      }[] | null)?.[0];
      if (!row) return null;
      return {
        atelier_name: row.atelier_name || 'Atelier',
        tagline: row.tagline ?? null,
        contact: row.contact ?? null,
        logo_path: row.logo_path ?? null,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const logoPath = data?.logo_path ?? null;
  const logoUrl = logoPath
    ? client.storage.from('atelier-logo').getPublicUrl(logoPath).data.publicUrl
    : null;

  return {
    atelierName: data?.atelier_name || 'Atelier',
    tagline: data?.tagline ?? null,
    contact: data?.contact ?? null,
    logoPath,
    logoUrl,
  };
}
