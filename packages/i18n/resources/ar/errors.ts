/**
 * @smart-edms/i18n — ar translation: `errors` namespace.
 *
 * Source of truth: en/errors.ts
 * Translated from the English baseline.
 *
 * REVIEW: This namespace contains compliance-relevant content.
 * Translations should be reviewed by a native speaker before production rollout.
 */

const errors = {
  UNAUTHENTICATED: 'تحتاج إلى تسجيل الدخول للمتابعة.',
  UNAUTHORIZED: 'غير مصرح لك بتنفيذ هذا الإجراء.',
  FORBIDDEN: 'تم رفض الوصول. ليس لديك صلاحية الوصول إلى هذا المورد.',
  NOT_FOUND: 'لم يتم العثور على المورد المطلوب.',
  VALIDATION_FAILED: 'تحتوي بعض الحقول على قيم غير صالحة. يرجى المراجعة وإعادة المحاولة.',
  RATE_LIMITED: 'طلبات كثيرة جدًا. يرجى الإبطاء والمحاولة مرة أخرى خلال {seconds, plural, one {# ثانية} few {# ثوانٍ} many {# ثانيةً} other {# ثانية}}.',
  CONFLICT: 'يتعارض هذا الإجراء مع الحالة الحالية للمورد. يرجى التحديث وإعادة المحاولة.',
  LICENSE_INVALID: 'ترخيص هذه المؤسسة غير صالح. يرجى الاتصال بمسؤول النظام لديك.',
  LICENSE_EXPIRED: 'انتهت صلاحية ترخيص هذه المؤسسة. يرجى الاتصال بمسؤول النظام لديك للتجديد.',
  LICENSE_REVOKED: 'تم إلغاء ترخيص هذه المؤسسة. يرجى الاتصال بمسؤول النظام لديك.',
  LICENSE_GRACE_EXHAUSTED: 'انتهت فترة السماح للترخيص المنتهي. يرجى الاتصال بمسؤول النظام لديك لاستعادة الوصول.',
  LICENSE_FEATURE_NOT_ENTITLED: 'هذه الميزة غير مشمولة في خطة الترخيص الحالية لديك.',
  TENANT_MISMATCH: 'المورد لا ينتمي إلى مؤسستك.',
  AI_NOT_LICENSED: 'ميزات مساعد الذكاء الاصطناعي غير مشمولة في خطة الترخيص الحالية لديك.',
  AI_TOOL_FORBIDDEN: 'ليس لديك صلاحية استخدام أداة الذكاء الاصطناعي هذه.',
  AI_ACTION_REQUIRES_CONFIRMATION: 'يتطلب إجراء الذكاء الاصطناعي هذا تأكيدك قبل تطبيقه.',
  PROMPT_INJECTION_DETECTED: 'تم اكتشاف حقن مطالبة محتمل في إدخالك. تم حظر الطلب لأسباب أمنية.',
  EXTERNAL_AI_DISABLED: 'موفرو الذكاء الاصطناعي الخارجيون معطّلون لمؤسستك. يرجى الاتصال بمسؤول النظام لديك.',
  WORKFLOW_NOT_DURABLE: 'لم يتم تكوين سير العمل هذا للتنفيذ المستمر ولا يمكن بدئه.',
  WORKFLOW_INVALID_STATE: 'سير العمل ليس في حالة تسمح بهذا الإجراء.',
  LEGAL_HOLD_BLOCKS_DELETION: 'هذا المستند خاضع لاحتجاز قانوني ولا يمكن حذفه.',
  LEGAL_HOLD_BLOCKS_ACTION: 'تم حظر هذا الإجراء لأن المورد خاضع لاحتجاز قانوني.',
  RETENTION_BLOCKS_DELETION: 'هذا المستند خاضع لجدول احتفاظ ولا يمكن حذفه بعد.',
  RETENTION_BLOCKS_ACTION: 'تم حظر هذا الإجراء لأن المورد خاضع لجدول احتفاظ نشط.',
  CLASSIFICATION_DOWNGRADE_DENIED: 'لا يسمح بالتنزيل إلى مستوى تصنيف أدنى بموجب السياسة.',
  UPLOAD_TOO_LARGE: 'الملف المرفوع يتجاوز الحد الأقصى المسموح به وهو {{max}}.',
  UNSAFE_FILE_TYPE: 'نوع الملف المرفوع غير مسموح به.',
  UNSAFE_FILE_CONTENT: 'تم رفض الملف المرفوع من قبل ماسح الأمان.',
  SHARE_EXPIRED: 'انتهت صلاحية رابط المشاركة هذا.',
  SHARE_REVOKED: 'تم إلغاء رابط المشاركة هذا.',
  SHARE_BLOCKED_BY_POLICY: 'سياسة مؤسستك لا تسمح بمشاركة هذا المستند خارجيًا.',
  SHARE_BLOCKED_BY_CLASSIFICATION: 'لا يمكن مشاركة المستندات بهذا المستوى من التصنيف خارجيًا.',
  INTERNAL_ERROR: 'حدث خطأ داخلي. يرجى المحاولة مرة أخرى. إذا استمرت المشكلة، اتصل بالدعم مع معرف التتبع {{traceId}}.',
  SERVICE_UNAVAILABLE: 'هذه الخدمة غير متاحة مؤقتًا. يرجى المحاولة مرة أخرى بعد لحظات.',
  MAINTENANCE_MODE: 'Smart EDMS يخضع للصيانة المجدولة. يرجى المحاولة لاحقًا.',
  NETWORK_ERROR: 'حدث خطأ في الشبكة. يرجى التحقق من اتصالك والمحاولة مرة أخرى.',
  TIMEOUT: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.',
  QUOTA_EXCEEDED: 'لقد تجاوزت حصة التخزين الخاصة بك. يرجى حذف المستندات غير المستخدمة أو الاتصال بمسؤول النظام لزيادة الحد.',
  USER_LIMIT_EXCEEDED: 'لقد وصلت إلى حد المستخدمين في خطة الترخيص الخاصة بك.',
  CONCURRENT_SESSION_LIMIT: 'لقد وصلت إلى الحد الأقصى لعدد الجلسات المتزامنة.',
  TOUR_NOT_FOUND: 'تعذر العثور على الجولة المطلوبة.',
  TOUR_NOT_LICENSED: 'هذه الجولة غير مشمولة في خطة الترخيص الحالية لديك.',
  UNKNOWN: 'حدث خطأ غير متوقع.',
} as const;

export default errors;
