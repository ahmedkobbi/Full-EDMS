/**
 * @smart-edms/i18n — Dashboard namespace
 *
 * Dashboard page strings for the Electron desktop client + License Admin Panel.
 */
const dashboard = {
  'dashboard.welcome': 'Welcome to Smart EDMS',
  'dashboard.welcomeUser': 'Welcome, {{firstName}}',
  'dashboard.subtitle': 'Your enterprise document management overview',
  'dashboard.quickActions': 'Quick actions',
  'dashboard.recentDocuments': 'Recent documents',
  'dashboard.recentActivity': 'Recent activity',
  'dashboard.upcomingApprovals': 'Pending approvals',
  'dashboard.upcomingRetentions': 'Upcoming retentions',
  'dashboard.licenseStatus': 'License status',
  'dashboard.systemHealth': 'System health',
  'dashboard.storageUsed': 'Storage used',
  'dashboard.storageQuota': '{{used}} of {{quota}}',
  'dashboard.userCount': 'Active users',
  'dashboard.documentCount': 'Documents',
  'dashboard.workflowCount': 'Active workflows',
  'dashboard.auditEventCount': 'Audit events (30 days)',
  'dashboard.viewAll': 'View all',
  'dashboard.noRecentDocuments': 'No recent documents',
  'dashboard.noRecentDocuments.hint': 'Upload your first document to get started.',
  'dashboard.noRecentActivity': 'No recent activity',
  'dashboard.noPendingApprovals': 'No pending approvals',
  'dashboard.noUpcomingRetentions': 'No upcoming retentions',
  'dashboard.action.uploadDocument': 'Upload document',
  'dashboard.action.startTour': 'Start guided tour',
  'dashboard.action.askAi': 'Ask AI Assistant',
  'dashboard.action.viewAudit': 'View audit trail',
  'dashboard.action.createWorkflow': 'Create workflow',

  // License admin panel dashboard
  'dashboard.licenseServer.totalLicenses': 'Total licenses',
  'dashboard.licenseServer.activeActivations': 'Active activations',
  'dashboard.licenseServer.expiringSoon': 'Expiring within 30 days',
  'dashboard.licenseServer.trialsActive': 'Active trials',
  'dashboard.licenseServer.recentIssued': 'Recently issued',
  'dashboard.licenseServer.recentRevocations': 'Recently revoked',
  'dashboard.licenseServer.heartbeatFailures': 'Heartbeat failures (24h)',
  'dashboard.licenseServer.webhookDeliveries': 'Webhook deliveries (24h)',
} as const;

export default dashboard;
