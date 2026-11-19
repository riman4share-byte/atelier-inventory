import { useAtelierBranding } from '@/features/branding/useAtelierBranding';
import { supabase } from '@/lib/supabase';
import { cx } from '@/lib/cx';

/**
 * The software credit.
 *
 * The app was built for the atelier, and the atelier owns it. The credit
 * sits in the footers: on the sign-in screen, on the account screen, on the
 * public page a customer reaches by scanning the QR, and in the printed
 * documents.
 *
 * It is a setting, so the owner can change the wording or clear it entirely
 * without anyone touching the code.
 */
export function PoweredBy({
  className,
  tone = 'faint',
}: {
  className?: string;
  /** How quiet it should be. */
  tone?: 'faint' | 'muted';
}) {
  const branding = useAtelierBranding();
  if (!branding.poweredBy) return null;

  // The software credit carries its own mark: the KT logo sits next to the
  // "Powered by Kais" line, so the credit is recognisable at a glance.
  const ktLogoUrl = (supabase as NonNullable<typeof supabase>)
    .storage.from('atelier-logo')
    .getPublicUrl('powered-by-logo.png').data.publicUrl;

  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 text-micro tracking-wide',
        tone === 'faint' ? 'text-faint' : 'text-muted',
        className,
      )}
      data-testid="powered-by"
    >
      <img
        src={ktLogoUrl}
        alt=""
        aria-hidden="true"
        className="h-3.5 w-auto shrink-0 opacity-80"
        loading="lazy"
      />
      {branding.poweredBy}
    </span>
  );
}
