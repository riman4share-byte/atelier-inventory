import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { FullScreenLoader } from '@/components/layout/FullScreenLoader';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from './useAuth';

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export function LoginPage() {
  const { t } = useTranslation();
  const { status, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/dresses';
  // Only an internal, single-slash path may be used as a redirect target.
  // "//evil.example.com" is protocol-relative and would leave the app.
  const safeFrom = from.startsWith('/') && !from.startsWith('//') ? from : '/dresses';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isSupabaseConfigured) return <Navigate to="/setup" replace />;
  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'signedIn') navigate(safeFrom, { replace: true });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFormError(t('auth.missingFields'));
      return;
    }

    setSubmitting(true);
    const error = await signIn(parsed.data.email, parsed.data.password);
    setSubmitting(false);
    if (error === 'invalid') setFormError(t('auth.invalid'));
    if (error === 'unknown') setFormError(t('errors.unknown'));
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 pt-safe">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-accent">
            Atelier
          </span>
          <span className="text-note text-muted">{t('app.tagline')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-8 md:items-center">
        <div className="w-full max-w-sm rounded-card border border-line bg-surface">
          <div className="border-b border-line px-5 py-4">
            <h1 className="text-title font-semibold tracking-tight text-ink">{t('auth.welcome')}</h1>
            <p className="mt-0.5 text-note text-muted">{t('auth.subtitle')}</p>
          </div>

          <form className="flex flex-col gap-3.5 px-5 py-5" onSubmit={handleSubmit} noValidate>
            <TextField
              label={t('auth.email')}
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <TextField
              label={t('auth.password')}
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            {formError ? (
              <p role="alert" className="rounded-field border border-danger-line bg-danger-bg px-2.5 py-1.5 text-small text-danger">
                {formError}
              </p>
            ) : null}

            <Button type="submit" loading={submitting} className="mt-1">
              {submitting ? t('auth.signingIn') : t('auth.signIn')}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
