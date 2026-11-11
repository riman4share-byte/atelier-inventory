import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CameraIcon, GownIcon, UploadIcon, XIcon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { FullScreenLoader } from '@/components/layout/FullScreenLoader';
import { Screen } from '@/components/layout/Screen';
import { useSuggestedCode } from '@/features/dresses/api';
import { PHOTO_ANGLE_VALUES, type PhotoAngle } from '@/features/photos/api';
import { preparePhoto } from '@/features/photos/photoPipeline';
import { saveCaptureBatch } from '@/features/offline/saveCapture';
import { cx } from '@/lib/cx';

type Captured = { id: string; blob: Blob; angle: PhotoAngle; width: number; height: number };

const ANGLES = PHOTO_ANGLE_VALUES as readonly PhotoAngle[];

/** Open the rear camera if possible, else null. */
async function openRearCamera(): Promise<MediaStream | null> {
  if (!navigator.mediaDevices?.getUserMedia) return null;
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
  } catch {
    try {
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } catch {
      return null;
    }
  }
}

export function CapturePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const suggested = useSuggestedCode(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [captured, setCaptured] = useState<Captured[]>([]);
  const [angle, setAngle] = useState<PhotoAngle>('front');
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);

  // Open camera on mount
  useEffect(() => {
    let active = true;
    openRearCamera().then((s) => {
      if (!active) { s?.getTracks().forEach((t) => t.stop()); return; }
      if (!s) { setCameraError(true); return; }
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    });
    return () => { active = false; };
  }, []);

  // Attach stream to video element once both exist
  useEffect(() => {
    if (stream && videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stream?.getTracks().forEach((track) => track.stop()); };
  }, [stream]);

  const captureFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) return;
    const prepared = await preparePhoto(blob);
    setCaptured((current) => [
      ...current,
      { id: crypto.randomUUID(), blob: prepared.blob, angle, width: prepared.width, height: prepared.height },
    ]);
  }, [angle]);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const prepared: Captured[] = [];
    for (const file of Array.from(files)) {
      const p = await preparePhoto(file);
      prepared.push({ id: crypto.randomUUID(), blob: p.blob, angle, width: p.width, height: p.height });
    }
    setCaptured((current) => [...current, ...prepared]);
  };

  const remove = (id: string) => setCaptured((current) => current.filter((c) => c.id !== id));
  const retag = (id: string, next: PhotoAngle) =>
    setCaptured((current) => current.map((c) => (c.id === id ? { ...c, angle: next } : c)));

  const saveAll = async () => {
    if (captured.length === 0) return;
    setSaving(true);
    setErrorText(null);
    setQueued(false);
    try {
      // The photos are written to the device first and only then uploaded, so
      // a dropped connection in the back room costs nothing.
      const result = await saveCaptureBatch(
        captured.map((c) => ({
          id: c.id,
          angle: c.angle,
          blob: c.blob,
          width: c.width,
          height: c.height,
        })),
      );

      if (result.queued) {
        // Saved on the device; it goes up as soon as there is a connection.
        stream?.getTracks().forEach((track) => track.stop());
        setCaptured([]);
        setQueued(true);
        return;
      }
      if (result.error) throw new Error(result.error);

      stream?.getTracks().forEach((track) => track.stop());
      navigate(`/dresses/${result.dressId}?draft=1`, { replace: true });
    } catch (error) {
      console.error(error);
      setErrorText(t('capture.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (suggested.isPending) return <FullScreenLoader />;

  return (
    <Screen title={t('capture.title')} subtitle={t('capture.subtitle')}>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 pb-4" data-testid="capture-page">
        {queued ? (
          <div
            className="rounded-card border border-warn-line bg-warn-bg px-3 py-2.5"
            role="status"
            data-testid="queued-notice"
          >
            <span className="eyebrow mb-1 block text-warn">{t('capture.queuedTitle')}</span>
            <p className="text-small text-ink">{t('capture.queuedBody')}</p>
          </div>
        ) : null}

        {/* Viewfinder — a flat frame, no shadow. The hairline marks the
            working area of the camera without adding chrome. */}
        <div className="overflow-hidden rounded-card border border-line bg-surface">
          <div className="relative aspect-[4/3] w-full bg-surface-3">
            {cameraError ? (
              <div className="grid h-full place-items-center p-6 text-center">
                <div>
                  <GownIcon className="mx-auto h-10 w-auto text-faint" />
                  <p className="mt-3 text-small text-muted">{t('capture.cameraDenied')}</p>
                </div>
              </div>
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            )}
            <canvas ref={canvasRef} hidden />
            {/* framing guides */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-4 border border-line-strong" />
          </div>
        </div>

        {/* Angle selector — a row of labelled cells, not loose pills. */}
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow">{t('photos.addAs')}</span>
          <div
            role="group"
            aria-label={t('photos.addAs')}
            className="grid grid-cols-3 gap-1.5 sm:grid-cols-6"
          >
            {ANGLES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={angle === value}
                onClick={() => setAngle(value)}
                className={cx(
                  'h-8 truncate rounded-field border px-1 text-caption font-semibold tracking-tight transition-colors',
                  angle === value
                    ? 'border-accent bg-accent text-accent-ink'
                    : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink',
                )}
              >
                {t(`photos.angle.${value}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Capture / upload controls */}
        <div className="grid grid-cols-2 gap-2">
          {!cameraError ? (
            <Button variant="secondary" onClick={() => void captureFrame()}>
              <CameraIcon className="h-4 w-4" />
              {t('capture.shutter')}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <UploadIcon className="h-4 w-4" />
            {t('capture.upload')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={(event) => { void onFiles(event.target.files); event.target.value = ''; }}
          />
        </div>

        {/* Captured thumbnails — a dense grid of bordered tiles. */}
        {captured.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="eyebrow">{t('capture.captured', { count: captured.length })}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {captured.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col overflow-hidden rounded-tile border border-line bg-surface"
                >
                  <div className="relative">
                    <img src={URL.createObjectURL(c.blob)} alt="" className="h-20 w-full object-cover" />
                    <span className="absolute bottom-1 left-1 rounded-pill border border-line bg-surface px-1.5 py-0.5 font-mono text-micro font-medium uppercase tracking-widest text-ink">
                      {t(`photos.angle.${c.angle}`)}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-tile border border-line bg-surface text-muted transition-colors hover:border-danger-line hover:text-danger"
                      aria-label={t('common.close')}
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <select
                    value={c.angle}
                    onChange={(event) => retag(c.id, event.target.value as PhotoAngle)}
                    aria-label={t('photos.addAs')}
                    className="h-8 w-full border-t border-line bg-surface px-1 font-mono text-note text-ink"
                  >
                    {ANGLES.map((a) => (
                      <option key={a} value={a}>{t(`photos.angle.${a}`)}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {errorText ? (
          <p
            role="alert"
            className="rounded-field border border-danger-line bg-danger-bg px-2.5 py-1.5 text-small text-danger"
          >
            {errorText}
          </p>
        ) : null}

        <p className="text-note text-muted">{t('capture.note')}</p>

        {/* Primary action — the commit of the console, full width, last. */}
        <Button onClick={() => void saveAll()} loading={saving} disabled={captured.length === 0}>
          {t('capture.saveDraft')}
        </Button>
      </div>
    </Screen>
  );
}
