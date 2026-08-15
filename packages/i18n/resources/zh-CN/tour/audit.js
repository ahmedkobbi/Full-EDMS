"use strict";
/**
 * @smart-edms/i18n — zh-CN translation: `tour.audit` namespace.
 *
 * Source of truth: en/tour/audit.ts
 * Translated from the English baseline.
 *
 * REVIEW: native speaker needed
 * This namespace contains compliance-relevant content (audit, integrity,
 * legal hold). Translations should be reviewed by a native Chinese-speaking
 * compliance specialist before production rollout.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const audit = {
    title: '审计导览',
    subtitle: '了解每个操作的防篡改记录。',
    'step.intro.title': '审计日志',
    'step.intro.body': 'Smart EDMS 中的每个操作——登录、查看文档、工作流审批、法定保留——都记录在您可以信赖的审计日志中。',
    'step.tamperEvident.title': '防篡改',
    'step.tamperEvident.body': '每个审计事件都包含前一个事件的哈希，形成一条链。如果有人修改了旧事件，链条就会断开，我们可以检测到。',
    'step.integrity.title': '完整性验证',
    'step.integrity.body': '点击"验证完整性"以遍历哈希链并确认没有事件被篡改。结果本身也会被审计。',
    'step.filters.title': '筛选和搜索',
    'step.filters.body': '按操作者、操作、类别、资源、日期范围或结果进行筛选。保存常用查询用于合规报告。',
    'step.export.title': '导出',
    'step.export.body': '将审计日志导出为 CSV、JSON 或已签名的 PDF。PDF 包含哈希链头，以便日后验证导出。',
    'step.actorKinds.title': '操作者类型',
    'step.actorKinds.body': '操作归属于用户、服务账户、系统本身、AI 助手或许可证服务器。始终知道谁（或什么）做了什么。',
    'step.categories.title': '类别',
    'step.categories.body': '事件分为 22 个类别——身份验证、文档访问、分类、保留、法定保留、AI 工具调用等。',
    'step.legalHold.title': '与法定保留的交叉',
    'step.legalHold.body': '当资源处于法定保留时，其审计事件也受到保护，免受导出和修改。这为诉讼保留证据。',
    'step.retention.title': '保留',
    'step.retention.body': '审计事件有自己的保留计划。在处置日期之前，即使是管理员也无法删除它们。',
    'step.liveTail.title': '实时跟踪',
    'step.liveTail.body': '如需实时监控，请使用实时跟踪。它会在事件发生时流式传输新事件——在调查期间很有用。',
    'step.snapshot.title': '完整性快照',
    'step.snapshot.body': '创建快照以捕获当前哈希链头。将其离站存储，以便即使 Smart EDMS 本身被入侵，也能检测到篡改。',
    'step.receipts.title': '哈希链收据',
    'step.receipts.body': '对于高价值操作，Smart EDMS 可以签发已签名的收据，将操作锚定到某个时间点。作为法律证据很有用。',
    'completion.title': '您可以信任审计日志',
    'completion.body': '您现在了解了 Smart EDMS 如何为每个操作保留诚实的记录。参加管理员导览以了解用户管理。',
    'completion.next': '参加管理员导览',
};
exports.default = audit;
//# sourceMappingURL=audit.js.map