import { useAtelierBranding } from '@/features/branding/useAtelierBranding';
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

  return (
    <p
      className={cx(
        'text-micro tracking-wide',
        tone === 'faint' ? 'text-faint' : 'text-muted',
        className,
      )}
      data-testid="powered-by"
    >
      {branding.poweredBy}
    </p>
  );
}
