import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GownIcon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { FullScreenLoader } from '@/components/layout/FullScreenLoader';
import { Screen } from '@/components/layout/Screen';
import { useSuggestedCode, useCreateDress } from '@/features/dresses/api';
import { supabase } from '@/lib/supabase';
import { PHOTO_ANGLE_VALUES, type PhotoAngle } from '@/features/photos/api';
import { preparePhoto } from '@/features/photos/photoPipeline';

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
  const createDress = useCreateDress();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [captured, setCaptured] = useState<Captured[]>([]);
  const [angle, setAngle] = useState<PhotoAngle>('front');
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

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
    try {
      // name_en stays empty so the detail page's auto-describe trigger fires;
      // the UI shows a "Draft dress" placeholder until AI fills it in.
      const dress = await createDress.mutateAsync({ code: null as never, name_en: '', listing_type: 'both', status: 'available' });
      // group by angle and upload
      const byAngle = new Map<PhotoAngle, File[]>();
      for (const c of captured) {
        const file = new File([c.blob], `${c.id}.jpg`, { type: 'image/jpeg' });
        if (!byAngle.has(c.angle)) byAngle.set(c.angle, []);
        byAngle.get(c.angle)!.push(file);
      }
      const addPhotos = /* use mutation via hook */ null;
      void addPhotos;
      // We'll upload per angle group using a direct approach
      const db = supabase as NonNullable<typeof supabase>;
      for (const [a, files] of byAngle) {
        // upload each file
        for (const file of files) {
          const prepared = await preparePhoto(file);
          const rowId = crypto.randomUUID();
          const path = `${dress.id}/${rowId}.jpg`;
          const { error: upErr } = await db.storage.from('dress-originals').upload(path, prepared.blob, { contentType: 'image/jpeg' });
          if (upErr) throw upErr;
          const { error: insErr } = await db.from('dress_photos').insert({
            id: rowId, dress_id: dress.id, angle: a, original_path: path,
            width: prepared.width, height: prepared.height, sort_order: 0,
          });
          if (insErr) throw insErr;
        }
      }
      stream?.getTracks().forEach((track) => track.stop());
      navigate(`/dresses/${dress.id}?draft=1`, { replace: true });
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
      <div className="flex flex-1 flex-col gap-4 pb-4" data-testid="capture-page">
        {/* Camera preview */}
        <div className="relative overflow-hidden rounded-card bg-black" style={{ aspectRatio: '4 / 3' }}>
          {cameraError ? (
            <div className="grid h-full place-items-center p-6 text-center text-white">
              <div>
                <GownIcon className="mx-auto h-12 w-auto opacity-60" />
                <p className="mt-3 text-small">{t('capture.cameraDenied')}</p>
              </div>
            </div>
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          )}
          <canvas ref={canvasRef} hidden />
          {/* corner guides */}
          <div className="pointer-events-none absolute inset-4 border-2 border-white/40" />
        </div>

        {/* Angle selector */}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {ANGLES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={angle === value}
              onClick={() => setAngle(value)}
              className={`min-h-tap shrink-0 rounded-pill px-3 text-caption font-semibold ${angle === value ? 'bg-accent text-accent-ink' : 'bg-soft text-ink'}`}
            >
              {t(`photos.angle.${value}`)}
            </button>
          ))}
        </div>

        {/* Capture / upload controls */}
        <div className="flex gap-2">
          {!cameraError ? (
            <Button onClick={() => void captureFrame()} className="flex-1">
              {t('capture.shutter')}
            </Button>
          ) : null}
          <Button variant="secondary" className="flex-1" onClick={() => fileInputRef.current?.click()}>
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

        {/* Captured thumbnails */}
        {captured.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-caption font-semibold text-muted">{t('capture.captured', { count: captured.length })}</p>
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
              {captured.map((c) => (
                <div key={c.id} className="relative shrink-0">
                  <img src={URL.createObjectURL(c.blob)} alt="" className="h-20 w-16 rounded-tile object-cover" />
                  <span className="absolute bottom-1 left-1 rounded-pill bg-black/50 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {t(`photos.angle.${c.angle}`)}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/50 text-[10px] text-white"
                    aria-label={t('common.close')}
                  >
                    ✕
                  </button>
                  <select
                    value={c.angle}
                    onChange={(event) => retag(c.id, event.target.value as PhotoAngle)}
                    className="mt-1 w-16 rounded-field border border-line bg-surface px-1 py-0.5 text-[10px] text-ink"
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

        {errorText ? <p className="text-small text-danger">{errorText}</p> : null}

        <Button onClick={() => void saveAll()} loading={saving} disabled={captured.length === 0} className="w-full">
          {t('capture.saveDraft')}
        </Button>
        <p className="text-note text-muted">{t('capture.note')}</p>
      </div>
    </Screen>
  );
}


