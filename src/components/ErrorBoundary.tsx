import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/** Catches render errors so one broken screen never takes down the whole app. */
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
      return (
        <div className="grid min-h-dvh place-items-center p-6 text-center">
          <div>
            <h1 className="text-title font-semibold text-ink">Something went wrong</h1>
            <p className="mt-2 text-small text-muted">{this.state.message}</p>
            <button
              type="button"
              className="mt-4 min-h-tap rounded-pill bg-accent px-4 text-body font-bold text-accent-ink"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
