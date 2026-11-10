/**
 * Phase 6 client-side compositing. The cutout (transparent PNG from the
 * bg-remove Edge Function) is drawn onto a chosen background with a mild
 * auto-enhance. Re-styling needs no new API call: just re-composite.
 */

export type BackgroundChoice =
  | { kind: 'solid'; color: string }
  | { kind: 'gradient' }
  /** The old preset name, kept so existing rows still composite. */
  | { kind: 'blush' };

export const PRESET_BACKGROUNDS: Array<{ id: string; label: string; choice: BackgroundChoice }> = [
  { id: 'white', label: 'Studio white', choice: { kind: 'solid', color: '#ffffff' } },
  { id: 'gray', label: 'Soft gray', choice: { kind: 'solid', color: '#f3f4f6' } },
  { id: 'studio', label: 'Studio gradient', choice: { kind: 'gradient' } },
];

export interface Enhancement {
  brightness: number; // 1 = neutral
  contrast: number;
  saturation: number;
}

export const DEFAULT_ENHANCEMENT: Enhancement = { brightness: 1.05, contrast: 1.05, saturation: 1.03 };

export interface CompositeResult {
  blob: Blob;
  width: number;
  height: number;
}

export async function compositeCutout(
  cutout: Blob,
  background: BackgroundChoice,
  enhancement: Enhancement,
): Promise<CompositeResult> {
  const bitmap = await createImageBitmap(cutout);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas_unavailable');

    // Background fill
    if (background.kind === 'gradient' || background.kind === 'blush') {
      // Neutral studio gradient, matching the app's industrial palette.
      // 'blush' is the old preset name and is still accepted so photos
      // cleaned before the re-theme still re-composite correctly.
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#f8fafc');
      gradient.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = background.color;
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Auto-enhance via canvas filter (no pixel loop needed)
    ctx.filter = `brightness(${enhancement.brightness}) contrast(${enhancement.contrast}) saturate(${enhancement.saturation})`;
    ctx.drawImage(bitmap, 0, 0);
    ctx.filter = 'none';

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png'),
    );
    if (!blob) throw new Error('encode_failed');
    return { blob, width: canvas.width, height: canvas.height };
  } finally {
    bitmap.close();
  }
}

/** Decode a base64 string (as returned by the Edge Function) into a Blob. */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

/**
 * Free, in-browser background removal using @imgly/background-removal (WASM).
 * No API key, no server. Quality is decent on simple backgrounds but weaker
 * on lace, tulle and veils than Photoroom/remove.bg.
 */
export async function removeBackgroundInBrowser(imageUrl: string): Promise<Blob> {
  const mod = await import('@imgly/background-removal');
  return mod.removeBackground(imageUrl);
}


/**
 * Free, self-hosted background removal via a rembg server (no API key).
 * POSTs the image to the rembg endpoint and returns the cutout PNG.
 */
export async function removeBackgroundViaRembg(imageUrl: string, endpoint: string): Promise<Blob> {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error('image_fetch_failed');
  const blob = await imgRes.blob();
  const form = new FormData();
  form.append('file', blob, 'image.jpg');
  const res = await fetch(endpoint, { method: 'POST', body: form });
  if (!res.ok) throw new Error('rembg_failed_' + res.status);
  return res.blob();
}
