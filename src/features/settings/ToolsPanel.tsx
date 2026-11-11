import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { TextField } from '@/components/ui/TextField';
import { CheckIcon, AlertIcon } from '@/components/icons';

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
    <div data-testid="tools-panel">
      <Panel title={t('tools.title')}>
        <p className="text-note text-muted">{t('tools.hint')}</p>

        <div className="mt-3 flex flex-col gap-2.5">
          <div className="flex flex-col gap-1">
            <label htmlFor="tools-kind" className="eyebrow">
              {t('tools.kindLabel')}
            </label>
            <select
              id="tools-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="h-9 rounded-field border border-line bg-surface px-2.5 text-body text-ink focus:border-accent"
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`tools.kind.${k}`)}
                </option>
              ))}
            </select>
          </div>

          <TextField
            label={t('tools.provider')}
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            mono
          />
          <TextField
            label={t('tools.model')}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            mono
          />
          <TextField
            label={t('tools.key')}
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            autoComplete="off"
            mono
          />

          <Button onClick={() => void save()} loading={saving} disabled={!key.trim()}>
            {t('tools.save')}
          </Button>

          {status ? (
            status.ok ? (
              <p
                role="status"
                className="flex items-start gap-2 rounded-field border border-ok-line bg-ok-bg px-2.5 py-1.5 text-small text-ok"
              >
                <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 break-words">{status.text}</span>
              </p>
            ) : (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-field border border-danger-line bg-danger-bg px-2.5 py-1.5 text-small text-danger"
              >
                <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 break-words">{status.text}</span>
              </p>
            )
          ) : null}

          <p className="text-note text-faint">{t('tools.securityNote')}</p>
        </div>

        <div className="mt-3 border-t border-line pt-3">
          <p className="eyebrow">{t('tools.publicPageTitle')}</p>
          <p className="mt-1 text-note text-muted">{t('tools.publicPageHint')}</p>
          <div className="mt-2 flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              fullWidth={false}
              className="px-3"
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
            <p
              role="alert"
              className="mt-2 rounded-field border border-danger-line bg-danger-bg px-2.5 py-1.5 text-small text-danger"
            >
              {publicPageError}
            </p>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
