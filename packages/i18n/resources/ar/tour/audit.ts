/**
 * @smart-edms/i18n — ar translation: `tour.audit` namespace.
 *
 * Source of truth: en/tour/audit.ts
 * Translated from the English baseline.
 *
 * REVIEW: native speaker needed
 * This namespace contains compliance-relevant content (audit, integrity,
 * legal hold). Translations should be reviewed by a native Arabic-speaking
 * compliance specialist before production rollout.
 */

const audit = {
  title: 'جولة التدقيق',
  subtitle: 'فهم السجل المقاوم للتلاعب لكل إجراء.',

  'step.intro.title': 'سجل التدقيق',
  'step.intro.body': 'كل إجراء في Smart EDMS — تسجيل الدخول، عرض المستند، الموافقة على سير العمل، التعليق القانوني — يُسجل في سجل تدقيق يمكنك الوثوق به.',

  'step.tamperEvident.title': 'مقاوم للتلاعب',
  'step.tamperEvident.body': 'يحتوي كل حدث تدقيق على تجزئة للحدث السابق، مما يشكل سلسلة. إذا قام أي شخص بتعديل حدث قديم، تنكسر السلسلة ويمكننا اكتشاف ذلك.',

  'step.integrity.title': 'التحقق من السلامة',
  'step.integrity.body': 'انقر على «التحقق من السلامة» للسير عبر سلسلة التجزئة والتأكد من عدم العبث بأي حدث. النتيجة نفسها خاضعة للتدقيق.',

  'step.filters.title': 'التصفية والبحث',
  'step.filters.body': 'صفِّ حسب الفاعل أو الإجراء أو الفئة أو المورد أو النطاق الزمني أو النتيجة. احفظ الاستعلامات المتكررة لتقارير الامتثال.',

  'step.export.title': 'التصدير',
  'step.export.body': 'صدِّر سجل التدقيق بصيغة CSV أو JSON أو PDF موقع. يتضمن ملف PDF رأس سلسلة التجزئة حتى يمكن التحقق من التصدير لاحقًا.',

  'step.actorKinds.title': 'أنواع الفاعلين',
  'step.actorKinds.body': 'تُنسب الإجراءات إلى المستخدمين أو حسابات الخدمة أو النظام نفسه أو مساعد الذكاء الاصطناعي أو خادم الترخيص. اعرف دائمًا من (أو ماذا) فعل ماذا.',

  'step.categories.title': 'الفئات',
  'step.categories.body': 'تُجمَّع الأحداث في 22 فئة — المصادقة، الوصول إلى المستندات، التصنيف، الاستبقاء، التعليق القانوني، استدعاء أدوات الذكاء الاصطناعي، والمزيد.',

  'step.legalHold.title': 'تقاطع التعليق القانوني',
  'step.legalHold.body': 'عندما يكون المورد خاضعًا للتعليق القانوني، فإن أحداث تدقيقه محمية أيضًا من التصدير والتعديل. هذا يحافظ على الأدلة للتقاضي.',

  'step.retention.title': 'الاستبقاء',
  'step.retention.body': 'لأحداث التدقيق جدول استبقاء خاص بها. لا يمكن حذفها قبل تاريخ التصرف فيها، حتى من قبل المسؤول.',

  'step.liveTail.title': 'الذيل المباشر',
  'step.liveTail.body': 'للمراقبة في الوقت الفعلي، استخدم الذيل المباشر. يبث الأحداث الجديدة عند حدوثها — مفيد أثناء التحقيقات.',

  'step.snapshot.title': 'لقطات السلامة',
  'step.snapshot.body': 'أنشئ لقطة لالتقاط رأس سلسلة التجزئة الحالي. خزِّنها خارج الموقع لتتمكن من اكتشاف العبث حتى لو تم اختراق Smart EDMS نفسه.',

  'step.receipts.title': 'إيصالات سلسلة التجزئة',
  'step.receipts.body': 'للإجراءات عالية القيمة، يمكن لـ Smart EDMS إصدار إيصال موقّع يربط الإجراء بنقطة زمنية. مفيد كدليل قانوني.',

  'completion.title': 'يمكنك الوثوق بسجل التدقيق',
  'completion.body': 'أنت الآن تفهم كيف يحتفظ Smart EDMS بسجل صادق لكل إجراء. خذ جولة المسؤول للتعرّف على إدارة المستخدمين.',
  'completion.next': 'خذ جولة المسؤول',
} as const;

export default audit;
