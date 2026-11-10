import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
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

  useEffect(() => {
    if (status === 'signedIn') navigate(safeFrom, { replace: true });
  }, [status, safeFrom, navigate]);

  if (!isSupabaseConfigured) return <Navigate to="/setup" replace />;
  if (status === 'loading') return <FullScreenLoader />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      const emailInvalid = parsed.error.issues.some(
        (issue) => issue.path[0] === 'email' && issue.code === 'invalid_string',
      );
      setFormError(t(emailInvalid ? 'auth.invalidEmail' : 'auth.missingFields'));
      return;
    }

    setSubmitting(true);
    const error = await signIn(parsed.data.email, parsed.data.password);
    setSubmitting(false);
    if (error === 'invalid') setFormError(t('auth.invalid'));
    if (error === 'unknown') setFormError(t('errors.unknown'));
  }

  return (
    <div className="min-h-dvh bg-bg md:grid md:place-items-center md:p-6">
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-surface md:min-h-0 md:rounded-sheet md:border md:border-line md:shadow-frame">
        <header className="bg-brand px-6 pb-12 pt-safe text-white">
          <div className="flex justify-end pt-3">
            <LanguageToggle tone="onBrand" />
          </div>
          <h1 className="mt-8 text-hero text-white">{t('app.name')}</h1>
          <p className="mt-1 text-small text-white/85">{t('app.tagline')}</p>
        </header>

        <main className="-mt-6 flex flex-1 flex-col rounded-t-sheet bg-surface px-6 pb-10 pt-7">
          <h2 className="text-title">{t('auth.welcome')}</h2>
          <p className="mt-1 text-small text-muted">{t('auth.subtitle')}</p>

          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
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
              <p role="alert" className="rounded-field bg-danger-bg px-3 py-2 text-small text-danger">
                {formError}
              </p>
            ) : null}

            <Button type="submit" loading={submitting}>
              {submitting ? t('auth.signingIn') : t('auth.signIn')}
            </Button>
          </form>
        </main>
      </div>
    </div>
  );
}
