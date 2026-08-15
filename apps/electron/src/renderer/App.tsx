/**
 * Smart EDMS root application shell (spec §4.1, §17, §27.5).
 *
 * Renders the authenticated shell (sidebar + topbar + outlet) OR the login
 * page based on the auth state. Also mounts the global overlays:
 *  - Guided Tour engine (TourEngine)
 *  - AI Assistant bubble (AiAssistantBubble)
 *
 * The shell uses Mantine v7 AppShell with logical-CSS-property-aware
 * layouts so RTL (Arabic) works without overrides.
 */
import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoadingState } from '@smart-edms/ui';
import { AppShellLayout } from './components/layout/AppShell';
import { TourEngine } from './components/tour/TourEngine';
import { AiAssistantBubble } from './components/ai/AiAssistantBubble';
import { useAuthStore } from './store/auth';
import { routes } from './routes';

/**
 * The root App. Decides between the authenticated shell and the login page.
 */
export function App() {
  const session = useAuthStore((s) => s.session);
  const initializing = useAuthStore((s) => s.initializing);

  if (initializing) {
    return <LoadingState messageKey="status.loading" fullScreen />;
  }

  if (!session) {
    // Unauthenticated: only the login route + tours-preview route is
    // accessible. Everything else redirects to /login.
    return (
      <Suspense fallback={<LoadingState messageKey="status.loading" fullScreen />}>
        <Routes>
          <Route path="/login" element={<routes.Login.element />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  // Authenticated: render the full shell with the global overlays.
  return (
    <>
      <AppShellLayout>
        <Suspense fallback={<LoadingState messageKey="status.loading" />}>
          <Routes>
            {routes.authenticated.map((route) => (
              <Route key={route.path} path={route.path} element={<route.element />} />
            ))}
          </Routes>
        </Suspense>
      </AppShellLayout>
      <TourEngine />
      <AiAssistantBubble />
    </>
  );
}
