"use strict";
/**
 * @smart-edms/i18n — zh-CN translation: `ai.errors` namespace.
 *
 * Source of truth: en/ai/errors.ts
 * Translated from the English baseline.
 *
 * REVIEW: native speaker needed
 * This namespace contains AI-safety-relevant strings. Translations should be
 * reviewed by a native Chinese-speaking AI safety specialist before production
 * rollout.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const errors = {
    unavailable: 'AI 助手不可用。请稍后重试。',
    'unavailable.long': 'AI 助手不可用。可能是临时故障。您可以继续使用 Smart EDMS，但不包含 AI 功能。',
    notLicensed: '您当前的许可证计划不包含 AI 助手功能。请联系管理员升级。',
    notEnabled: '您的组织未启用 AI 助手。请联系管理员。',
    toolForbidden: '您没有权限使用此 AI 工具。',
    toolDisabled: '此 AI 工具已被管理员禁用。',
    toolNotFound: '找不到请求的 AI 工具。',
    toolFailed: 'AI 工具未能完成。请重试。',
    toolTimeout: 'AI 工具响应时间过长。请重试或重新表述您的请求。',
    rateLimited: '您已达到 AI 速率限制。请在 {seconds, plural, other {# 秒}}后重试。',
    quotaExceeded: '您已用完每日 AI 配额。请明天再试。',
    'quotaExceeded.tokens': '您今天已使用 {{used}} / {{limit}} 个令牌。',
    contextTooLarge: '您提供的上下文过大。请尝试选择文档的较小部分。',
    'contextTooLarge.details': '上下文为 {{actual}} 个令牌，但模型最多接受 {{max}} 个令牌。',
    promptEmpty: '请输入 AI 的问题或指令。',
    promptTooLong: '您的消息过长。请缩短。',
    promptInjectionDetected: '在您的输入中检测到潜在的提示词注入。请求已因安全原因被阻止。',
    'promptInjectionDetected.details': '系统检测到输入中嵌入的指令，似乎是试图操纵 AI 的尝试。如果这是误报，请重新表述您的输入并重试。',
    'promptInjectionDetected.document': '您附上的文档似乎包含提示词注入。请求已被阻止。请手动审查文档。',
    sensitiveContent: 'AI 拒绝处理此请求，因为它似乎涉及敏感内容。',
    externalDisabled: '您的组织已禁用外部 AI 提供商。请使用本地模型或联系管理员。',
    externalUnavailable: '外部 AI 提供商不可用。请稍后重试。',
    externalError: '外部 AI 提供商返回了错误。请重试。',
    localUnavailable: '本地 AI 模型不可用。请稍后重试或切换到外部模型。',
    localError: '本地 AI 模型遇到错误。请重试。',
    modelNotFound: '找不到选定的 AI 模型。',
    modelDeprecated: '选定的 AI 模型已被弃用。请选择其他模型。',
    modelOverloaded: '选定的 AI 模型当前过载。请稍后重试或选择其他模型。',
    invalidResponse: 'AI 返回了无效响应。请重试或重新表述您的请求。',
    noCitations: 'AI 找不到任何文档来为此回复提供引用。回复可能不可靠。',
    citationBlocked: 'AI 尝试引用您无权访问的文档。引用已被删除。',
    actionRequiresConfirmation: '此 AI 操作在应用前需要您的确认。',
    actionBlocked: '此 AI 操作已被策略阻止。',
    'actionBlocked.legalHold': '此 AI 操作被阻止，因为文档处于法定保留状态。',
    'actionBlocked.retention': '此 AI 操作被阻止，因为文档处于活动的保留计划下。',
    'actionBlocked.classification': '此 AI 操作因文档的分类级别而被阻止。',
    actionFailed: 'AI 操作应用失败。请重试或手动应用更改。',
    sessionExpired: '您的 AI 会话已过期。请启动新会话。',
    sessionNotFound: '找不到 AI 会话。可能已被删除。',
    feedbackFailed: '无法提交您的反馈。请重试。',
    unknown: '处理您的 AI 请求时发生意外错误。请重试。',
    'safety.title': 'AI 安全',
    'safety.disclaimer': 'Smart EDMS 的 AI 安全防护已启用。AI 不能：',
    'safety.disclaimer.bullet1': '在未经您明确确认的情况下修改任何文档。',
    'safety.disclaimer.bullet2': '引用您无权访问的文档。',
    'safety.disclaimer.bullet3': '执行嵌入在文档中的提示词注入。',
    'safety.disclaimer.bullet4': '绕过您组织的保留、法定保留或分类政策。',
    'safety.disclaimer.bullet5': '提供法律、医疗或财务建议。',
    'safety.report': '报告 AI 安全问题',
    'safety.report.placeholder': '描述发生的情况',
    'safety.report.success': '谢谢。您的报告已记录，将由 AI 安全专家审查。',
};
exports.default = errors;
//# sourceMappingURL=errors.js.map