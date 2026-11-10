import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';

const KINDS = ['vision', 'background_removal', 'translation', 'storage', 'erp', 'custom'] as const;

/** Admin-only control panel for API keys, integrations and shop settings. */
export function ToolsPanel() {
  const { t } = useTranslation();
  const [kind, setKind] = useState<string>('vision');
  const [provider, setProvider] = useState<string>('gemini');
  const [model, setModel] = useState<string>('gemini-2.5-flash');
  const [key, setKey] = useState<string>('');
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // The public dress page is a shop setting: it decides whether a customer
  // who scans the QR on a hang tag sees the dress card or nothing.
  const [publicPage, setPublicPage] = useState<boolean | null>(null);
  const [publicPageSaving, setPublicPageSaving] = useState(false);
  const [publicPageError, setPublicPageError] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase as NonNullable<typeof supabase>;
    void client
      .from('app_settings')
      .select('public_qr_page')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setPublicPageError(t('tools.publicPageLoadFailed'));
          return;
        }
        setPublicPage(data?.public_qr_page ?? false);
      });
  }, [t]);

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const { data, error } = await (supabase as NonNullable<typeof supabase>).functions.invoke('save-integration', {
        body: { kind, provider, model, key },
      });
      if (error) throw error;
      setStatus({ ok: true, text: data?.hint ? t('tools.saved', { hint: data.hint }) : t('tools.savedGeneric') });
      setKey('');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setStatus({
        ok: false,
        text: message === 'no_vault' ? t('tools.noVault') : t('tools.saveFailed'),
      });
    } finally {
      setSaving(false);
    }
  };

  const togglePublicPage = async () => {
    const next = !publicPage;
    setPublicPage(next);
    setPublicPageSaving(true);
    setPublicPageError(null);
    const { error } = await (supabase as NonNullable<typeof supabase>)
      .from('app_settings')
      .update({ public_qr_page: next })
      .eq('id', 1);
    setPublicPageSaving(false);
    if (error) {
      setPublicPage(!next); // put the switch back where it was
      setPublicPageError(t('tools.publicPageSaveFailed'));
    }
  };

  return (
    <section className="mt-6 rounded-card border border-line p-4" data-testid="tools-panel">
      <h2 className="text-caption font-semibold text-muted">{t('tools.title')}</h2>
      <p className="mt-1 text-note text-muted">{t('tools.hint')}</p>
      <div className="mt-3 flex flex-col gap-2">
        <label className="text-caption font-semibold text-muted" htmlFor="tools-kind">
          {t('tools.kindLabel')}
        </label>
        <select id="tools-kind" value={kind} onChange={(e) => setKind(e.target.value)}
          className="min-h-tap w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink">
          {KINDS.map((k) => <option key={k} value={k}>{t(`tools.kind.${k}`)}</option>)}
        </select>
        <TextField label={t('tools.provider')} value={provider} onChange={(e) => setProvider(e.target.value)} />
        <TextField label={t('tools.model')} value={model} onChange={(e) => setModel(e.target.value)} />
        <TextField
          label={t('tools.key')}
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoComplete="off"
        />
        <Button onClick={() => void save()} loading={saving} disabled={!key.trim()} className="w-full">
          {t('tools.save')}
        </Button>
        {status ? (
          <p className={`text-small ${status.ok ? 'text-ok' : 'text-danger'}`} role={status.ok ? 'status' : 'alert'}>
            {status.text}
          </p>
        ) : null}
      </div>
      <p className="mt-3 text-note text-muted">{t('tools.securityNote')}</p>

      <div className="mt-5 border-t border-line pt-4">
        <h3 className="text-caption font-semibold text-muted">{t('tools.publicPageTitle')}</h3>
        <p className="mt-1 text-note text-muted">{t('tools.publicPageHint')}</p>
        <div className="mt-3 flex items-center gap-3">
          <Button
            variant="secondary"
            className="w-auto px-4"
            loading={publicPageSaving}
            disabled={publicPage === null}
            onClick={() => void togglePublicPage()}
          >
            {publicPage ? t('tools.publicPageOn') : t('tools.publicPageOff')}
          </Button>
          <span className="text-note text-muted" aria-live="polite">
            {publicPage === null ? t('common.loading') : ''}
          </span>
        </div>
        {publicPageError ? (
          <p className="mt-2 text-small text-danger" role="alert">
            {publicPageError}
          </p>
        ) : null}
      </div>
    </section>
  );
}
