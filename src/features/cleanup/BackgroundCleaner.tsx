import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DressPhotoRow } from '@/features/dresses/api';
import { PRESET_BACKGROUNDS, DEFAULT_ENHANCEMENT, type BackgroundChoice } from './composite';
import type { Enhancement } from './composite';
import { useCleanPhoto, useRevertClean, useCleanAll } from './api';
import { Button } from '@/components/ui/Button';
import { cx } from '@/lib/cx';

interface BackgroundCleanerProps {
  dressId: string;
  photos: DressPhotoRow[];
}

/** One-tap background cleanup with re-stylable backgrounds and enhancement. */
export function BackgroundCleaner({ dressId, photos }: BackgroundCleanerProps) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string>(photos[0]?.id ?? '');
  const [backgroundId, setBackgroundId] = useState<string>('white');
  const [customColor, setCustomColor] = useState<string>('#ffffff');
  const [brightness, setBrightness] = useState<number>(DEFAULT_ENHANCEMENT.brightness);
  const [contrast, setContrast] = useState<number>(DEFAULT_ENHANCEMENT.contrast);
  const [saturation, setSaturation] = useState<number>(DEFAULT_ENHANCEMENT.saturation);
  const [useBrowser, setUseBrowser] = useState<boolean>(true);
  const [rembgEndpoint, setRembgEndpoint] = useState<string>(() => localStorage.getItem('rembg-endpoint') ?? '');
  const [errorText, setErrorText] = useState<string | null>(null);

  const clean = useCleanPhoto(dressId);
  const revert = useRevertClean(dressId);
  const cleanAll = useCleanAll(dressId, photos);

  const selected = photos.find((photo) => photo.id === selectedId) ?? photos[0];
  const background: BackgroundChoice =
    backgroundId === 'custom'
      ? { kind: 'solid', color: customColor }
      : (PRESET_BACKGROUNDS.find((preset) => preset.id === backgroundId)?.choice ?? PRESET_BACKGROUNDS[0]!.choice);
  const enhancement: Enhancement = { brightness, contrast, saturation };

  const runClean = () => {
    if (!selected) return;
    setErrorText(null);
    clean.mutate(
      { photo: selected, background, enhancement, useBrowser, rembgEndpoint: rembgEndpoint.trim() || null },
      { onError: () => setErrorText(t('cleanup.failed')) },
    );
  };

  if (photos.length === 0) {
    return <p className="text-small text-muted">{t('cleanup.noPhotos')}</p>;
  }

  return (
    <div className="flex flex-col gap-3 rounded-card bg-soft p-4" data-testid="background-cleaner">
      <h3 className="text-title">{t('cleanup.title')}</h3>

      <div className="flex flex-col gap-1">
        <span className="text-caption font-semibold text-muted">{t('cleanup.photo')}</span>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {photos.map((photo) => (
            <button
              key={photo.id}
              type="button"
              aria-pressed={selected?.id === photo.id}
              onClick={() => setSelectedId(photo.id)}
              className={cx(
                'min-h-tap shrink-0 rounded-pill px-3 text-caption font-semibold',
                selected?.id === photo.id ? 'bg-accent text-accent-ink' : 'bg-surface text-ink',
              )}
            >
              {photo.clean_path ? t('cleanup.cleaned') : t('cleanup.original')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-caption font-semibold text-muted">{t('cleanup.background')}</span>
        <div className="flex flex-wrap gap-2">
          {PRESET_BACKGROUNDS.map((preset: { id: string; label: string; choice: BackgroundChoice }) => (
            <button
              key={preset.id}
              type="button"
              aria-pressed={backgroundId === preset.id}
              onClick={() => setBackgroundId(preset.id)}
              className={cx(
                'min-h-tap rounded-pill px-3 text-caption font-semibold',
                backgroundId === preset.id ? 'bg-accent text-accent-ink' : 'bg-surface text-ink',
              )}
            >
              {t(`cleanup.bg.${preset.id}`)}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={backgroundId === 'custom'}
            onClick={() => setBackgroundId('custom')}
            className={cx(
              'min-h-tap rounded-pill px-3 text-caption font-semibold',
              backgroundId === 'custom' ? 'bg-accent text-accent-ink' : 'bg-surface text-ink',
            )}
          >
            {t('cleanup.bg.custom')}
          </button>
        </div>
        {backgroundId === 'custom' ? (
          <input
            type="color"
            value={customColor}
            onChange={(event) => setCustomColor(event.target.value)}
            className="h-10 w-16 rounded-field border border-line"
            aria-label={t('cleanup.bg.custom')}
          />
        ) : null}
      </div>

      <details className="rounded-field bg-surface p-3">
        <summary className="cursor-pointer text-caption font-semibold text-ink">
          {t('cleanup.enhance')}
        </summary>
        <div className="mt-2 flex flex-col gap-2">
          {[
            { key: 'brightness', value: brightness, set: setBrightness, min: 0.8, max: 1.3, step: 0.01 },
            { key: 'contrast', value: contrast, set: setContrast, min: 0.8, max: 1.3, step: 0.01 },
            { key: 'saturation', value: saturation, set: setSaturation, min: 0.8, max: 1.3, step: 0.01 },
          ].map((slider) => (
            <label key={slider.key} className="flex flex-col gap-1 text-caption text-muted">
              {t(`cleanup.${slider.key}`)}
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={slider.value}
                onChange={(event) => slider.set(Number(event.target.value))}
              />
            </label>
          ))}
        </div>
      </details>

      <div className="flex items-center gap-2 rounded-field bg-surface p-2">
        <span className="text-caption font-semibold text-muted">{t('cleanup.provider')}</span>
        <button type="button" aria-pressed={useBrowser && !rembgEndpoint.trim()} onClick={() => { setUseBrowser(true); setRembgEndpoint(''); localStorage.removeItem('rembg-endpoint'); }}
          className={cx('min-h-tap rounded-pill px-3 text-caption font-semibold', useBrowser && !rembgEndpoint.trim() ? 'bg-accent text-accent-ink' : 'bg-soft text-ink')}>
          {t('cleanup.providerBrowser')}
        </button>
        <button type="button" aria-pressed={rembgEndpoint.trim() !== ''} onClick={() => { setUseBrowser(false); }}
          className={cx('min-h-tap rounded-pill px-3 text-caption font-semibold', rembgEndpoint.trim() !== '' ? 'bg-accent text-accent-ink' : 'bg-soft text-ink')}>
          {t('cleanup.providerRembg')}
        </button>
        <button type="button" aria-pressed={!useBrowser && !rembgEndpoint.trim()} onClick={() => { setUseBrowser(false); setRembgEndpoint(''); localStorage.removeItem('rembg-endpoint'); }}
          className={cx('min-h-tap rounded-pill px-3 text-caption font-semibold', (!useBrowser && !rembgEndpoint.trim()) ? 'bg-accent text-accent-ink' : 'bg-soft text-ink')}>
          {t('cleanup.providerCloud')}
        </button>
      </div>

      {rembgEndpoint.trim() ? (
        <input
          value={rembgEndpoint}
          onChange={(event) => { setRembgEndpoint(event.target.value); localStorage.setItem('rembg-endpoint', event.target.value); }}
          placeholder={t('cleanup.rembgEndpoint')}
          className="min-h-tap w-full rounded-field border-[1.5px] border-line bg-surface px-3 py-2 text-input text-ink placeholder:text-muted"
        />
      ) : null}

      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={runClean}
          loading={clean.isPending}
          disabled={!selected}
        >
          {t('cleanup.clean')}
        </Button>
        {selected?.clean_path ? (
          <Button
            variant="secondary"
            className="flex-1 text-danger"
            onClick={() => selected && revert.mutate(selected)}
            loading={revert.isPending}
          >
            {t('cleanup.revert')}
          </Button>
        ) : null}
      </div>

      {photos.some((photo) => !photo.clean_path) ? (
        <Button
          variant="secondary"
          onClick={() => cleanAll.mutateAll(background, enhancement)}
          loading={clean.isPending}
        >
          {t('cleanup.cleanAll')}
        </Button>
      ) : null}

      {errorText ? <p className="text-small text-danger">{errorText}</p> : null}
      <p className="text-note text-muted">{t('cleanup.note')}</p>
    </div>
  );
}
