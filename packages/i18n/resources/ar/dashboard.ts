// REVIEW: native speaker needed
/**
 * @smart-edms/i18n — Arabic (MSA, RTL): dashboard namespace.
 */
const dashboard = {
  'dashboard.welcome': 'مرحبًا بك في Smart EDMS',
  'dashboard.welcomeUser': 'مرحبًا، {{firstName}}',
  'dashboard.subtitle': 'نظرة عامة على إدارة مستندات المؤسسة',
  'dashboard.quickActions': 'إجراءات سريعة',
  'dashboard.recentDocuments': 'المستندات الأخيرة',
  'dashboard.recentActivity': 'النشاط الأخير',
  'dashboard.upcomingApprovals': 'الموافقات المعلّقة',
  'dashboard.upcomingRetentions': 'الاحتفاظات القادمة',
  'dashboard.licenseStatus': 'حالة الترخيص',
  'dashboard.systemHealth': 'حالة النظام',
  'dashboard.storageUsed': 'المساحة المستخدمة',
  'dashboard.storageQuota': '{{used}} من {{quota}}',
  'dashboard.userCount': 'المستخدمون النشطون',
  'dashboard.documentCount': 'المستندات',
  'dashboard.workflowCount': 'سير العمل النشط',
  'dashboard.auditEventCount': 'أحداث التدقيق (30 يومًا)',
  'dashboard.viewAll': 'عرض الكل',
  'dashboard.noRecentDocuments': 'لا توجد مستندات حديثة',
  'dashboard.noRecentDocuments.hint': 'ارفع أول مستند للبدء.',
  'dashboard.noRecentActivity': 'لا يوجد نشاط حديث',
  'dashboard.noPendingApprovals': 'لا توجد موافقات معلّقة',
  'dashboard.noUpcomingRetentions': 'لا توجد احتفاظات قادمة',
  'dashboard.action.uploadDocument': 'رفع مستند',
  'dashboard.action.startTour': 'بدء الجولة الإرشادية',
  'dashboard.action.askAi': 'اسأل المساعد الذكي',
  'dashboard.action.viewAudit': 'عرض مسار التدقيق',
  'dashboard.action.createWorkflow': 'إنشاء سير عمل',

  'dashboard.licenseServer.totalLicenses': 'إجمالي التراخيص',
  'dashboard.licenseServer.activeActivations': 'التفعيلات النشطة',
  'dashboard.licenseServer.expiringSoon': 'تنتهي خلال 30 يومًا',
  'dashboard.licenseServer.trialsActive': 'النسخ التجريبية النشطة',
  'dashboard.licenseServer.recentIssued': 'أُصدرت مؤخرًا',
  'dashboard.licenseServer.recentRevocations': 'أُلغيت مؤخرًا',
  'dashboard.licenseServer.heartbeatFailures': 'فشل نبضات الاتصال (24 ساعة)',
  'dashboard.licenseServer.webhookDeliveries': 'تسليمات خطاف الويب (24 ساعة)',
} as const;

export default dashboard;
