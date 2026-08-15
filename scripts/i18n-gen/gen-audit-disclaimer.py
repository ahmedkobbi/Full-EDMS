#!/usr/bin/env python3
"""Add audit category/action and ai.disclaimer short translations for all locales."""
import json

LOCALES = {
    'fr': {}, 'ar': {}, 'ru': {}, 'zh-CN': {}, 'de': {},
}

# audit.categories (22 short labels)
LOCALES['fr'].update({
    "audit.category.authentication": "Authentification", "audit.category.authorization": "Autorisation",
    "audit.category.documentAccess": "Accès aux documents", "audit.category.documentModification": "Modification de document",
    "audit.category.documentDeletion": "Suppression de document", "audit.category.classification": "Classification",
    "audit.category.retention": "Conservation", "audit.category.legalHold": "Conservation légale",
    "audit.category.workflow": "Workflow", "audit.category.sharing": "Partage", "audit.category.metadata": "Métadonnées",
    "audit.category.userManagement": "Gestion des utilisateurs", "audit.category.roleManagement": "Gestion des rôles",
    "audit.category.tenantConfig": "Configuration du locataire", "audit.category.license": "Licence",
    "audit.category.aiAssistant": "Assistant IA", "audit.category.aiToolInvocation": "Invocation d'outil IA",
    "audit.category.scanner": "Scanner", "audit.category.digitization": "Numérisation",
    "audit.category.export": "Export", "audit.category.backup": "Sauvegarde", "audit.category.integrity": "Intégrité",
})
LOCALES['de'].update({
    "audit.category.authentication": "Authentifizierung", "audit.category.authorization": "Autorisierung",
    "audit.category.documentAccess": "Dokumentzugriff", "audit.category.documentModification": "Dokumentänderung",
    "audit.category.documentDeletion": "Dokumentlöschung", "audit.category.classification": "Klassifizierung",
    "audit.category.retention": "Aufbewahrung", "audit.category.legalHold": "Aufbewahrungspflicht",
    "audit.category.workflow": "Workflow", "audit.category.sharing": "Freigabe", "audit.category.metadata": "Metadaten",
    "audit.category.userManagement": "Benutzerverwaltung", "audit.category.roleManagement": "Rollenverwaltung",
    "audit.category.tenantConfig": "Mandantenkonfiguration", "audit.category.license": "Lizenz",
    "audit.category.aiAssistant": "KI-Assistent", "audit.category.aiToolInvocation": "KI-Werkzeugaufruf",
    "audit.category.scanner": "Scanner", "audit.category.digitization": "Digitalisierung",
    "audit.category.export": "Export", "audit.category.backup": "Backup", "audit.category.integrity": "Integrität",
})
LOCALES['ru'].update({
    "audit.category.authentication": "Аутентификация", "audit.category.authorization": "Авторизация",
    "audit.category.documentAccess": "Доступ к документам", "audit.category.documentModification": "Изменение документа",
    "audit.category.documentDeletion": "Удаление документа", "audit.category.classification": "Классификация",
    "audit.category.retention": "Хранение", "audit.category.legalHold": "Юридическое удержание",
    "audit.category.workflow": "Рабочий процесс", "audit.category.sharing": "Обмен", "audit.category.metadata": "Метаданные",
    "audit.category.userManagement": "Управление пользователями", "audit.category.roleManagement": "Управление ролями",
    "audit.category.tenantConfig": "Конфигурация арендатора", "audit.category.license": "Лицензия",
    "audit.category.aiAssistant": "ИИ-ассистент", "audit.category.aiToolInvocation": "Вызов ИИ-инструмента",
    "audit.category.scanner": "Сканер", "audit.category.digitization": "Оцифровка",
    "audit.category.export": "Экспорт", "audit.category.backup": "Резервное копирование", "audit.category.integrity": "Целостность",
})
LOCALES['zh-CN'].update({
    "audit.category.authentication": "身份验证", "audit.category.authorization": "授权",
    "audit.category.documentAccess": "文档访问", "audit.category.documentModification": "文档修改",
    "audit.category.documentDeletion": "文档删除", "audit.category.classification": "分类",
    "audit.category.retention": "保留", "audit.category.legalHold": "法律保留",
    "audit.category.workflow": "工作流", "audit.category.sharing": "共享", "audit.category.metadata": "元数据",
    "audit.category.userManagement": "用户管理", "audit.category.roleManagement": "角色管理",
    "audit.category.tenantConfig": "租户配置", "audit.category.license": "许可证",
    "audit.category.aiAssistant": "AI 助手", "audit.category.aiToolInvocation": "AI 工具调用",
    "audit.category.scanner": "扫描仪", "audit.category.digitization": "数字化",
    "audit.category.export": "导出", "audit.category.backup": "备份", "audit.category.integrity": "完整性",
})
LOCALES['ar'].update({
    "audit.category.authentication": "المصادقة", "audit.category.authorization": "التفويض",
    "audit.category.documentAccess": "الوصول إلى المستندات", "audit.category.documentModification": "تعديل المستند",
    "audit.category.documentDeletion": "حذف المستند", "audit.category.classification": "التصنيف",
    "audit.category.retention": "الاحتفاظ", "audit.category.legalHold": "الاحتجاز القانوني",
    "audit.category.workflow": "سير العمل", "audit.category.sharing": "المشاركة", "audit.category.metadata": "البيانات الوصفية",
    "audit.category.userManagement": "إدارة المستخدمين", "audit.category.roleManagement": "إدارة الأدوار",
    "audit.category.tenantConfig": "تكوين المستأجر", "audit.category.license": "الترخيص",
    "audit.category.aiAssistant": "مساعد الذكاء الاصطناعي", "audit.category.aiToolInvocation": "استدعاء أداة الذكاء الاصطناعي",
    "audit.category.scanner": "الماسح", "audit.category.digitization": "الرقمنة",
    "audit.category.export": "التصدير", "audit.category.backup": "النسخ الاحتياطي", "audit.category.integrity": "السلامة",
})

# audit.actorKinds (5)
for loc, vals in {
    'fr': {"audit.actorKind.user": "Utilisateur", "audit.actorKind.serviceAccount": "Compte de service", "audit.actorKind.system": "Système", "audit.actorKind.aiAssistant": "Assistant IA", "audit.actorKind.licenseServer": "Serveur de licences"},
    'de': {"audit.actorKind.user": "Benutzer", "audit.actorKind.serviceAccount": "Dienstkonto", "audit.actorKind.system": "System", "audit.actorKind.aiAssistant": "KI-Assistent", "audit.actorKind.licenseServer": "Lizenzserver"},
    'ru': {"audit.actorKind.user": "Пользователь", "audit.actorKind.serviceAccount": "Сервисный аккаунт", "audit.actorKind.system": "Система", "audit.actorKind.aiAssistant": "ИИ-ассистент", "audit.actorKind.licenseServer": "Сервер лицензий"},
    'zh-CN': {"audit.actorKind.user": "用户", "audit.actorKind.serviceAccount": "服务账户", "audit.actorKind.system": "系统", "audit.actorKind.aiAssistant": "AI 助手", "audit.actorKind.licenseServer": "许可证服务器"},
    'ar': {"audit.actorKind.user": "مستخدم", "audit.actorKind.serviceAccount": "حساب الخدمة", "audit.actorKind.system": "النظام", "audit.actorKind.aiAssistant": "مساعد الذكاء الاصطناعي", "audit.actorKind.licenseServer": "خادم التراخيص"},
}.items():
    LOCALES[loc].update(vals)

# audit.results (3)
for loc, vals in {
    'fr': {"audit.result.allow": "Autorisé", "audit.result.deny": "Refusé", "audit.result.error": "Erreur"},
    'de': {"audit.result.allow": "Erlaubt", "audit.result.deny": "Verweigert", "audit.result.error": "Fehler"},
    'ru': {"audit.result.allow": "Разрешено", "audit.result.deny": "Отказано", "audit.result.error": "Ошибка"},
    'zh-CN': {"audit.result.allow": "允许", "audit.result.deny": "拒绝", "audit.result.error": "错误"},
    'ar': {"audit.result.allow": "مسموح", "audit.result.deny": "مرفوض", "audit.result.error": "خطأ"},
}.items():
    LOCALES[loc].update(vals)

# ai.disclaimer short variants (18)
LOCALES['fr'].update({
    "ai.disclaimer.title": "Avertissements IA", "ai.disclaimer.subtitle": "Comment l'assistant IA reste sûr et fiable.",
    "ai.disclaimer.readOnlyDefault.short": "Lecture seule par défaut. Confirmation requise pour les modifications.",
    "ai.disclaimer.confirmationRequired.short": "Chaque modification nécessite votre confirmation.",
    "ai.disclaimer.notLegalAdvice.short": "Pas un conseil juridique. Consultez un avocat qualifié pour les décisions juridiques.",
    "ai.disclaimer.citationsLimitedToAccessible.short": "Les citations sont limitées aux documents auxquels vous avez accès.",
    "ai.disclaimer.toolAudited.short": "Chaque appel d'outil IA est audité.",
    "ai.disclaimer.promptInjectionProtected.short": "Protégé contre l'injection de prompt.",
    "ai.disclaimer.degradesGracefully.short": "Se dégrade normalement quand l'IA est indisponible.",
    "ai.disclaimer.mayContainErrors.short": "Peut contenir des erreurs. Vérifiez avant de vous y fier.",
    "ai.disclaimer.noPersonalDataToExternal.short": "Les données personnelles sont caviardées avant l'envoi aux fournisseurs IA externes.",
    "ai.disclaimer.humanReviewRequired.short": "Les suggestions IA pour la conformité sont consultatives. Approbation humaine requise.",
    "ai.disclaimer.notForHighStakes.short": "Pour les décisions à enjeux, traitez la sortie IA comme un brouillon.",
    "ai.disclaimer.modelCapabilities.short": "Les capacités dépendent du modèle.",
    "ai.disclaimer.contextLimits.short": "Le contexte est limité. Concentrez votre question pour de meilleurs résultats.",
    "ai.disclaimer.languageAccuracy.short": "Plus précis en anglais. Faites relire les traductions dans d'autres langues.",
    "ai.disclaimer.versionTransparency.short": "Le modèle et la version sont enregistrés avec chaque réponse.",
    "ai.disclaimer.noSelfModification.short": "L'IA ne peut pas modifier ses propres paramètres ou piste d'audit.",
    "ai.disclaimer.complianceOverride.short": "L'IA est soumise aux mêmes règles de conformité que les humains.",
    "ai.disclaimer.feedbackLoop.short": "Vos commentaires améliorent l'IA.",
    "ai.disclaimer.disclaimerBanner": "Les réponses générées par l'IA peuvent contenir des erreurs. Vérifiez auprès des sources citées. Pas un conseil juridique, médical ou financier.",
})
LOCALES['de'].update({
    "ai.disclaimer.title": "KI-Hinweise", "ai.disclaimer.subtitle": "Wie der KI-Assistent sicher und zuverlässig bleibt.",
    "ai.disclaimer.readOnlyDefault.short": "Standardmäßig schreibgeschützt. Bestätigung für Änderungen erforderlich.",
    "ai.disclaimer.confirmationRequired.short": "Jede Änderung erfordert Ihre Bestätigung.",
    "ai.disclaimer.notLegalAdvice.short": "Keine Rechtsberatung. Wenden Sie sich für Rechtsentscheidungen an einen qualifizierten Anwalt.",
    "ai.disclaimer.citationsLimitedToAccessible.short": "Zitate sind auf Dokumente beschränkt, auf die Sie Zugriff haben.",
    "ai.disclaimer.toolAudited.short": "Jeder KI-Werkzeugaufruf wird auditiert.",
    "ai.disclaimer.promptInjectionProtected.short": "Geschützt gegen Prompt-Injection.",
    "ai.disclaimer.degradesGracefully.short": "Degradiert ordnungsgemäss, wenn die KI nicht verfügbar ist.",
    "ai.disclaimer.mayContainErrors.short": "Kann Fehler enthalten. Verifizieren Sie vor der Nutzung.",
    "ai.disclaimer.noPersonalDataToExternal.short": "Personenbezogene Daten werden vor dem Senden an externe KI-Anbieter geschwärzt.",
    "ai.disclaimer.humanReviewRequired.short": "KI-Vorschläge für Compliance sind beratend. Menschliche Genehmigung erforderlich.",
    "ai.disclaimer.notForHighStakes.short": "Bei kritischen Entscheidungen behandeln Sie die KI-Ausgabe als Entwurf.",
    "ai.disclaimer.modelCapabilities.short": "Fähigkeiten hängen vom Modell ab.",
    "ai.disclaimer.contextLimits.short": "Kontext ist begrenzt. Fokussieren Sie Ihre Frage für beste Ergebnisse.",
    "ai.disclaimer.languageAccuracy.short": "Am genauesten auf Englisch. Lassen Sie Übersetzungen in anderen Sprachen prüfen.",
    "ai.disclaimer.versionTransparency.short": "Modell und Version werden mit jeder Antwort protokolliert.",
    "ai.disclaimer.noSelfModification.short": "Die KI kann ihre eigenen Einstellungen oder Audit-Spuren nicht ändern.",
    "ai.disclaimer.complianceOverride.short": "Die KI unterliegt denselben Compliance-Regeln wie Menschen.",
    "ai.disclaimer.feedbackLoop.short": "Ihr Feedback verbessert die KI.",
    "ai.disclaimer.disclaimerBanner": "KI-generierte Antworten können Fehler enthalten. Verifizieren Sie anhand der zitierten Quellen. Keine Rechts-, medizinische oder Finanzberatung.",
})
LOCALES['ru'].update({
    "ai.disclaimer.title": "Предупреждения ИИ", "ai.disclaimer.subtitle": "Как ИИ-ассистент остаётся безопасным и надёжным.",
    "ai.disclaimer.readOnlyDefault.short": "Только чтение по умолчанию. Для изменений требуется подтверждение.",
    "ai.disclaimer.confirmationRequired.short": "Каждое изменение требует вашего подтверждения.",
    "ai.disclaimer.notLegalAdvice.short": "Не юридическая консультация. Обратитесь к квалифицированному юристу.",
    "ai.disclaimer.citationsLimitedToAccessible.short": "Цитаты ограничены документами, к которым у вас есть доступ.",
    "ai.disclaimer.toolAudited.short": "Каждый вызов ИИ-инструмента аудитируется.",
    "ai.disclaimer.promptInjectionProtected.short": "Защищено от инъекции промпта.",
    "ai.disclaimer.degradesGracefully.short": "Плавно деградирует при недоступности ИИ.",
    "ai.disclaimer.mayContainErrors.short": "Может содержать ошибки. Проверяйте перед использованием.",
    "ai.disclaimer.noPersonalDataToExternal.short": "Персональные данные скрываются перед отправкой внешним ИИ-провайдерам.",
    "ai.disclaimer.humanReviewRequired.short": "Предложения ИИ для комплаенса консультативны. Требуется одобрение человеком.",
    "ai.disclaimer.notForHighStakes.short": "Для критических решений считайте вывод ИИ черновиком.",
    "ai.disclaimer.modelCapabilities.short": "Возможности зависят от модели.",
    "ai.disclaimer.contextLimits.short": "Контекст ограничен. Сфокусируйте вопрос для лучших результатов.",
    "ai.disclaimer.languageAccuracy.short": "Наиболее точен на английском. Проверяйте переводы на других языках.",
    "ai.disclaimer.versionTransparency.short": "Модель и версия записываются с каждым ответом.",
    "ai.disclaimer.noSelfModification.short": "ИИ не может изменять свои настройки или журнал аудита.",
    "ai.disclaimer.complianceOverride.short": "ИИ подчиняется тем же правилам комплаенса, что и люди.",
    "ai.disclaimer.feedbackLoop.short": "Ваш отзыв улучшает ИИ.",
    "ai.disclaimer.disclaimerBanner": "Ответы, сгенерированные ИИ, могут содержать ошибки. Проверяйте по цитируемым источникам. Не является юридической, медицинской или финансовой консультацией.",
})
LOCALES['zh-CN'].update({
    "ai.disclaimer.title": "AI 免责声明", "ai.disclaimer.subtitle": "AI 助手如何保持安全可靠。",
    "ai.disclaimer.readOnlyDefault.short": "默认只读。修改需要确认。",
    "ai.disclaimer.confirmationRequired.short": "每次修改都需要您的确认。",
    "ai.disclaimer.notLegalAdvice.short": "非法律建议。法律决策请咨询合格律师。",
    "ai.disclaimer.citationsLimitedToAccessible.short": "引用仅限于您可以访问的文档。",
    "ai.disclaimer.toolAudited.short": "每次 AI 工具调用都会被审计。",
    "ai.disclaimer.promptInjectionProtected.short": "受保护，防止提示注入。",
    "ai.disclaimer.degradesGracefully.short": "AI 不可用时优雅降级。",
    "ai.disclaimer.mayContainErrors.short": "可能包含错误。使用前请验证。",
    "ai.disclaimer.noPersonalDataToExternal.short": "发送给外部 AI 提供商之前会遮盖个人数据。",
    "ai.disclaimer.humanReviewRequired.short": "合规方面的 AI 建议仅供参考。需要人工批准。",
    "ai.disclaimer.notForHighStakes.short": "对于高风险决策，将 AI 输出视为草稿。",
    "ai.disclaimer.modelCapabilities.short": "能力取决于模型。",
    "ai.disclaimer.contextLimits.short": "上下文有限。聚焦问题以获得最佳结果。",
    "ai.disclaimer.languageAccuracy.short": "英语最准确。其他语言的翻译请人工审核。",
    "ai.disclaimer.versionTransparency.short": "每次回答都会记录模型和版本。",
    "ai.disclaimer.noSelfModification.short": "AI 不能修改自己的设置或审计跟踪。",
    "ai.disclaimer.complianceOverride.short": "AI 遵守与人类相同的合规规则。",
    "ai.disclaimer.feedbackLoop.short": "您的反馈有助于改进 AI。",
    "ai.disclaimer.disclaimerBanner": "AI 生成的回答可能包含错误。请根据引用的来源进行验证。非法律、医疗或财务建议。",
})
LOCALES['ar'].update({
    "ai.disclaimer.title": "إخلاء مسؤولية الذكاء الاصطناعي", "ai.disclaimer.subtitle": "كيف يبقى مساعد الذكاء الاصطناعي آمنًا وموثوقًا.",
    "ai.disclaimer.readOnlyDefault.short": "للقراءة فقط افتراضيًا. التأكيد مطلوب للتغييرات.",
    "ai.disclaimer.confirmationRequired.short": "كل تغيير يتطلب تأكيدك.",
    "ai.disclaimer.notLegalAdvice.short": "ليس استشارة قانونية. استشر محاميًا مؤهلًا للقرارات القانونية.",
    "ai.disclaimer.citationsLimitedToAccessible.short": "الاستشهادات محصورة بالمستندات التي يمكنك الوصول إليها.",
    "ai.disclaimer.toolAudited.short": "كل استدعاء أداة ذكاء اصطناعي يتم تدقيقه.",
    "ai.disclaimer.promptInjectionProtected.short": "محمي من حقن المطالبة.",
    "ai.disclaimer.degradesGracefully.short": "يتدهور بأمان عندما يكون الذكاء الاصطناعي غير متاح.",
    "ai.disclaimer.mayContainErrors.short": "قد يحتوي على أخطاء. تحقق قبل الاعتماد عليه.",
    "ai.disclaimer.noPersonalDataToExternal.short": "يتم طمس البيانات الشخصية قبل إرسالها إلى مزودي الذكاء الاصطناعي الخارجيين.",
    "ai.disclaimer.humanReviewRequired.short": "اقتراحات الذكاء الاصطناعي للامتثال استشارية. مطلوب موافقة بشرية.",
    "ai.disclaimer.notForHighStakes.short": "للقرارات عالية المخاطر، تعامل مع مخرجات الذكاء الاصطناعي كمسودة.",
    "ai.disclaimer.modelCapabilities.short": "تعتمد القدرات على النموذج.",
    "ai.disclaimer.contextLimits.short": "السياق محدود. ركز سؤالك للحصول على أفضل النتائج.",
    "ai.disclaimer.languageAccuracy.short": "الأكثر دقة بالإنجليزية. راجع الترجمات باللغات الأخرى.",
    "ai.disclaimer.versionTransparency.short": "يتم تسجيل النموذج والإصدار مع كل رد.",
    "ai.disclaimer.noSelfModification.short": "لا يمكن للذكاء الاصطناعي تعديل إعداداته أو مسار التدقيق الخاص به.",
    "ai.disclaimer.complianceOverride.short": "يخضع الذكاء الاصطناعي لنفس قواعد الامتثال كبالإنسان.",
    "ai.disclaimer.feedbackLoop.short": "ملاحظاتك تحسن الذكاء الاصطناعي.",
    "ai.disclaimer.disclaimerBanner": "الردود المولدة بالذكاء الاصطناعي قد تحتوي على أخطاء. تحقق من المصادر المقتبسة. ليست استشارة قانونية أو طبية أو مالية.",
})

# Merge with existing translations and write
for loc, new_translations in LOCALES.items():
    path = f'/home/z/my-project/full-edms/scripts/i18n-gen/{loc}-critical.json'
    existing = {}
    try:
        with open(path, 'r') as f:
            existing = json.load(f)
    except FileNotFoundError:
        pass
    existing.update(new_translations)
    with open(path, 'w') as f:
        json.dump(existing, f, indent=2, ensure_ascii=False)
    print(f"{loc}: {len(existing)} total translations")
