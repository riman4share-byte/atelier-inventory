import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DressPhotoRow, DressRow } from '@/features/dresses/api';
import {
  PHOTO_ANGLE_VALUES,
  useAddPhotos,
  useDeletePhoto,
  useMovePhoto,
  useSignedPhotoUrls,
  type PhotoAngle,
} from './api';
import { paletteForCode } from '@/features/dresses/StatusPill';
import { GownIcon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { cx } from '@/lib/cx';

const ANGLE_OPTIONS = PHOTO_ANGLE_VALUES as ReadonlyArray<PhotoAngle>;

interface PhotoGalleryProps {
  dress: DressRow;
  photos: DressPhotoRow[];
}

/** Signed-URL thumbnails of the dress's real photos with upload controls. */
export function PhotoGallery({ dress, photos }: PhotoGalleryProps) {
  const { t } = useTranslation();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busyAngle, setBusyAngle] = useState<PhotoAngle>('front');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState<string | null>(null);

  const addPhotos = useAddPhotos(dress.id);
  const deletePhoto = useDeletePhoto(dress.id);
  const movePhoto = useMovePhoto(dress.id, photos.length);
  const urls = useSignedPhotoUrls(photos);

  const pick = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorText(null);
    addPhotos.mutate(
      { files: [...files], angle: busyAngle },
      { onError: () => setErrorText(t('photos.uploadFailed')) },
    );
  };

  if (photos.length === 0) {
    return (
      <div className="flex flex-col gap-3" data-testid="photo-gallery">
        <div className="flex flex-col items-center gap-2">
          <div
            className={cx(
              'flex aspect-[3/4] w-full max-w-[280px] items-center justify-center rounded-card',
              paletteForCode(dress.code).tile,
            )}
          >
            <GownIcon className={cx('h-24 w-auto drop-shadow-md', paletteForCode(dress.code).icon)} />
          </div>
          <p className="text-note text-muted">{t('photos.empty')}</p>
        </div>
        <div className="flex items-center justify-center gap-2 rounded-card bg-soft px-3 py-2">
          {ANGLE_OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={busyAngle === value}
              onClick={() => setBusyAngle(value)}
              className={cx(
                'min-h-tap rounded-pill px-2.5 text-caption font-semibold',
                busyAngle === value ? 'bg-accent text-accent-ink' : 'text-ink',
              )}
            >
              {t(`photos.angle.${value}`)}
            </button>
          ))}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          data-testid="photo-input"
          onChange={(event) => {
            pick(event.target.files);
            event.target.value = '';
          }}
        />
        <Button
          variant="secondary"
          onClick={() => fileInput.current?.click()}
          loading={addPhotos.isPending}
        >
          {t('photos.add')}
        </Button>
        {errorText ? <p className="text-small text-danger">{errorText}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3" data-testid="photo-gallery">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" data-testid="photo-strip">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="relative shrink-0 overflow-hidden rounded-tile"
            data-testid="photo-thumb"
          >
            {urls[index] ? (
              <img
                src={urls[index]}
                alt={t('photos.thumbAlt', { code: dress.code, order: index + 1 })}
                loading="lazy"
                className="h-24 w-20 cursor-zoom-in object-cover"
                onClick={() => setZoomed(urls[index] ?? null)}
              />
            ) : (
              <div className="grid h-24 w-20 place-items-center bg-soft">
                <GownIcon className="h-8 w-auto text-accent opacity-60" />
              </div>
            )}
            <span className="absolute bottom-1 left-1 rounded-pill bg-black/50 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {t(`photos.angle.${photo.angle}`)}
            </span>
            <div className="absolute right-1 top-1 flex flex-col gap-0.5">
              <button
                type="button"
                aria-label={t('photos.moveUp')}
                disabled={index === 0 || movePhoto.isPending}
                onClick={() => movePhoto.mutate({ index, direction: 'up' })}
                className="grid h-5 w-5 place-items-center rounded-full bg-black/50 text-[10px] text-white disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={t('photos.moveDown')}
                disabled={index === photos.length - 1 || movePhoto.isPending}
                onClick={() => movePhoto.mutate({ index, direction: 'down' })}
                className="grid h-5 w-5 place-items-center rounded-full bg-black/50 text-[10px] text-white disabled:opacity-30"
              >
                ↓
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <span className="shrink-0 self-center text-caption font-semibold text-muted">
            {t('photos.addAs')}
          </span>
          {ANGLE_OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={busyAngle === value}
              onClick={() => setBusyAngle(value)}
              className={cx(
                'min-h-tap shrink-0 rounded-pill px-3 text-caption font-semibold',
                busyAngle === value ? 'bg-accent text-accent-ink' : 'bg-soft text-ink',
              )}
            >
              {t(`photos.angle.${value}`)}
            </button>
          ))}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          data-testid="photo-input"
          onChange={(event) => {
            pick(event.target.files);
            event.target.value = '';
          }}
        />
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => fileInput.current?.click()}
            loading={addPhotos.isPending}
          >
            {t('photos.add')}
          </Button>
          {photos.length > 0 ? (
            <Button
              variant="secondary"
              className="w-auto px-4 text-danger"
              onClick={() => {
                const last = photos[photos.length - 1];
                if (last) deletePhoto.mutate(last, { onError: () => setErrorText(t('photos.deleteFailed')) });
              }}
              aria-label={t('photos.removeLast')}
            >
              {t('photos.removeLast')}
            </Button>
          ) : null}
        </div>
      </div>
      {errorText ? <p className="text-small text-danger">{errorText}</p> : null}

      {zoomed ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-6"
          role="dialog"
          aria-label={t('photos.zoom')}
          data-testid="photo-zoom"
          onClick={() => setZoomed(null)}
        >
          <img src={zoomed} alt="" className="max-h-full max-w-full rounded-card" />
          <button type="button" aria-label={t('common.close')} className="absolute right-5 top-5 text-white">
            ✕
          </button>
        </div>
      ) : null}
    </div>
  );
}
