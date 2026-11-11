import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DressPhotoRow } from '@/features/dresses/api';
import { PRESET_BACKGROUNDS, DEFAULT_ENHANCEMENT, type BackgroundChoice } from './composite';
import type { Enhancement } from './composite';
import { useCleanPhoto, useRevertClean, useCleanAll } from './api';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ChevronDownIcon } from '@/components/icons';
import { cx } from '@/lib/cx';

/** Which engine strips the background: in-browser, a rembg server, or the cloud. */
type Engine = 'browser' | 'rembg' | 'cloud';

interface BackgroundCleanerProps {
  dressId: string;
  photos: DressPhotoRow[];
}

/**
 * A swatch for a background preset, drawn with surface tokens rather than
 * literal colours: the studio preset is a gradient, so it is shown as two
 * stacked bands instead of a CSS gradient.
 */
function Swatch({ presetId }: { presetId: string }) {
  if (presetId === 'studio') {
    return (
      <span aria-hidden="true" className="flex h-full w-full flex-col">
        <span className="block h-1/2 w-full bg-surface-2" />
        <span className="block h-1/2 w-full bg-surface-3" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cx('block h-full w-full', presetId === 'white' ? 'bg-surface' : 'bg-surface-2')}
    />
  );
}

/** A preset swatch button: a small bordered square with its name beneath. */
function PresetSwatch({
  active,
  label,
  presetId,
  onClick,
}: {
  active: boolean;
  label: string;
  presetId: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="flex flex-col items-center gap-1"
    >
      <span
        className={cx(
          'block h-7 w-7 rounded-tile border transition-colors',
          active ? 'border-accent' : 'border-line-strong hover:border-line-strong',
        )}
      >
        <Swatch presetId={presetId} />
      </span>
      <span
        className={cx(
          'text-center text-micro leading-tight',
          active ? 'font-semibold text-accent' : 'text-muted',
        )}
      >
        {label}
      </span>
    </button>
  );
}

/** One-tap background cleanup with re-stylable backgrounds and enhancement. */
export function BackgroundCleaner({ dressId, photos }: BackgroundCleanerProps) {
  const { t } = useTranslation();
  const endpointId = useId();
  const customColorId = useId();
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

  const sliders = [
    { key: 'brightness', value: brightness, set: setBrightness, min: 0.8, max: 1.3, step: 0.01 },
    { key: 'contrast', value: contrast, set: setContrast, min: 0.8, max: 1.3, step: 0.01 },
    { key: 'saturation', value: saturation, set: setSaturation, min: 0.8, max: 1.3, step: 0.01 },
  ];

  // The engine in use: a configured rembg endpoint wins, otherwise it is
  // whichever engine the owner last picked.
  const engine: Engine =
    rembgEndpoint.trim() !== '' ? 'rembg' : useBrowser ? 'browser' : 'cloud';

  return (
    <div
      className="flex flex-col gap-3 rounded-card border border-line bg-surface p-3"
      data-testid="background-cleaner"
    >
      <h3 className="text-title font-semibold tracking-tight text-ink">{t('cleanup.title')}</h3>

      {/* Label/value rows, separated by hairlines. */}
      <div className="divide-y divide-line">
        {/* Photo */}
        <div className="flex flex-col gap-1.5 py-2.5 first:pt-0">
          <span className="eyebrow">{t('cleanup.photo')}</span>
          <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                aria-pressed={selected?.id === photo.id}
                onClick={() => setSelectedId(photo.id)}
                className={cx(
                  'h-8 shrink-0 rounded-field border px-2.5 text-caption font-semibold tracking-tight transition-colors',
                  selected?.id === photo.id
                    ? 'border-accent-line bg-accent-bg text-accent'
                    : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink',
                )}
              >
                <span className="font-mono text-micro text-current opacity-70">
                  {String(index + 1).padStart(2, '0')}
                </span>{' '}
                {photo.clean_path ? t('cleanup.cleaned') : t('cleanup.original')}
              </button>
            ))}
          </div>
        </div>

        {/* Background */}
        <div className="flex flex-col gap-1.5 py-2.5">
          <span className="eyebrow">{t('cleanup.background')}</span>
          <div className="flex flex-wrap items-start gap-3">
            {PRESET_BACKGROUNDS.map((preset: { id: string; label: string; choice: BackgroundChoice }) => (
              <PresetSwatch
                key={preset.id}
                active={backgroundId === preset.id}
                label={t(`cleanup.bg.${preset.id}`, { defaultValue: preset.label })}
                presetId={preset.id}
                onClick={() => setBackgroundId(preset.id)}
              />
            ))}
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                aria-pressed={backgroundId === 'custom'}
                onClick={() => setBackgroundId('custom')}
                className={cx(
                  'block h-7 w-7 rounded-tile border transition-colors',
                  backgroundId === 'custom' ? 'border-accent' : 'border-line-strong',
                )}
                style={{ backgroundColor: customColor }}
              >
                <span aria-hidden="true" className="block h-full w-full" />
              </button>
              <label
                htmlFor={customColorId}
                className={cx(
                  'cursor-pointer text-center text-micro leading-tight',
                  backgroundId === 'custom' ? 'font-semibold text-accent' : 'text-muted',
                )}
              >
                {t('cleanup.bg.custom')}
              </label>
              <input
                id={customColorId}
                type="color"
                value={customColor}
                onChange={(event) => {
                  setCustomColor(event.target.value);
                  setBackgroundId('custom');
                }}
                aria-label={t('cleanup.bg.custom')}
                className="h-6 w-10 cursor-pointer rounded-field border border-line bg-surface p-0.5"
              />
            </div>
          </div>
        </div>

        {/* Engine */}
        <div className="flex flex-col gap-1.5 py-2.5">
          <span className="eyebrow">{t('cleanup.provider')}</span>
          <div className="no-scrollbar -mx-3 overflow-x-auto px-3">
            <div className="w-max">
              <SegmentedControl
                label={t('cleanup.provider')}
                options={[
                  { value: 'browser', label: t('cleanup.providerBrowserShort') },
                  { value: 'rembg', label: t('cleanup.providerRembgShort') },
                  { value: 'cloud', label: t('cleanup.providerCloudShort') },
                ]}
                value={engine}
                onChange={(value) => {
                  if (value === 'browser') {
                    setUseBrowser(true);
                    setRembgEndpoint('');
                    localStorage.removeItem('rembg-endpoint');
                    return;
                  }
                  setUseBrowser(false);
                  if (value === 'cloud') {
                    setRembgEndpoint('');
                    localStorage.removeItem('rembg-endpoint');
                  }
                }}
              />
            </div>
          </div>

          {rembgEndpoint.trim() ? (
            <div className="flex flex-col gap-1">
              <label htmlFor={endpointId} className="eyebrow">
                {t('cleanup.rembgEndpoint')}
              </label>
              <input
                id={endpointId}
                value={rembgEndpoint}
                onChange={(event) => {
                  setRembgEndpoint(event.target.value);
                  localStorage.setItem('rembg-endpoint', event.target.value);
                }}
                placeholder={t('cleanup.rembgEndpoint')}
                className="h-9 w-full rounded-field border border-line bg-surface px-2.5 font-mono text-note text-ink placeholder:text-faint"
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* Enhance */}
      <details className="rounded-card border border-line bg-surface-2">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-caption font-semibold tracking-tight text-ink">
          {t('cleanup.enhance')}
          <ChevronDownIcon className="h-3.5 w-3.5 text-muted" />
        </summary>
        <div className="divide-y divide-line border-t border-line">
          {sliders.map((slider) => {
            const sliderId = `${endpointId}-${slider.key}`;
            return (
              <div key={slider.key} className="flex items-center gap-3 px-3 py-2">
                <label htmlFor={sliderId} className="w-24 shrink-0 text-caption text-muted">
                  {t(`cleanup.${slider.key}`)}
                </label>
                <input
                  id={sliderId}
                  type="range"
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  value={slider.value}
                  onChange={(event) => slider.set(Number(event.target.value))}
                  className="h-1 min-w-0 flex-1 cursor-pointer accent-accent"
                />
                <span className="w-12 shrink-0 text-end font-mono text-note text-ink">
                  {slider.value.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </details>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={runClean} loading={clean.isPending} disabled={!selected}>
          {t('cleanup.clean')}
        </Button>
        {selected?.clean_path ? (
          <Button
            variant="danger"
            className="flex-1"
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

      {errorText ? (
        <p className="text-small text-danger" role="alert">
          {errorText}
        </p>
      ) : null}
      <p className="text-note text-muted">{t('cleanup.note')}</p>
    </div>
  );
}
