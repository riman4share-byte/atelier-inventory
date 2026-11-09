import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from './App';
import { AuthProvider } from './features/auth/AuthProvider';
import './i18n';
import { queryClient } from './lib/queryClient';

describe('App', () => {
  it('boots into the setup screen when Supabase is not configured', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={['/setup']}>
            <App />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { name: /connect supabase/i })).toBeInTheDocument();
  });
});
