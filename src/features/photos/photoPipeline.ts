/**
 * Phase 4 image pipeline (upload path). Everything runs in the browser:
 * decode → scale to at most MAX_LONG_SIDE on the long edge → re-encode JPEG
 * at JPEG_QUALITY. Re-encoding through canvas-captured pixels strips EXIF
 * metadata (including GPS) because only the decoded bitmap is kept.
 */

export const MAX_LONG_SIDE = 2000;
export const JPEG_QUALITY = 0.85;

export interface ResizePlan {
  width: number;
  height: number;
}

/** Non-growing scale-to-fit so the long side never exceeds maxLongSide. */
export function resizePlan(
  width: number,
  height: number,
  maxLongSide: number = MAX_LONG_SIDE,
): ResizePlan {
  if (width <= 0 || height <= 0) return { width: 1, height: 1 };
  const long = Math.max(width, height);
  if (long <= maxLongSide) return { width, height };
  const scale = maxLongSide / long;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export interface PreparedPhoto {
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Decode one image file (applying EXIF rotation), downscale per the plan and
 * return the re-encoded JPEG blob ready for storage upload.
 */
export async function preparePhoto(
  file: Blob,
  options: { maxLongSide?: number; quality?: number } = {},
): Promise<PreparedPhoto> {
  const maxLongSide = options.maxLongSide ?? MAX_LONG_SIDE;
  const quality = options.quality ?? JPEG_QUALITY;

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const plan = resizePlan(bitmap.width, bitmap.height, maxLongSide);
    const canvas = document.createElement('canvas');
    canvas.width = plan.width;
    canvas.height = plan.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas_unavailable');
    context.drawImage(bitmap, 0, 0, plan.width, plan.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (!blob) throw new Error('encode_failed');
    return { blob, width: plan.width, height: plan.height };
  } finally {
    bitmap.close();
  }
}

/** Storage paths stay namespaced per dress and never hold personal names. */
export function photoPath(dressId: string, id: string): string {
  return `${dressId}/${id}.jpg`;
}
