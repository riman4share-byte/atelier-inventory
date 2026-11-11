import { Component, type ErrorInfo, type ReactNode } from 'react';
import i18n from '@/i18n';
import { Button } from '@/components/ui/Button';
import { AlertIcon } from '@/components/icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Catches render errors so one broken screen never takes down the whole app.
 * The raw exception text is a developer detail, so it stays behind the
 * development flag.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('render error', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const t = i18n.t.bind(i18n);
      return (
        <div className="grid min-h-dvh place-items-center bg-bg px-6">
          <div className="w-full max-w-sm rounded-card border border-line bg-surface p-5">
            <div className="flex items-center gap-2 text-danger">
              <AlertIcon className="h-4 w-4" />
              <span className="eyebrow text-danger">{t('errors.title')}</span>
            </div>
            <h1 className="mt-2 text-title font-semibold tracking-tight text-ink">
              {t('errors.unknown')}
            </h1>
            <p className="mt-1.5 text-small text-muted">{t('errors.unknownBody')}</p>
            {import.meta.env.DEV && this.state.message ? (
              <pre className="mt-3 overflow-x-auto rounded-field border border-line bg-surface-2 p-2 font-mono text-[11px] text-muted">
                {this.state.message}
              </pre>
            ) : null}
            <Button variant="secondary" className="mt-4" onClick={() => window.location.reload()}>
              {t('errors.reload')}
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
