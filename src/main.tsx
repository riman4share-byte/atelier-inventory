import '@fontsource-variable/cairo';
import '@fontsource-variable/fraunces';
import './styles/index.css';
import './i18n';

import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './features/auth/AuthProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { queryClient } from './lib/queryClient';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root is missing from index.html.');

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
