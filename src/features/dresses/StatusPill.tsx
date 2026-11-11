import type { DressStatus } from '@/lib/database.types';
import { cx } from '@/lib/cx';

/** Status → dot colour. The label itself stays neutral ink. */
const STATUS_DOT: Record<DressStatus, string> = {
  available: 'bg-ok',
  reserved: 'bg-warn',
  rented: 'bg-info',
  sold: 'bg-off',
};

/**
 * Status as a legend: a coloured dot and an uppercase monospaced label.
 * Reading "AVAILABLE" in a fixed-width face is faster than decoding a
 * coloured pill, and it survives being printed or copied into a note.
 */
export function StatusPill({ status, label }: { status: DressStatus; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span aria-hidden="true" className={cx('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_DOT[status])} />
      <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted">
        {label}
      </span>
    </span>
  );
}

/**
 * Tile ramp for the gallery, in order of visual weight. Each step is a
 * neutral tonal value — colour is reserved for status, never decoration.
 */
export const TILE_PALETTES = [
  { tile: 'bg-c1', icon: 'text-muted' },
  { tile: 'bg-c2', icon: 'text-muted' },
  { tile: 'bg-c3', icon: 'text-accent' },
  { tile: 'bg-c4', icon: 'text-accent' },
] as const;

/** A stable tonal step per dress code so tiles keep their shade across visits. */
export function paletteForCode(code: string) {
  let hash = 0;
  for (let i = 0; i < code.length; i += 1) {
    hash = (hash * 31 + code.charCodeAt(i)) % 100000;
  }
  const index = hash % TILE_PALETTES.length;
  return TILE_PALETTES[index] ?? { tile: 'bg-c1', icon: 'text-muted' };
}
