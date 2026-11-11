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
import { ChevronDownIcon, GownIcon, UploadIcon, XIcon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
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

  const anglePicker = (
    <div className="no-scrollbar -mx-3 overflow-x-auto px-3">
      <div className="w-max">
        <SegmentedControl
          label={t('photos.addAs')}
          options={ANGLE_OPTIONS.map((value) => ({ value, label: t(`photos.angle.${value}`) }))}
          value={busyAngle}
          onChange={(value) => setBusyAngle(value)}
        />
      </div>
    </div>
  );

  const fileInputNode = (
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
  );

  if (photos.length === 0) {
    return (
      <div className="flex flex-col gap-3" data-testid="photo-gallery">
        <div
          className={cx(
            'flex aspect-[3/4] w-full max-w-[280px] items-center justify-center rounded-card border border-line',
            paletteForCode(dress.code).tile,
          )}
        >
          <GownIcon className={cx('h-24 w-auto', paletteForCode(dress.code).icon)} />
        </div>
        <p className="text-note text-muted">{t('photos.empty')}</p>

        <div className="flex flex-col gap-1.5">
          <span className="eyebrow">{t('photos.addAs')}</span>
          {anglePicker}
        </div>

        {fileInputNode}
        <Button
          variant="secondary"
          onClick={() => fileInput.current?.click()}
          loading={addPhotos.isPending}
        >
          <UploadIcon className="h-3.5 w-3.5" />
          {t('photos.add')}
        </Button>
        {errorText ? (
          <p className="text-small text-danger" role="alert">
            {errorText}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3" data-testid="photo-gallery">
      {/* A dense contact sheet: hairline cells, one per shot, in sort order. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="photo-strip">
        {photos.map((photo, index) => (
          <figure
            key={photo.id}
            className="flex flex-col overflow-hidden rounded-tile border border-line bg-surface"
            data-testid="photo-thumb"
          >
            <button
              type="button"
              aria-label={t('photos.thumbAlt', { code: dress.code, order: index + 1 })}
              onClick={() => setZoomed(urls[index] ?? null)}
              className="relative block w-full cursor-zoom-in bg-surface-2"
            >
              {urls[index] ? (
                <img
                  src={urls[index]}
                  alt=""
                  loading="lazy"
                  className="aspect-[3/4] w-full object-cover"
                />
              ) : (
                <span className="grid aspect-[3/4] w-full place-items-center">
                  <GownIcon className="h-8 w-auto text-accent opacity-70" />
                </span>
              )}
              <span className="absolute bottom-1 left-1 rounded-pill border border-line bg-surface px-1.5 py-0.5 font-mono text-micro uppercase tracking-widest text-ink">
                {t(`photos.angle.${photo.angle}`)}
              </span>
            </button>

            <div className="flex items-center justify-end gap-0.5 border-t border-line px-0.5 py-0.5">
              <Button
                variant="ghost"
                size="sm"
                fullWidth={false}
                aria-label={t('photos.moveUp')}
                disabled={index === 0 || movePhoto.isPending}
                onClick={() => movePhoto.mutate({ index, direction: 'up' })}
                className="w-8 !px-0 text-muted"
              >
                <ChevronDownIcon className="h-4 w-4 rotate-180" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                fullWidth={false}
                aria-label={t('photos.moveDown')}
                disabled={index === photos.length - 1 || movePhoto.isPending}
                onClick={() => movePhoto.mutate({ index, direction: 'down' })}
                className="w-8 !px-0 text-muted"
              >
                <ChevronDownIcon className="h-4 w-4" />
              </Button>
            </div>
          </figure>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow">{t('photos.addAs')}</span>
          {anglePicker}
        </div>
        {fileInputNode}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => fileInput.current?.click()}
            loading={addPhotos.isPending}
          >
            <UploadIcon className="h-3.5 w-3.5" />
            {t('photos.add')}
          </Button>
          {photos.length > 0 ? (
            <Button
              variant="danger"
              className="w-auto px-3"
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
      {errorText ? (
        <p className="text-small text-danger" role="alert">
          {errorText}
        </p>
      ) : null}

      {zoomed ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-6"
          role="dialog"
          aria-label={t('photos.zoom')}
          data-testid="photo-zoom"
          onClick={() => setZoomed(null)}
        >
          <img src={zoomed} alt="" className="max-h-full max-w-full rounded-card border border-line" />
          <Button
            variant="ghost"
            size="sm"
            fullWidth={false}
            aria-label={t('common.close')}
            onClick={() => setZoomed(null)}
            className="absolute right-5 top-5 w-8 !px-0 border border-line bg-surface text-ink hover:bg-surface-2"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
