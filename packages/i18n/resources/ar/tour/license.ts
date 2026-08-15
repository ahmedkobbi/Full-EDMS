/**
 * @smart-edms/i18n — ar translation: `tour.license` namespace.
 *
 * Source of truth: en/tour/license.ts
 * Translated from the English baseline.
 *
 * REVIEW: native speaker needed
 * This namespace contains compliance-relevant content (license states, grace
 * periods, remediation). Translations should be reviewed by a native
 * Arabic-speaking licensing / compliance specialist before production rollout.
 */

const license = {
  title: 'جولة الترخيص',
  subtitle: 'فهم حالة ترخيصك وما تعنيه كل حالة.',

  'step.intro.title': 'ترخيصك، مشروح ببساطة',
  'step.intro.body': 'يستخدم Smart EDMS نموذج ترخيص هادئ وقابل للتنبؤ. تأخذك هذه الجولة عبر كل حالة لتعرف ما يجب توقعه — وما لا داعي للقلق بشأنه.',

  'step.overview.title': 'نظرة عامة على الترخيص',
  'step.overview.body': 'من صفحة الترخيص يمكنك رؤية حالتك الحالية، ومتى تنتهي صلاحية ترخيصك، وكم عدد المستخدمين ومقدار التخزين الذي استخدمته، والوحدات الممكّنة.',

  'step.state.valid.title': 'الحالة 1: نشط',
  'step.state.valid.body': 'عندما يكون ترخيصك نشطًا، يعمل كل شيء كما هو متوقع. جميع الميزات التي رخصتها متاحة. هذه هي الحالة الطبيعية اليومية.',

  'step.state.expiringSoon.title': 'الحالة 2: التجديد قريبًا',
  'step.state.expiringSoon.body': 'قبل أسابيع قليلة من انتهاء صلاحية ترخيصك، سترى تذكيرًا لطيفًا. لا شيء يتغير — كل شيء يستمر في العمل. هذا مجرد تذكير ودود للتجديد عندما يكون مناسبًا.',

  'step.state.expiredGrace.title': 'الحالة 3: التجديد قيد التنفيذ',
  'step.state.expiredGrace.body': 'إذا انتهت صلاحية ترخيصك قبل إكمال التجديد، تدخل فترة سماح. يستمر النظام في العمل بالكامل. بياناتك آمنة. جدّد متى شئت.',

  'step.state.graceExhausted.title': 'الحالة 4: التجديد مطلوب',
  'step.state.graceExhausted.body': 'إذا انتهت فترة السماح دون تجديد، يتم إيقاف وصول الكتابة مؤقتًا. يمكنك قراءة المستندات وتصدير البيانات — لا يمكنك فقط إضافة أو تغيير أي شيء. جدّد لاستعادة الوصول الكامل.',

  'step.state.extendedRemediation.title': 'الحالة 5: المعالجة قيد التنفيذ',
  'step.state.extendedRemediation.body': 'في حالات نادرة — على سبيل المثال، نزاع فوترة أو مشكلة اتصال مطولة — يدخل ترخيصك مرحلة معالجة ممتدة. يعمل النظام في حالة متدهورة. اتصل بالدعم لحل الموقف.',

  'step.state.invalid.title': 'الحالة 6: الترخيص غير نشط',
  'step.state.invalid.body': 'إذا تم إبطال الترخيص أو لم يُفعّل قط، فالنظام غير نشط. اتصل بمسؤولك لاستعادة الوصول. تبقى بياناتك سليمة.',

  'step.heartbeat.title': 'نموذج نبض القلب',
  'step.heartbeat.body': 'يتحقق Smart EDMS دوريًا من خادم الترخيص. إذا لم يتمكن من الوصول إلى الخادم — على سبيل المثال، أنت غير متصل — يستمر النظام في العمل بشكل طبيعي. لا تمنع إخفاقات النبض الوصول أبدًا.',

  'step.offline.title': 'العمل دون اتصال',
  'step.offline.body': 'صُمم Smart EDMS للعمل دون اتصال. يمكنك العمل دون الاتصال بخادم الترخيص لأسابيع في كل مرة. عند عودة الاتصال، يستأنف النبض تلقائيًا.',

  'step.renew.title': 'كيفية التجديد',
  'step.renew.body': 'يستغرق التجديد نقرة واحدة. يمكنك التجديد عبر الإنترنت بطريقة دفع، أو استيراد ملف ترخيص .sedmslic تلقيته من مدير حسابك.',

  'step.import.title': 'استيراد ملف ترخيص',
  'step.import.body': 'ملف .sedmslic هو ملف ترخيص موقّع. استورده من صفحة الترخيص لتفعيل ترخيصك أو تمديده. يتم التحقق من الملف مقابل معرّف مؤسستك.',

  'step.export.title': 'تصدير ملف طلب',
  'step.export.body': 'للتثبيتات المعزولة عن الشبكة، أنشئ ملف طلب .sedmsreq. أرسله إلى مدير حسابك، الذي سيعيد ملف .sedmslic.',

  'step.noAlarm.title': 'لا مفاجآت ولا إنذارات',
  'step.noAlarm.body': 'لا يقوم Smart EDMS أبدًا بقفلك دون تحذير. يتم الإعلان عن كل انتقال حالة مسبقًا، وبياناتك دائمًا آمنة.',

  'step.adminRole.title': 'من يرى ماذا',
  'step.adminRole.body': 'حالة الترخيص مرئية للمسؤولين. يرى المستخدمون العاديون لافتة صغيرة قابلة للإغلاق فقط عند حلول موعد التجديد — لا يتم إزعاجهم أبدًا.',

  'step.dataSafety.title': 'بياناتك آمنة',
  'step.dataSafety.body': 'لا تحذف أي حالة ترخيص مستنداتك أبدًا. حتى لو تم إبطال الترخيص، تبقى بياناتك سليمة وقابلة للتصدير.',

  'completion.title': 'أنت تفهم نموذج الترخيص',
  'completion.body': 'أنت الآن تعرف ما تعنيه كل حالة ترخيص وكيفية التجديد. خذ جولة الماسح الضوئي للتعرّف على رقمنة الورق.',
  'completion.next': 'خذ جولة الماسح الضوئي',

  'checklist.title': 'قائمة مراجعة جولة الترخيص',
  'checklist.item.viewStatus': 'اعرض حالة ترخيصك الحالية',
  'checklist.item.checkExpiry': 'تحقق من تاريخ الانتهاء',
  'checklist.item.identifyRenewal': 'حدد زر التجديد',
  'checklist.item.findImport': 'اعثر على خيار استيراد .sedmslic',
  'checklist.item.findExport': 'اعثر على خيار تصدير .sedmsreq',
} as const;

export default license;
