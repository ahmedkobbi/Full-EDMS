/**
 * Root App component for the License Admin Panel.
 *
 * Renders the login page when unauthenticated, or the admin shell + the
 * current page when authenticated. Mounts the global StepUpProvider (so
 * any sensitive mutation can request step-up auth) and the GuidedTour
 * (auto-starts on first visit).
 */
import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoadingState } from './components/common/LoadingState';
import { AdminShell } from './components/layout/AdminShell';
import { StepUpProvider } from './components/common/StepUpProvider';
import { GuidedTour } from './components/tour/GuidedTour';
import { useAuthStore } from './store/auth';
import { publicRoutes, authenticatedRoutes } from './routes';

export function App() {
  const session = useAuthStore((s) => s.session);
  const initializing = useAuthStore((s) => s.initializing);

  if (initializing) {
    return <LoadingState messageKey="common:status.loading" fullScreen />;
  }

  if (!session) {
    return (
      <Suspense fallback={<LoadingState messageKey="common:status.loading" fullScreen />}>
        <Routes>
          {publicRoutes.map((r) => (
            <Route key={r.path} path={r.path} element={<r.element />} />
          ))}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <StepUpProvider>
      <AdminShell>
        <Suspense fallback={<LoadingState messageKey="common:status.loading" />}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            {authenticatedRoutes.map((r) => (
              <Route key={r.path} path={r.path} element={<r.element />} />
            ))}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </AdminShell>
      <GuidedTour />
    </StepUpProvider>
  );
}
