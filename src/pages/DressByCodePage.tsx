import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/useAuth';
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

export function DressByCodePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { token = '' } = useParams<{ token: string }>();
  const { profile } = useAuth();
  const isStaff = Boolean(profile);

  const staffLookup = useDressIdByToken(token, isStaff);
  const publicLookup = usePublicDress(token, !isStaff);

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
      <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-3 px-5 text-center">
        <GownIcon className="h-16 w-auto text-accent opacity-60" />
        <h1 className="text-title font-serif font-semibold text-ink">{t('dress.staffOnlyTitle')}</h1>
        <p className="text-small text-muted">{t('dress.staffOnlyBody')}</p>
      </div>
    );
  }

  const isArabic = i18n.language.startsWith('ar');
  const name = (isArabic ? dress.name_ar : dress.name_en) || (isArabic ? dress.name_en : dress.name_ar) || dress.code;
  const description = isArabic ? dress.description_ar || dress.description_en : dress.description_en || dress.description_ar;
  const palette = paletteForCode(dress.code);

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col px-5 py-10">
      <header className="pb-6">
        <h1 className="text-hero font-serif font-semibold text-ink">{t('app.name')}</h1>
        <p className="mt-1 text-small text-muted">{t('dress.publicCardSubtitle')}</p>
      </header>
      <main className="flex flex-1 flex-col gap-4">
        <div className={cx('flex aspect-[3/4] w-full items-center justify-center rounded-card', palette.tile)}>
          <GownIcon className={cx('h-20 w-auto drop-shadow-md', palette.icon)} />
        </div>
        <div>
          <h2 className="text-title font-serif font-semibold text-ink">{name}</h2>
          <p className="mt-0.5 text-note text-muted">{dress.code}</p>
        </div>
        {description ? <p className="text-small text-ink">{description}</p> : null}
        <p className="mt-4 text-note text-muted">{t('dress.publicCardFooter')}</p>
      </main>
    </div>
  );
}
