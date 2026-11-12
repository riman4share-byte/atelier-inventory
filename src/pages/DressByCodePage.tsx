import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/useAuth';
import { useAtelierBranding } from '@/features/branding/useAtelierBranding';
import { Screen } from '@/components/layout/Screen';
import { Spinner } from '@/components/ui/Spinner';
import { GownIcon } from '@/components/icons';
import { paletteForCode } from '@/features/dresses/StatusPill';
import { cx } from '@/lib/cx';

/**
 * Resolves a dress by its public token for staff (RLS allows staff to read
 * all). The token, not the code, is what the printed QR carries: dress codes
 * are sequential, so a code-based public page would let anyone enumerate the
 * whole catalogue.
 */
function useDressIdByToken(token: string, enabled: boolean) {
  return useQuery({
    queryKey: ['dress-by-token', token],
    enabled,
    queryFn: async (): Promise<string | null> => {
      const client = supabase as NonNullable<typeof supabase>;
      const { data, error } = await client
        .from('dresses')
        .select('id')
        .eq('public_token', token)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      return data?.id ?? null;
    },
  });
}

/** Minimal public card (no prices, no status). */
function usePublicDress(token: string, enabled: boolean) {
  return useQuery({
    queryKey: ['public-dress', token],
    enabled,
    queryFn: async () => {
      const client = supabase as NonNullable<typeof supabase>;
      const { data, error } = await client.rpc('get_public_dress', { p_token: token });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}

/**
 * The first photograph of the dress, for the public card.
 *
 * A bride who scans the tag on her own dress has to see the dress. The
 * photos live in a private bucket, so the public card asks for one through
 * a function that only answers for a token the caller already holds.
 */
function usePublicDressPhoto(token: string, enabled: boolean) {
  return useQuery({
    queryKey: ['public-dress-photo', token],
    enabled,
    queryFn: async (): Promise<string | null> => {
      const client = supabase as NonNullable<typeof supabase>;
      const { data, error } = await client.rpc('get_public_dress_photo', { p_token: token });
      if (error) return null;
      const row = (data as { original_path?: string }[] | null)?.[0];
      if (!row?.original_path) return null;
      // The bucket is private, so the path has to be signed. The signature
      // is short-lived: the page is read once, when the customer scans.
      const { data: signed, error: signError } = await client.storage
        .from('dress-originals')
        .createSignedUrl(row.original_path, 600);
      if (signError || !signed) return null;
      return signed.signedUrl;
    },
  });
}

export function DressByCodePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { token = '' } = useParams<{ token: string }>();
  const { profile } = useAuth();
  const isStaff = Boolean(profile);

  const staffLookup = useDressIdByToken(token, isStaff);
  const publicLookup = usePublicDress(token, !isStaff);
  const publicPhoto = usePublicDressPhoto(token, !isStaff);
  // The atelier's name and logo.
  const branding = useAtelierBranding();

  useEffect(() => {
    if (isStaff && staffLookup.data) {
      navigate(`/dresses/${staffLookup.data}`, { replace: true });
    }
  }, [isStaff, staffLookup.data, navigate]);

  if (isStaff) {
    if (staffLookup.isLoading) {
      return (
        <div className="grid min-h-dvh place-items-center">
          <Spinner className="h-6 w-6 text-accent" />
        </div>
      );
    }
    if (!staffLookup.data) {
      return (
        <Screen title={t('dress.errors.notFoundTitle')}>
          <p className="text-small text-muted">{t('dress.errors.notFoundBody')}</p>
        </Screen>
      );
    }
    return null; // redirecting
  }

  // Public (signed-out) path
  if (publicLookup.isLoading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner className="h-6 w-6 text-accent" />
      </div>
    );
  }

  const dress = publicLookup.data;
  if (!dress) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-3 px-5 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-field border border-line bg-surface-2 text-muted">
          <GownIcon className="h-6 w-6" />
        </span>
        <h1 className="text-title font-semibold tracking-tight text-ink">{t('dress.staffOnlyTitle')}</h1>
        <p className="max-w-[36ch] text-small text-muted">{t('dress.staffOnlyBody')}</p>
      </div>
    );
  }

  const isArabic = i18n.language.startsWith('ar');
  const name = (isArabic ? dress.name_ar : dress.name_en) || (isArabic ? dress.name_en : dress.name_ar) || dress.code;
  const description = isArabic ? dress.description_ar || dress.description_en : dress.description_en || dress.description_ar;
  const palette = paletteForCode(dress.code);

  return (
    <div
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-10"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <header className="pb-6">
        <div className="flex items-center gap-3">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.atelierName}
              className="h-11 w-11 shrink-0 rounded-field border border-line bg-surface object-contain p-1"
            />
          ) : null}
          <div className="min-w-0">
            <h1 className="text-hero font-semibold tracking-tight text-ink">{branding.atelierName}</h1>
            <p className="mt-0.5 text-small text-muted">{t('dress.publicCardSubtitle')}</p>
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4">
        <article className="overflow-hidden rounded-card border border-line bg-surface">
          {publicPhoto.data ? (
            <img
              src={publicPhoto.data}
              alt={name}
              className="aspect-[3/4] w-full bg-surface-3 object-cover"
            />
          ) : (
            <div className={cx('flex aspect-[3/4] w-full items-center justify-center', palette.tile)}>
              <GownIcon className={cx('h-20 w-auto', palette.icon)} />
            </div>
          )}
          <div className="border-t border-line p-4">
            <h2 className="text-title font-semibold tracking-tight text-ink">{name}</h2>
            <p className="mt-1 font-mono text-caption tracking-tight text-muted">{dress.code}</p>
            {description ? (
              <p className="mt-3 text-small leading-relaxed text-ink">{description}</p>
            ) : null}
          </div>
        </article>
        <p className="mt-1 text-note text-faint">{t('dress.publicCardFooter')}</p>
      </main>
    </div>
  );
}
