import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireAdmin } from '@/features/auth/RequireAdmin';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { CapturePage } from '@/features/capture/CapturePage';
import { DressesPage } from '@/features/dresses/DressesPage';
import { DressDetailPage } from '@/features/dresses/DressDetailPage';
import { MaterialsPage } from '@/features/materials/MaterialsPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { useDocumentLanguage } from '@/i18n/useDocumentLanguage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { DressByCodePage } from '@/pages/DressByCodePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { SharePage } from '@/pages/SharePage';
import { SetupPage } from '@/pages/SetupPage';

export default function App() {
  useDocumentLanguage();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />
      {/* Share links are public by design: no login, read-only, short-lived. */}
      <Route path="/share/:token" element={<SharePage />} />
      {/* Public QR destination: staff see the full page, others a minimal card. */}
      <Route path="/d/:code" element={<DressByCodePage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="dresses" element={<DressesPage />} />
          <Route path="dresses/new" element={<DressDetailPage />} />
          <Route path="dresses/:id" element={<DressDetailPage />} />
          <Route path="capture" element={<CapturePage />} />
          <Route path="materials" element={<MaterialsPage />} />
          <Route path="settings" element={<RequireAdmin />}>
            <Route index element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
