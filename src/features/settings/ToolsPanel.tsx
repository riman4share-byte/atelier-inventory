import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';

const KINDS = ['vision', 'background_removal', 'translation', 'storage', 'erp', 'custom'] as const;

/** Admin-only control panel for API keys and integrations (Phase 10). */
export function ToolsPanel() {
  const { t } = useTranslation();
  const [kind, setKind] = useState<string>('vision');
  const [provider, setProvider] = useState<string>('gemini');
  const [model, setModel] = useState<string>('gemini-2.5-flash');
  const [key, setKey] = useState<string>('');
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const { data, error } = await (supabase as NonNullable<typeof supabase>).functions.invoke('save-integration', {
        body: { kind, provider, model, key },
      });
      if (error) throw error;
      setStatus(data?.hint ? t('tools.saved', { hint: data.hint }) : t('tools.savedGeneric'));
      setKey('');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setStatus(message === 'no_vault' ? t('tools.noVault') : t('tools.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-6 rounded-card border border-line p-4" data-testid="tools-panel">
      <h2 className="text-caption font-semibold text-muted">{t('tools.title')}</h2>
      <p className="mt-1 text-note text-muted">{t('tools.hint')}</p>
      <div className="mt-3 flex flex-col gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value)}
          className="min-h-tap w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink">
          {KINDS.map((k) => <option key={k} value={k}>{t(`tools.kind.${k}`)}</option>)}
        </select>
        <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder={t('tools.provider')}
          className="min-h-tap w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink" />
        <input value={model} onChange={(e) => setModel(e.target.value)} placeholder={t('tools.model')}
          className="min-h-tap w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink" />
        <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder={t('tools.key')}
          className="min-h-tap w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink" />
        <Button onClick={() => void save()} loading={saving} disabled={!key.trim()} className="w-full">
          {t('tools.save')}
        </Button>
        {status ? <p className="text-small text-muted">{status}</p> : null}
      </div>
      <p className="mt-3 text-note text-muted">{t('tools.securityNote')}</p>
    </section>
  );
}
