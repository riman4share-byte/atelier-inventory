import type { DressStatus } from '@/lib/database.types';
import { cx } from '@/lib/cx';

/** Status → token classes, following the mockup palette. */
const STATUS_CLASSES: Record<DressStatus, string> = {
  available: 'bg-ok-bg text-ok',
  reserved: 'bg-warn-bg text-warn',
  rented: 'bg-info-bg text-info',
  sold: 'bg-off-bg text-off',
};

export function StatusPill({ status, label }: { status: DressStatus; label: string }) {
  return (
    <span
      className={cx(
        'rounded-pill px-2.5 py-[3px] text-note font-bold whitespace-nowrap',
        STATUS_CLASSES[status],
      )}
    >
      {label}
    </span>
  );
}

/** Pastel tile palette from the mockup (c1–c4 with matching icon colours). */
export const TILE_PALETTES = [
  { tile: 'bg-c1', icon: 'text-accent' },
  { tile: 'bg-c2', icon: 'text-accent2' },
  { tile: 'bg-c3', icon: 'text-gold' },
  { tile: 'bg-c4', icon: 'text-ok' },
] as const;

/** A stable pastel per dress code so tiles keep their colour across visits. */
export function paletteForCode(code: string) {
  let hash = 0;
  for (let i = 0; i < code.length; i += 1) {
    hash = (hash * 31 + code.charCodeAt(i)) % 100000;
  }
  const index = hash % TILE_PALETTES.length;
  return TILE_PALETTES[index] ?? { tile: 'bg-c1', icon: 'text-accent' };
}
