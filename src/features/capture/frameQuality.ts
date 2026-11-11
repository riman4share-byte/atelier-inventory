/**
 * Frame quality.
 *
 * A camera that has just been opened - or has just been switched from the
 * front lens to the back one - hands out black frames for a moment before
 * the sensor has caught up. Those frames look like a photograph on the
 * device but are worth nothing in the catalogue.
 *
 * These helpers decide whether a frame carries any image at all, so the
 * capture screen can wait for a real picture instead of saving a black
 * rectangle.
 */

export interface FrameStats {
  /** Average brightness across the frame, 0-255. */
  mean: number;
  /** Brightest pixel in the frame, 0-255. */
  max: number;
  /** How many different brightness levels the frame contains. */
  distinct: number;
}

/** The brightest a pixel may be and still count as a black frame. */
export const BLACK_FRAME_MAX = 12;

/** How many brightness levels a flat placeholder frame is allowed. */
export const FLAT_FRAME_LEVELS = 2;

/**
 * A frame is "empty" when it carries no picture.
 *
 * Two things make that true: it is entirely black (nothing was lit), or it
 * is a single flat tone (the sensor sent a placeholder rather than an
 * image). A real photograph - even a very dark one - always has a spread
 * of brightness levels.
 */
export function isEmptyFrame(stats: FrameStats): boolean {
  // Nothing bright anywhere: a black frame.
  if (stats.max <= BLACK_FRAME_MAX) return true;
  // One single flat tone: a placeholder, not a picture.
  if (stats.distinct <= FLAT_FRAME_LEVELS) return true;
  return false;
}

/**
 * Reads the brightness of a frame that has already been drawn onto a canvas.
 *
 * The caller decides how large the canvas is; a small sample is enough and
 * keeps this cheap enough to run on every capture.
 */
export function readFrameStats(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): FrameStats {
  const pixels = context.getImageData(0, 0, width, height).data;
  let sum = 0;
  let max = 0;
  const levels = new Set<number>();

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i] ?? 0;
    const g = pixels[i + 1] ?? 0;
    const b = pixels[i + 2] ?? 0;
    const luma = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
    sum += luma;
    if (luma > max) max = luma;
    levels.add(luma);
  }

  const count = pixels.length / 4;
  return {
    mean: count === 0 ? 0 : Math.round(sum / count),
    max,
    distinct: levels.size,
  };
}
