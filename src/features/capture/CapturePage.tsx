import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CameraIcon, RefreshIcon, SwitchCameraIcon, UploadIcon, XIcon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { FullScreenLoader } from '@/components/layout/FullScreenLoader';
import { Screen } from '@/components/layout/Screen';
import { useSuggestedCode } from '@/features/dresses/api';
import { PHOTO_ANGLE_VALUES, type PhotoAngle } from '@/features/photos/api';
import { preparePhoto } from '@/features/photos/photoPipeline';
import { saveCaptureBatch } from '@/features/offline/saveCapture';
import { isEmptyFrame, readFrameStats } from '@/features/capture/frameQuality';
import { cx } from '@/lib/cx';

type Captured = { id: string; blob: Blob; angle: PhotoAngle; width: number; height: number };

const ANGLES = PHOTO_ANGLE_VALUES as readonly PhotoAngle[];

type Facing = 'environment' | 'user';

/**
 * Opens the camera the user asked for.
 *
 * A phone can refuse a camera that another app is holding, and some devices
 * hand back the wrong one. So each request is checked: if the camera that
 * comes back is not the one asked for, it is closed and the next option is
 * tried. `null` means no camera could be opened at all.
 */
async function openCamera(facing: Facing): Promise<MediaStream | null> {
  if (!navigator.mediaDevices?.getUserMedia) return null;

  const wanted: MediaStreamConstraints[] = [
    { video: { facingMode: { exact: facing } }, audio: false },
    { video: { facingMode: { ideal: facing } }, audio: false },
    { video: true, audio: false },
  ];

  for (const constraints of wanted) {
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch {
      continue;
    }
    const track = stream.getVideoTracks()[0];
    const got = track?.getSettings?.().facingMode;
    // The device gave us the other camera. Close it and try again.
    if (got && got !== facing) {
      stream.getTracks().forEach((t) => t.stop());
      continue;
    }
    return stream;
  }
  return null;
}

export function CapturePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const suggested = useSuggestedCode(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facing, setFacing] = useState<Facing>('environment');
  const [cameraError, setCameraError] = useState<'unavailable' | 'ended' | null>(null);
  const [starting, setStarting] = useState(true);
  // True until the camera has handed over a frame that actually carries an
  // image. A freshly opened or freshly switched camera sends black frames
  // for a moment, and those must never reach the catalogue.
  const [warming, setWarming] = useState(true);
  const [captured, setCaptured] = useState<Captured[]>([]);
  const [angle, setAngle] = useState<PhotoAngle>('front');
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);

  /**
   * Draws the live video into a small canvas and reports what it sees.
   * `null` means the camera is not live yet.
   */
  const inspectFrame = useCallback((): { mean: number; max: number; distinct: number } | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;
    const probe = document.createElement('canvas');
    probe.width = 32;
    probe.height = 32;
    const ctx = probe.getContext('2d');
    if (!ctx) return null;
    try {
      ctx.drawImage(video, 0, 0, probe.width, probe.height);
      return readFrameStats(ctx, probe.width, probe.height);
    } catch {
      // A tainted or not-yet-ready canvas tells us nothing.
      return null;
    }
  }, []);

  /**
   * Waits until the camera hands over a frame that carries an image.
   *
   * After opening or switching a camera the sensor sends a few black frames
   * before it catches up. Photographing during that window produces a black
   * rectangle. So the screen waits for a real picture first.
   */
  const waitForRealFrame = useCallback(async (timeoutMs = 6000): Promise<boolean> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const stats = inspectFrame();
      if (stats && !isEmptyFrame(stats)) return true;
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    return false;
  }, [inspectFrame]);

  /** Opens the camera, replacing whatever was running. */
  const startCamera = useCallback(async (next: Facing) => {
    setStarting(true);
    setCameraError(null);
    setWarming(true);

    // Release the previous camera before asking for another one: a phone
    // usually refuses to open a second one.
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);

    const opened = await openCamera(next);
    if (!opened) {
      setCameraError('unavailable');
      setStarting(false);
      return;
    }
    streamRef.current = opened;
    setStream(opened);
    setFacing(next);

    // Another app can take the camera away mid-session. When that happens
    // the preview would silently go blank, so say so instead.
    opened.getVideoTracks()[0]?.addEventListener(
      'ended',
      () => setCameraError('ended'),
      { once: true },
    );
    setStarting(false);
  }, []);

  // Open the rear camera on mount.
  useEffect(() => {
    void startCamera('environment');
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [startCamera]);

  // Attach the stream to the video element once both exist.
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      void videoRef.current.play().catch(() => undefined);
    }
  }, [stream]);

  // Wait for the camera to hand over a real picture before the shutter is
  // usable. Until then the preview says so instead of showing a black box.
  useEffect(() => {
    if (!stream) return;
    let cancelled = false;
    void (async () => {
      await waitForRealFrame();
      // Whether or not the camera produced a picture, the shutter is enabled
      // again. The capture itself checks the frame one last time, so a black
      // rectangle can never be saved - but the user is never locked out.
      if (!cancelled) setWarming(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [stream, waitForRealFrame]);

  const flipCamera = useCallback(() => {
    void startCamera(facing === 'environment' ? 'user' : 'environment');
  }, [facing, startCamera]);

  const captureFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    // A camera that is not live produces a black frame. Saving one silently
    // would put a black rectangle in the catalogue, so refuse instead.
    if (!video.videoWidth || !video.videoHeight) {
      setCameraError('unavailable');
      return;
    }

    // The camera may still be warming up after being opened or switched.
    // Wait for a real frame rather than photographing a black rectangle.
    const stats = inspectFrame();
    if (!stats || isEmptyFrame(stats)) {
      const ready = await waitForRealFrame(4000);
      if (!ready) {
        setCameraError('unavailable');
        return;
      }
    }

    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // The front camera is shown mirrored, so the saved photo matches what the
    // photographer saw.
    if (facing === 'user') {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);

    // One last look at the frame that is about to be saved. If it is still
    // black, do not save it: the user would only find out later.
    const finalStats = readFrameStats(ctx, w, h);
    if (isEmptyFrame(finalStats)) {
      setCameraError('unavailable');
      return;
    }

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) return;
    const prepared = await preparePhoto(blob);
    setCaptured((current) => [
      ...current,
      { id: crypto.randomUUID(), blob: prepared.blob, angle, width: prepared.width, height: prepared.height },
    ]);
  }, [angle, facing, inspectFrame, waitForRealFrame]);

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
                  <CameraIcon className="mx-auto h-6 w-6 text-faint" />
                  <p className="mt-2 text-small text-muted">
                    {cameraError === 'ended'
                      ? t('capture.cameraTaken')
                      : t('capture.cameraUnavailable')}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3 w-auto px-3"
                    loading={starting}
                    onClick={() => void startCamera(facing)}
                  >
                    <RefreshIcon className="h-3.5 w-3.5" />
                    {t('capture.cameraRetry')}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                  style={facing === 'user' ? { transform: 'scaleX(-1)' } : undefined}
                />
                {warming ? (
                  <div
                    className="pointer-events-none absolute inset-0 grid place-items-center bg-surface/70"
                    role="status"
                    data-testid="camera-warming"
                  >
                    <span className="eyebrow text-muted">{t('capture.cameraWarming')}</span>
                  </div>
                ) : null}
              </>
            )}
            <canvas ref={canvasRef} hidden />
            {/* framing guides */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-4 border border-line-strong" />

            {/* Flip between the rear and front camera. */}
            {cameraError ? null : (
              <button
                type="button"
                onClick={flipCamera}
                aria-label={t('capture.cameraSwitch')}
                title={t('capture.cameraSwitch')}
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-field border border-line bg-surface/85 text-ink backdrop-blur-sm transition-colors hover:bg-surface"
              >
                <SwitchCameraIcon className="h-4 w-4" />
              </button>
            )}
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
            <Button
              variant="secondary"
              disabled={warming}
              onClick={() => void captureFrame()}
            >
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
