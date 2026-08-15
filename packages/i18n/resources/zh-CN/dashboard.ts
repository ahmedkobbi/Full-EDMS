// REVIEW: native speaker needed
/**
 * @smart-edms/i18n — Simplified Chinese: dashboard namespace.
 */
const dashboard = {
  'dashboard.welcome': '欢迎使用 Smart EDMS',
  'dashboard.welcomeUser': '欢迎，{{firstName}}',
  'dashboard.subtitle': '企业文档管理概览',
  'dashboard.quickActions': '快速操作',
  'dashboard.recentDocuments': '最近文档',
  'dashboard.recentActivity': '最近活动',
  'dashboard.upcomingApprovals': '待审批',
  'dashboard.upcomingRetentions': '即将到期保留',
  'dashboard.licenseStatus': '许可证状态',
  'dashboard.systemHealth': '系统健康',
  'dashboard.storageUsed': '已用存储',
  'dashboard.storageQuota': '{{used}} / {{quota}}',
  'dashboard.userCount': '活跃用户',
  'dashboard.documentCount': '文档数',
  'dashboard.workflowCount': '活跃工作流',
  'dashboard.auditEventCount': '审计事件（30 天）',
  'dashboard.viewAll': '查看全部',
  'dashboard.noRecentDocuments': '暂无最近文档',
  'dashboard.noRecentDocuments.hint': '上传您的第一个文档以开始。',
  'dashboard.noRecentActivity': '暂无最近活动',
  'dashboard.noPendingApprovals': '暂无待审批',
  'dashboard.noUpcomingRetentions': '暂无即将到期的保留',
  'dashboard.action.uploadDocument': '上传文档',
  'dashboard.action.startTour': '开始引导导览',
  'dashboard.action.askAi': '询问 AI 助手',
  'dashboard.action.viewAudit': '查看审计追踪',
  'dashboard.action.createWorkflow': '创建工作流',

  'dashboard.licenseServer.totalLicenses': '许可证总数',
  'dashboard.licenseServer.activeActivations': '活跃激活',
  'dashboard.licenseServer.expiringSoon': '30 天内到期',
  'dashboard.licenseServer.trialsActive': '活跃试用',
  'dashboard.licenseServer.recentIssued': '最近签发',
  'dashboard.licenseServer.recentRevocations': '最近吊销',
  'dashboard.licenseServer.heartbeatFailures': '心跳失败（24 小时）',
  'dashboard.licenseServer.webhookDeliveries': 'Webhook 投递（24 小时）',
} as const;

export default dashboard;
