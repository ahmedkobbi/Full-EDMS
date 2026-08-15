"use strict";
/**
 * @smart-edms/i18n — zh-CN translation: `ai.disclaimer` namespace.
 *
 * Source of truth: en/ai/disclaimer.ts
 * Translated from the English baseline.
 *
 * REVIEW: native speaker needed
 * This namespace contains compliance-relevant content (AI safety, legal
 * disclaimers). Translations should be reviewed by a native Chinese-speaking
 * AI safety / compliance specialist before production rollout.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const disclaimer = {
    title: 'AI 免责声明',
    subtitle: 'AI 助手如何保持安全可信。',
    readOnlyDefault: 'AI 助手默认为只读模式。它可以读取您有权访问的文档并回答问题，但未经您的明确确认，不能修改任何内容。',
    'readOnlyDefault.short': '默认只读。修改需要确认。',
    confirmationRequired: '每一项会修改文档、元数据、工作流或设置的 AI 操作都需要您的明确确认。在发生任何变化之前，您可以确切看到 AI 拟执行的操作。',
    'confirmationRequired.short': '每次修改都需要您的确认。',
    notLegalAdvice: 'AI 助手可以概括法律文档，但不能提供法律意见。对于法律决策，请咨询执业律师。AI 生成的法律文本摘要是草稿，不是法律意见。',
    'notLegalAdvice.short': '非法律意见。法律决策请咨询执业律师。',
    citationsLimitedToAccessible: 'AI 的每项主张都有具体文档引用作为依据。AI 只能引用您有权访问的文档——不能使用您无法访问的文档来支持其回答。',
    'citationsLimitedToAccessible.short': '引用仅限于您能访问的文档。',
    toolAudited: '每次 AI 工具调用都会被记录在防篡改的审计日志中。提示词、回复、访问的文档以及触发调用的用户都会被保留，以供合规审查。',
    'toolAudited.short': '每次 AI 工具调用都会被审计。',
    promptInjectionProtected: 'AI 助手受到提示词注入防护——防止通过在文档内容中嵌入指令来操纵 AI 的企图。检测到的注入会被阻止并报告。',
    'promptInjectionProtected.short': '已防护提示词注入。',
    degradesGracefully: '当 AI 助手不可用时——提供商宕机、许可限制、网络问题——Smart EDMS 继续正常运行。您只是暂时失去 AI 功能；文档和工作流继续工作。',
    'degradesGracefully.short': 'AI 不可用时优雅降级。',
    mayContainErrors: 'AI 生成的回复可能包含错误。在依赖重要细节之前，请对照引用的来源进行核对。',
    'mayContainErrors.short': '可能包含错误。依赖前请核对。',
    noPersonalDataToExternal: '使用外部 AI 提供商时，Smart EDMS 会尽量减少发送的数据。在可能的情况下对个人身份信息进行脱敏。对于敏感文档，请使用本地或混合模型。',
    'noPersonalDataToExternal.short': '个人身份信息在发送给外部 AI 提供商之前会被脱敏。',
    humanReviewRequired: 'AI 对分类、保留和法定保留的建议仅供参考。每一项此类决定必须由人工用户批准。',
    'humanReviewRequired.short': 'AI 合规建议仅供参考。需要人工批准。',
    notForHighStakes: '对于高风险决策——法律、医疗、财务——请将 AI 输出视为草稿，而非最终结论。请始终咨询合格的专业人员。',
    'notForHighStakes.short': '对于高风险决策，请将 AI 输出视为草稿。',
    modelCapabilities: 'AI 能力取决于所使用的模型。较大的模型能力更强，但速度更慢、成本更高。在混合模式下，Smart EDMS 会为每项任务选择合适的模型。',
    'modelCapabilities.short': '能力取决于模型。',
    contextLimits: 'AI 一次只能处理有限的上下文。对于很长的文档，它可能会遗漏开头或结尾附近的细节。提供聚焦的上下文可获得最佳结果。',
    'contextLimits.short': '上下文有限。聚焦问题以获得最佳结果。',
    languageAccuracy: 'AI 在英语中最为准确。其他语言的翻译和摘要可能包含错误。请让母语人士审查合规关键内容。',
    'languageAccuracy.short': '英语中最为准确。其他语言的翻译请进行审查。',
    versionTransparency: '每次回复都会记录 AI 模型和版本，以便您核实哪个模型产生了给定答案。',
    'versionTransparency.short': '模型和版本随每次回复记录。',
    noSelfModification: 'AI 不能修改自身的配置、许可证或审计日志。这些由独立的身份验证和授权保护。',
    'noSelfModification.short': 'AI 不能修改自身设置或审计日志。',
    complianceOverride: 'AI 操作受到与人工操作相同的合规规则约束。保留计划、法定保留和分类政策同等适用。',
    'complianceOverride.short': 'AI 受到与人工相同的合规规则约束。',
    feedbackLoop: '您的反馈有助于改进 AI。在每个回复上使用"有用 / 无用"按钮来指导未来的改进。',
    'feedbackLoop.short': '您的反馈改进 AI。',
    disclaimerBanner: 'AI 生成的回复可能包含错误。请对照引用的来源核对。非法律、医疗或财务建议。',
};
exports.default = disclaimer;
//# sourceMappingURL=disclaimer.js.map