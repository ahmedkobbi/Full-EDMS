/**
 * Smart EDMS router configuration (spec §4.1, §27.5).
 *
 * React Router v6 routes. Unauthenticated users see only /login. Authenticated
 * users see the full app inside the AppShell layout.
 *
 * Routes:
 *  /login             — sign in
 *  /dashboard         — landing page
 *  /documents         — document library
 *  /documents/:id     — document detail
 *  /search            — advanced search
 *  /workflows         — workflow instances + designer
 *  /audit             — audit log explorer
 *  /admin             — tenant administration
 *  /scanner           — scanner agent profiles
 *  /tours             — guided tour catalog
 *  /settings          — user settings
 *  *                  — NotFound
 *
 * Routes are eagerly imported (no React.lazy) because the bundled renderer
 * is a single ASAR archive — there is no network cost to loading all routes
 * at once, and lazy loading would add a Suspense boundary the user does not
 * benefit from.
 */
import type { ComponentType, JSX } from 'react';
import { Navigate } from 'react-router-dom';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { DocumentsPage } from './pages/Documents';
import { DocumentDetailPage } from './pages/DocumentDetail';
import { SearchPage } from './pages/Search';
import { WorkflowsPage } from './pages/Workflows';
import { AuditPage } from './pages/Audit';
import { AdminPage } from './pages/Admin';
import { ScannerPage } from './pages/Scanner';
import { ToursPage } from './pages/Tours';
import { SettingsPage } from './pages/Settings';
import { NotFoundPage } from './pages/NotFound';

export interface RouteConfig {
  readonly path: string;
  readonly element: ComponentType;
  /** Tour selector that identifies the page for tour targeting. */
  readonly tourKey?: string;
}

/** Routes accessible without authentication. */
const publicRoutes: readonly RouteConfig[] = [
  { path: '/login', element: LoginPage },
] as const;

/**
 * Tiny wrapper that redirects to a target path. Used for `/` → `/dashboard`.
 */
function RedirectTo({ path }: { readonly path: string }): JSX.Element {
  return <Navigate to={path} replace />;
}

/** Routes that require authentication. Rendered inside the AppShell. */
const authenticatedRoutes: readonly RouteConfig[] = [
  { path: '/', element: () => <RedirectTo path="/dashboard" />, tourKey: 'app.dashboard' },
  { path: '/dashboard', element: DashboardPage, tourKey: 'app.dashboard' },
  { path: '/documents', element: DocumentsPage, tourKey: 'documents.table' },
  { path: '/documents/:id', element: DocumentDetailPage, tourKey: 'documents.detail' },
  { path: '/search', element: SearchPage, tourKey: 'app.search' },
  { path: '/workflows', element: WorkflowsPage, tourKey: 'workflow.designerCanvas' },
  { path: '/audit', element: AuditPage, tourKey: 'audit.timeline' },
  { path: '/admin', element: AdminPage, tourKey: 'admin.overview' },
  { path: '/scanner', element: ScannerPage, tourKey: 'scanner.profiles' },
  { path: '/tours', element: ToursPage, tourKey: 'help.menu' },
  { path: '/settings', element: SettingsPage, tourKey: 'app.settings' },
  { path: '*', element: NotFoundPage },
] as const;

/** Routes exported for the App component. */
export const routes = {
  public: publicRoutes,
  authenticated: authenticatedRoutes,
  Login: publicRoutes[0],
} as const;
