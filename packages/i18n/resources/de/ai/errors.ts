/**
 * @smart-edms/i18n — de translation: `ai.errors` namespace.
 *
 * Source of truth: en/ai/errors.ts
 * Translated from the English baseline.
 *
 * REVIEW: native speaker needed
 * This namespace contains AI-safety-relevant strings. Translations should be
 * reviewed by a native German-speaking AI safety specialist before production
 * rollout.
 */

const errors = {
  unavailable: 'Der KI-Assistent ist nicht verfügbar. Bitte versuchen Sie es später erneut.',
  'unavailable.long': 'Der KI-Assistent ist nicht verfügbar. Möglicherweise liegt ein temporärer Ausfall vor. Sie können Smart EDMS ohne KI-Funktionen weiterhin verwenden.',
  notLicensed: 'Funktionen des KI-Assistenten sind in Ihrem aktuellen Lizenzplan nicht enthalten. Wenden Sie sich an Ihren Administrator für ein Upgrade.',
  notEnabled: 'Der KI-Assistent ist für Ihre Organisation nicht aktiviert. Wenden Sie sich an Ihren Administrator.',
  toolForbidden: 'Sie haben keine Berechtigung, dieses KI-Werkzeug zu verwenden.',
  toolDisabled: 'Dieses KI-Werkzeug wurde von Ihrem Administrator deaktiviert.',
  toolNotFound: 'Das angeforderte KI-Werkzeug konnte nicht gefunden werden.',
  toolFailed: 'Das KI-Werkzeug konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.',
  toolTimeout: 'Das KI-Werkzeug hat zu lange gebraucht, um zu antworten. Bitte versuchen Sie es erneut oder formulieren Sie Ihre Anfrage um.',
  rateLimited: 'Sie haben das KI-Ratenlimit erreicht. Bitte warten Sie {seconds, plural, one {# Sekunde} other {# Sekunden}} vor einem erneuten Versuch.',
  quotaExceeded: 'Sie haben Ihr tägliches KI-Kontingent verbraucht. Bitte versuchen Sie es morgen erneut.',
  'quotaExceeded.tokens': 'Sie haben heute {{used}} von {{limit}} Token verwendet.',
  contextTooLarge: 'Der von Ihnen bereitgestellte Kontext ist zu groß. Versuchen Sie, einen kleineren Teil des Dokuments auszuwählen.',
  'contextTooLarge.details': 'Der Kontext umfasst {{actual}} Token, aber das Modell akzeptiert höchstens {{max}} Token.',
  promptEmpty: 'Bitte geben Sie eine Frage oder Anweisung für die KI ein.',
  promptTooLong: 'Ihre Nachricht ist zu lang. Bitte kürzen Sie sie.',
  promptInjectionDetected: 'In Ihrer Eingabe wurde eine mögliche Prompt-Injection erkannt. Die Anfrage wurde aus Sicherheitsgründen blockiert.',
  'promptInjectionDetected.details': 'Das System hat in die Eingabe eingebettete Anweisungen erkannt, die den Versuch einer Manipulation der KI darstellen. Sollte dies ein Fehlalarm sein, formulieren Sie Ihre Eingabe um und versuchen Sie es erneut.',
  'promptInjectionDetected.document': 'Das angehängte Dokument scheint eine Prompt-Injection zu enthalten. Die Anfrage wurde blockiert. Bitte überprüfen Sie das Dokument manuell.',
  sensitiveContent: 'Die KI hat die Bearbeitung dieser Anfrage abgelehnt, da sie offenbar sensible Inhalte betrifft.',
  externalDisabled: 'Externe KI-Provider sind für Ihre Organisation deaktiviert. Bitte verwenden Sie ein lokales Modell oder wenden Sie sich an Ihren Administrator.',
  externalUnavailable: 'Der externe KI-Provider ist nicht verfügbar. Bitte versuchen Sie es später erneut.',
  externalError: 'Der externe KI-Provider hat einen Fehler zurückgegeben. Bitte versuchen Sie es erneut.',
  localUnavailable: 'Das lokale KI-Modell ist nicht verfügbar. Bitte versuchen Sie es später erneut oder wechseln Sie zu einem externen Modell.',
  localError: 'Das lokale KI-Modell hat einen Fehler festgestellt. Bitte versuchen Sie es erneut.',
  modelNotFound: 'Das ausgewählte KI-Modell konnte nicht gefunden werden.',
  modelDeprecated: 'Das ausgewählte KI-Modell ist veraltet. Bitte wählen Sie ein anderes Modell.',
  modelOverloaded: 'Das ausgewählte KI-Modell ist derzeit überlastet. Bitte versuchen Sie es später erneut oder wählen Sie ein anderes Modell.',
  invalidResponse: 'Die KI hat eine ungültige Antwort zurückgegeben. Bitte versuchen Sie es erneut oder formulieren Sie Ihre Anfrage um.',
  noCitations: 'Die KI konnte keine Dokumente als Zitate für diese Antwort finden. Die Antwort könnte unzuverlässig sein.',
  citationBlocked: 'Die KI hat versucht, ein Dokument zu zitieren, auf das Sie keinen Zugriff haben. Das Zitat wurde entfernt.',
  actionRequiresConfirmation: 'Diese KI-Aktion erfordert Ihre Bestätigung, bevor sie angewendet werden kann.',
  actionBlocked: 'Diese KI-Aktion wurde durch Richtlinie blockiert.',
  'actionBlocked.legalHold': 'Diese KI-Aktion ist blockiert, weil das Dokument unter Legal Hold steht.',
  'actionBlocked.retention': 'Diese KI-Aktion ist blockiert, weil das Dokument unter einem aktiven Aufbewahrungsplan steht.',
  'actionBlocked.classification': 'Diese KI-Aktion ist wegen der Klassifizierungsstufe des Dokuments blockiert.',
  actionFailed: 'Die KI-Aktion konnte nicht angewendet werden. Bitte versuchen Sie es erneut oder wenden Sie die Änderung manuell an.',
  sessionExpired: 'Ihre KI-Sitzung ist abgelaufen. Bitte starten Sie eine neue Sitzung.',
  sessionNotFound: 'Die KI-Sitzung konnte nicht gefunden werden. Möglicherweise wurde sie gelöscht.',
  feedbackFailed: 'Ihr Feedback konnte nicht übermittelt werden. Bitte versuchen Sie es erneut.',
  unknown: 'Beim Verarbeiten Ihrer KI-Anfrage ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es erneut.',

  'safety.title': 'KI-Sicherheit',
  'safety.disclaimer': 'Die KI-Sicherheitsmaßnahmen von Smart EDMS sind aktiv. Die KI kann nicht:',
  'safety.disclaimer.bullet1': 'Dokumente ohne Ihre ausdrückliche Bestätigung ändern.',
  'safety.disclaimer.bullet2': 'Dokumente zitieren, auf die Sie keinen Zugriff haben.',
  'safety.disclaimer.bullet3': 'In Dokumente eingebettete Prompt-Injections ausführen.',
  'safety.disclaimer.bullet4': 'Die Aufbewahrungs-, Legal-Hold- oder Klassifizierungsrichtlinien Ihrer Organisation umgehen.',
  'safety.disclaimer.bullet5': 'Rechtliche, medizinische oder finanzielle Ratschläge geben.',
  'safety.report': 'KI-Sicherheitsproblem melden',
  'safety.report.placeholder': 'Beschreiben Sie, was passiert ist',
  'safety.report.success': 'Danke. Ihr Bericht wurde protokolliert und wird von einem KI-Sicherheitsspezialisten geprüft.',
} as const;

export default errors;
