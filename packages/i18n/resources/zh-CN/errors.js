"use strict";
/**
 * @smart-edms/i18n — zh-CN translation: `errors` namespace.
 *
 * Source of truth: en/errors.ts
 * Translated from the English baseline.
 *
 * REVIEW: This namespace contains compliance-relevant content.
 * Translations should be reviewed by a native speaker before production rollout.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const errors = {
    UNAUTHENTICATED: '您需要登录才能继续。',
    UNAUTHORIZED: '您无权执行此操作。',
    FORBIDDEN: '访问被拒绝。您没有权限访问此资源。',
    NOT_FOUND: '未找到请求的资源。',
    VALIDATION_FAILED: '某些字段包含无效值。请检查后重试。',
    RATE_LIMITED: '请求过多。请稍候，在 {seconds, plural, other {# 秒}}后重试。',
    CONFLICT: '此操作与资源的当前状态冲突。请刷新后重试。',
    LICENSE_INVALID: '此组织的许可证无效。请联系您的管理员。',
    LICENSE_EXPIRED: '此组织的许可证已过期。请联系您的管理员续订。',
    LICENSE_REVOKED: '此组织的许可证已被吊销。请联系您的管理员。',
    LICENSE_GRACE_EXHAUSTED: '过期许可证的宽限期已结束。请联系您的管理员恢复访问。',
    LICENSE_FEATURE_NOT_ENTITLED: '此功能未包含在您当前的许可计划中。',
    TENANT_MISMATCH: '该资源不属于您的组织。',
    AI_NOT_LICENSED: 'AI 助手功能未包含在您当前的许可计划中。',
    AI_TOOL_FORBIDDEN: '您没有权限使用此 AI 工具。',
    AI_ACTION_REQUIRES_CONFIRMATION: '此 AI 操作需要您确认后才能应用。',
    PROMPT_INJECTION_DETECTED: '在您的输入中检测到潜在的提示注入。请求已因安全原因被阻止。',
    EXTERNAL_AI_DISABLED: '您的组织已禁用外部 AI 提供商。请联系您的管理员。',
    WORKFLOW_NOT_DURABLE: '此工作流未配置为持久执行，无法启动。',
    WORKFLOW_INVALID_STATE: '工作流处于不允许此操作的状态。',
    LEGAL_HOLD_BLOCKS_DELETION: '此文档处于法律保留状态，无法删除。',
    LEGAL_HOLD_BLOCKS_ACTION: '此操作被阻止，因为资源处于法律保留状态。',
    RETENTION_BLOCKS_DELETION: '此文档受保留计划约束，暂无法删除。',
    RETENTION_BLOCKS_ACTION: '此操作被阻止，因为资源受活动的保留计划约束。',
    CLASSIFICATION_DOWNGRADE_DENIED: '策略不允许降低分类级别。',
    UPLOAD_TOO_LARGE: '上传的文件超过了最大允许大小 {{max}}。',
    UNSAFE_FILE_TYPE: '不允许上传此文件类型。',
    UNSAFE_FILE_CONTENT: '上传的文件被安全扫描程序拒绝。',
    SHARE_EXPIRED: '此共享链接已过期。',
    SHARE_REVOKED: '此共享链接已被吊销。',
    SHARE_BLOCKED_BY_POLICY: '您的组织策略不允许在外部共享此文档。',
    SHARE_BLOCKED_BY_CLASSIFICATION: '此分类级别的文档不能在外部共享。',
    INTERNAL_ERROR: '发生内部错误。请重试。如果问题持续存在，请使用追踪 ID {{traceId}} 联系支持。',
    SERVICE_UNAVAILABLE: '此服务暂时不可用。请稍后重试。',
    MAINTENANCE_MODE: 'Smart EDMS 正在计划维护中。请稍后重试。',
    NETWORK_ERROR: '发生网络错误。请检查您的连接并重试。',
    TIMEOUT: '请求超时。请重试。',
    QUOTA_EXCEEDED: '您已超出存储配额。请删除未使用的文档或联系您的管理员增加限额。',
    USER_LIMIT_EXCEEDED: '您已达到许可计划的用户限制。',
    CONCURRENT_SESSION_LIMIT: '您已达到最大并发会话数。',
    TOUR_NOT_FOUND: '未找到请求的引导教程。',
    TOUR_NOT_LICENSED: '此引导教程未包含在您当前的许可计划中。',
    UNKNOWN: '发生意外错误。',
};
exports.default = errors;
//# sourceMappingURL=errors.js.map