/**
 * Route definitions for the License Admin Panel.
 *
 * Two route trees:
 *  - Unauthenticated: `/login` only. Everything else redirects to `/login`.
 *  - Authenticated: the full admin shell (dashboard, customers, products,
 *    licenses, activations, offline-activations, trials, webhooks,
 *    api-keys, audit, signing-keys, settings).
 */
import type { ComponentType } from 'react';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { CustomersPage } from './pages/Customers';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { ProductsPage } from './pages/Products';
import { LicensesPage } from './pages/Licenses';
import { LicenseDetailPage } from './pages/LicenseDetailPage';
import { ActivationsPage } from './pages/Activations';
import { OfflineActivationsPage } from './pages/OfflineActivations';
import { TrialsPage } from './pages/Trials';
import { WebhooksPage } from './pages/Webhooks';
import { ApiKeysPage } from './pages/ApiKeys';
import { AuditLogsPage } from './pages/AuditLogs';
import { SigningKeysPage } from './pages/SigningKeys';
import { SettingsPage } from './pages/Settings';
import { UsagePage } from './pages/Usage';
import { AdminUsersPage } from './pages/AdminUsers';
import { SecurityPage } from './pages/Security';

export interface RouteDef {
  readonly path: string;
  readonly element: ComponentType;
  readonly tour?: string;
}

export const publicRoutes: readonly RouteDef[] = [
  { path: '/login', element: LoginPage },
];

export const authenticatedRoutes: readonly RouteDef[] = [
  { path: '/dashboard', element: DashboardPage, tour: 'admin.dashboard.page' },
  { path: '/usage', element: UsagePage },
  { path: '/customers', element: CustomersPage },
  { path: '/customers/:id', element: CustomerDetailPage },
  { path: '/products', element: ProductsPage },
  { path: '/licenses', element: LicensesPage },
  { path: '/licenses/:id', element: LicenseDetailPage },
  { path: '/activations', element: ActivationsPage },
  { path: '/offline-activations', element: OfflineActivationsPage },
  { path: '/trials', element: TrialsPage },
  { path: '/webhooks', element: WebhooksPage },
  { path: '/api-keys', element: ApiKeysPage },
  { path: '/audit', element: AuditLogsPage },
  { path: '/security', element: SecurityPage },
  { path: '/signing-keys', element: SigningKeysPage },
  { path: '/admin-users', element: AdminUsersPage },
  { path: '/settings', element: SettingsPage },
];
