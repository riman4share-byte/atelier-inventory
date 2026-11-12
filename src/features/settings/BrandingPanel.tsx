import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { TextField } from '@/components/ui/TextField';
import { CheckIcon, AlertIcon } from '@/components/icons';

/**
 * The atelier's own name and logo.
 *
 * The name goes on the printed hang tags and the printed catalogue, and the
 * logo goes on the tag next to the QR code and on the public page a
 * customer reaches by scanning it. Both are set here, by an admin, once.
 *
 * The logo is stored in its own bucket so the public page can read it
 * without opening the whole branding bucket to the world.
 */
export function BrandingPanel() {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);

  const [atelierName, setAtelierName] = useState('');
  const [poweredBy, setPoweredBy] = useState('');
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Read the current values.
  useEffect(() => {
    const client = supabase as NonNullable<typeof supabase>;
    void client
      .from('app_settings')
      .select('atelier_name, logo_path, powered_by')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setMessage({ ok: false, text: t('branding.loadFailed') });
          return;
        }
        setAtelierName(data?.atelier_name ?? '');
        setPoweredBy(data?.powered_by ?? '');
        setLogoPath(data?.logo_path ?? null);
        setLoaded(true);
      });
  }, [t]);

  const saveName = async () => {
    setSaving(true);
    setMessage(null);
    const { error } = await (supabase as NonNullable<typeof supabase>)
      .from('app_settings')
      .update({
        atelier_name: atelierName.trim() || 'Atelier',
        powered_by: poweredBy.trim(),
      })
      .eq('id', 1);
    setSaving(false);
    if (error) {
      setMessage({ ok: false, text: t('branding.saveFailed') });
      return;
    }
    setMessage({ ok: true, text: t('branding.nameSaved') });
  };

  const uploadLogo = async (file: File) => {
    setUploading(true);
    setMessage(null);
    try {
      const client = supabase as NonNullable<typeof supabase>;

      // A fixed name: there is one logo, and replacing it is how it changes.
      const path = 'atelier-logo.png';
      const { error: uploadError } = await client.storage
        .from('atelier-logo')
        .upload(path, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;

      const { error: updateError } = await client
        .from('app_settings')
        .update({ logo_path: path })
        .eq('id', 1);
      if (updateError) throw updateError;

      setLogoPath(path);
      setMessage({ ok: true, text: t('branding.logoSaved') });
    } catch {
      setMessage({ ok: false, text: t('branding.logoFailed') });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeLogo = async () => {
    setSaving(true);
    setMessage(null);
    const client = supabase as NonNullable<typeof supabase>;
    // The row is cleared first: a broken image on the printed tag is worse
    // than no logo at all.
    const { error } = await client.from('app_settings').update({ logo_path: null }).eq('id', 1);
    if (error) {
      setMessage({ ok: false, text: t('branding.saveFailed') });
      setSaving(false);
      return;
    }
    await client.storage.from('atelier-logo').remove(['atelier-logo.png']);
    setLogoPath(null);
    setSaving(false);
    setMessage({ ok: true, text: t('branding.logoRemoved') });
  };

  const logoUrl = logoPath
    ? `${(supabase as NonNullable<typeof supabase>).storage.from('atelier-logo').getPublicUrl(logoPath).data.publicUrl}`
    : null;

  return (
    <Panel title={t('branding.title')}>
      <p className="text-note text-muted">{t('branding.hint')}</p>

      <div className="mt-3 flex flex-col gap-3">
        <TextField
          label={t('branding.atelierName')}
          value={atelierName}
          onChange={(event) => setAtelierName(event.target.value)}
          placeholder="Riman Fashion"
        />
        <Button
          variant="secondary"
          onClick={() => void saveName()}
          loading={saving}
          disabled={!loaded}
          className="w-auto px-4"
        >
          {t('branding.saveName')}
        </Button>

        <TextField
          label={t('branding.poweredBy')}
          value={poweredBy}
          onChange={(event) => setPoweredBy(event.target.value)}
          placeholder="Powered by Kais"
          mono
        />
        <p className="-mt-2 text-note text-faint">{t('branding.poweredByHint')}</p>

        <div className="border-t border-line pt-3">
          <span className="eyebrow">{t('branding.logo')}</span>
          <p className="mt-1 text-note text-muted">{t('branding.logoHint')}</p>

          <div className="mt-2 flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={t('branding.logoAlt')}
                className="h-14 w-14 shrink-0 rounded-field border border-line bg-surface-2 object-contain p-1"
              />
            ) : (
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-field border border-dashed border-line text-note text-faint">
                {t('branding.noLogo')}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="px-3"
                loading={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {logoPath ? t('branding.replaceLogo') : t('branding.uploadLogo')}
              </Button>
              {logoPath ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-3"
                  loading={saving}
                  onClick={() => void removeLogo()}
                >
                  {t('branding.removeLogo')}
                </Button>
              ) : null}
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadLogo(file);
            }}
          />
        </div>

        {message ? (
          <p
            role={message.ok ? 'status' : 'alert'}
            className={
              message.ok
                ? 'flex items-start gap-2 rounded-field border border-ok-line bg-ok-bg px-2.5 py-1.5 text-small text-ok'
                : 'flex items-start gap-2 rounded-field border border-danger-line bg-danger-bg px-2.5 py-1.5 text-small text-danger'
            }
          >
            {message.ok ? (
              <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            ) : (
              <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            )}
            <span className="min-w-0 break-words">{message.text}</span>
          </p>
        ) : null}
      </div>
    </Panel>
  );
}
