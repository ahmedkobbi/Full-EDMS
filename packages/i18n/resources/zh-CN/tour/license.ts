/**
 * @smart-edms/i18n — zh-CN translation: `tour.license` namespace.
 *
 * Source of truth: en/tour/license.ts
 * Translated from the English baseline.
 *
 * REVIEW: native speaker needed
 * This namespace contains compliance-relevant content (license states, grace
 * periods, remediation). Translations should be reviewed by a native
 * Chinese-speaking licensing / compliance specialist before production rollout.
 */

const license = {
  title: '许可证导览',
  subtitle: '了解您的许可证状态以及每种状态的含义。',

  'step.intro.title': '简单解释您的许可证',
  'step.intro.body': 'Smart EDMS 使用一种平静、可预测的许可证模型。本导览将带您了解每种状态，让您知道会发生什么——以及不必担心什么。',

  'step.overview.title': '许可证概览',
  'step.overview.body': '在许可证页面，您可以查看当前状态、许可证何时到期、已使用的用户数和存储量，以及已启用的模块。',

  'step.state.valid.title': '状态 1：活动',
  'step.state.valid.body': '当您的许可证处于活动状态时，一切都按预期工作。您已许可的所有功能都可用。这是正常的日常状态。',

  'step.state.expiringSoon.title': '状态 2：即将到期续订',
  'step.state.expiringSoon.body': '在许可证到期前几周，您会看到一个温和的提醒。一切都不变——一切继续工作。这只是友善地提醒您在方便时续订。',

  'step.state.expiredGrace.title': '状态 3：续订进行中',
  'step.state.expiredGrace.body': '如果您的许可证在续订完成之前到期，您将进入宽限期。系统继续全面运行。您的数据是安全的。可在方便时续订。',

  'step.state.graceExhausted.title': '状态 4：需要续订',
  'step.state.graceExhausted.body': '如果宽限期结束而未续订，写入访问将暂停。您仍可读取文档和导出数据——只是无法添加或更改任何内容。续订以恢复完全访问。',

  'step.state.extendedRemediation.title': '状态 5：补救进行中',
  'step.state.extendedRemediation.body': '在极少数情况下——例如账单争议或长期连接问题——您的许可证会进入扩展补救状态。系统以降级状态运行。请联系支持人员解决。',

  'step.state.invalid.title': '状态 6：许可证未激活',
  'step.state.invalid.body': '如果许可证被吊销或从未激活，系统将不活动。请联系您的管理员以恢复访问。您的数据保持完好。',

  'step.heartbeat.title': '心跳模型',
  'step.heartbeat.body': 'Smart EDMS 会定期与许可证服务器签到。如果无法连接到服务器——例如您处于离线状态——系统会继续正常运行。心跳失败从不会阻止访问。',

  'step.offline.title': '离线工作',
  'step.offline.body': 'Smart EDMS 专为离线操作而设计。您可以连续数周工作而无需联系许可证服务器。当连接恢复时，心跳会自动恢复。',

  'step.renew.title': '如何续订',
  'step.renew.body': '续订只需点击一次。您可以使用支付方式在线续订，或导入从您的客户经理处收到的 .sedmslic 许可证文件。',

  'step.import.title': '导入许可证文件',
  'step.import.body': '.sedmslic 文件是已签名的许可证文件。从许可证页面导入它以激活或延长您的许可证。文件会根据您的组织标识进行验证。',

  'step.export.title': '导出请求文件',
  'step.export.body': '对于物理隔离的安装，请生成 .sedmsreq 请求文件。将其发送给您的客户经理，客户经理会返回 .sedmslic 文件。',

  'step.noAlarm.title': '没有意外，没有警报',
  'step.noAlarm.body': 'Smart EDMS 从不会在没有警告的情况下锁定您。每次状态转换都会提前通知，您的数据始终安全。',

  'step.adminRole.title': '谁看到什么',
  'step.adminRole.body': '许可证状态对管理员可见。普通用户只在到期续订时看到一个小型可关闭的横幅——他们从不被惊动。',

  'step.dataSafety.title': '您的数据是安全的',
  'step.dataSafety.body': '任何许可证状态都不会删除您的文档。即使许可证被吊销，您的数据仍保持完好并可以导出。',

  'completion.title': '您了解许可证模型',
  'completion.body': '您现在知道每种许可证状态的含义以及如何续订。参加扫描仪导览以了解纸质文件数字化。',
  'completion.next': '参加扫描仪导览',

  'checklist.title': '许可证导览清单',
  'checklist.item.viewStatus': '查看您当前的许可证状态',
  'checklist.item.checkExpiry': '检查到期日期',
  'checklist.item.identifyRenewal': '找到续订按钮',
  'checklist.item.findImport': '找到 .sedmslic 导入选项',
  'checklist.item.findExport': '找到 .sedmsreq 导出选项',
} as const;

export default license;
