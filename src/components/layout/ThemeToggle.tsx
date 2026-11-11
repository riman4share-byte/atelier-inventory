import { useEffect, useState, type ComponentType, type SVGProps } from 'react';
import { useTranslation } from 'react-i18next';
import { ContrastIcon, MoonIcon, SunIcon } from '@/components/icons';
import { cx } from '@/lib/cx';
import {
  applyTheme,
  readStoredTheme,
  resolveTheme,
  storeTheme,
  watchSystemTheme,
  type Theme,
} from '@/lib/theme';

interface ThemeToggleProps {
  className?: string;
  /** Renders the label beside the icons instead of hiding it. */
  showLabel?: boolean;
}

/**
 * A three-cell switch: light, follow the system, dark.
 *
 * It reads like a hardware toggle — one bordered frame, the active cell
 * filled with the accent — rather than a row of pills.
 */
export function ThemeToggle({ className, showLabel }: ThemeToggleProps) {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme());
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => resolveTheme(readStoredTheme()));

  useEffect(() => {
    applyTheme(theme);
    setResolved(resolveTheme(theme));
  }, [theme]);

  // While the theme follows the system, react to the OS switching.
  useEffect(() => {
    if (theme !== 'system') return undefined;
    return watchSystemTheme((next) => {
      setResolved(next);
      applyTheme('system');
    });
  }, [theme]);

  const choose = (next: Theme) => {
    setTheme(next);
    storeTheme(next);
    applyTheme(next);
    setResolved(resolveTheme(next));
  };

  const options: ReadonlyArray<{
    value: Theme;
    labelKey: string;
    Icon: ComponentType<SVGProps<SVGSVGElement>>;
  }> = [
    { value: 'light', labelKey: 'theme.light', Icon: SunIcon },
    { value: 'system', labelKey: 'theme.system', Icon: ContrastIcon },
    { value: 'dark', labelKey: 'theme.dark', Icon: MoonIcon },
  ];

  return (
    <div
      role="group"
      aria-label={t('theme.label')}
      className={cx(
        'inline-flex h-8 overflow-hidden rounded-field border border-line bg-surface-2',
        className,
      )}
    >
      {options.map((option, index) => {
        const active = theme === option.value;
        const { Icon } = option;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            title={t(option.labelKey)}
            onClick={() => choose(option.value)}
            className={cx(
              'grid h-full w-8 place-items-center transition-colors duration-100',
              index > 0 && 'border-l border-line',
              active
                ? 'bg-accent text-accent-ink'
                : 'text-muted hover:bg-surface-3 hover:text-ink',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="sr-only">{t(option.labelKey)}</span>
          </button>
        );
      })}
      {showLabel ? (
        <span className="ml-2 self-center text-caption text-muted">
          {t(`theme.${resolved}`)}
        </span>
      ) : null}
    </div>
  );
}
