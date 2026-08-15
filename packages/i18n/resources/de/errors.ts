/**
 * @smart-edms/i18n — de translation: `errors` namespace.
 *
 * Source of truth: en/errors.ts
 * Translated from the English baseline.
 *
 * REVIEW: This namespace contains compliance-relevant content.
 * Translations should be reviewed by a native speaker before production rollout.
 */

const errors = {
  UNAUTHENTICATED: 'Sie müssen sich anmelden, um fortzufahren.',
  UNAUTHORIZED: 'Sie sind nicht berechtigt, diese Aktion auszuführen.',
  FORBIDDEN: 'Zugriff verweigert. Sie haben keine Berechtigung, auf diese Ressource zuzugreifen.',
  NOT_FOUND: 'Die angeforderte Ressource wurde nicht gefunden.',
  VALIDATION_FAILED: 'Einige Felder enthalten ungültige Werte. Bitte überprüfen Sie und versuchen Sie es erneut.',
  RATE_LIMITED: 'Zu viele Anfragen. Bitte verlangsamen Sie und versuchen Sie es in {seconds, plural, one {# Sekunde} other {# Sekunden}} erneut.',
  CONFLICT: 'Diese Aktion steht im Konflikt mit dem aktuellen Zustand der Ressource. Bitte aktualisieren Sie und versuchen Sie es erneut.',
  LICENSE_INVALID: 'Die Lizenz für diese Organisation ist nicht gültig. Bitte wenden Sie sich an Ihren Administrator.',
  LICENSE_EXPIRED: 'Die Lizenz für diese Organisation ist abgelaufen. Bitte wenden Sie sich an Ihren Administrator, um sie zu verlängern.',
  LICENSE_REVOKED: 'Die Lizenz für diese Organisation wurde widerrufen. Bitte wenden Sie sich an Ihren Administrator.',
  LICENSE_GRACE_EXHAUSTED: 'Die Kulanzfrist für die abgelaufene Lizenz ist beendet. Bitte wenden Sie sich an Ihren Administrator, um den Zugriff wiederherzustellen.',
  LICENSE_FEATURE_NOT_ENTITLED: 'Diese Funktion ist in Ihrem aktuellen Lizenzplan nicht enthalten.',
  TENANT_MISMATCH: 'Die Ressource gehört nicht zu Ihrer Organisation.',
  AI_NOT_LICENSED: 'KI-Assistent-Funktionen sind in Ihrem aktuellen Lizenzplan nicht enthalten.',
  AI_TOOL_FORBIDDEN: 'Sie haben keine Berechtigung, dieses KI-Tool zu verwenden.',
  AI_ACTION_REQUIRES_CONFIRMATION: 'Diese KI-Aktion erfordert Ihre Bestätigung, bevor sie angewendet werden kann.',
  PROMPT_INJECTION_DETECTED: 'Eine mögliche Prompt-Injection wurde in Ihrer Eingabe erkannt. Die Anfrage wurde aus Sicherheitsgründen blockiert.',
  EXTERNAL_AI_DISABLED: 'Externe KI-Anbieter sind für Ihre Organisation deaktiviert. Bitte wenden Sie sich an Ihren Administrator.',
  WORKFLOW_NOT_DURABLE: 'Dieser Workflow ist nicht für dauerhafte Ausführung konfiguriert und kann nicht gestartet werden.',
  WORKFLOW_INVALID_STATE: 'Der Workflow befindet sich nicht in einem Zustand, der diese Aktion erlaubt.',
  LEGAL_HOLD_BLOCKS_DELETION: 'Dieses Dokument steht unter Aufbewahrungspflicht (Legal Hold) und kann nicht gelöscht werden.',
  LEGAL_HOLD_BLOCKS_ACTION: 'Diese Aktion ist blockiert, da die Ressource unter Aufbewahrungspflicht steht.',
  RETENTION_BLOCKS_DELETION: 'Dieses Dokument unterliegt einer Aufbewahrungsrichtlinie und kann noch nicht gelöscht werden.',
  RETENTION_BLOCKS_ACTION: 'Diese Aktion ist blockiert, da die Ressource einer aktiven Aufbewahrungsrichtlinie unterliegt.',
  CLASSIFICATION_DOWNGRADE_DENIED: 'Eine Herabstufung der Klassifizierungsstufe ist durch die Richtlinie nicht erlaubt.',
  UPLOAD_TOO_LARGE: 'Die hochgeladene Datei überschreitet die maximale zulässige Größe von {{max}}.',
  UNSAFE_FILE_TYPE: 'Der hochgeladene Dateityp ist nicht zulässig.',
  UNSAFE_FILE_CONTENT: 'Die hochgeladene Datei wurde vom Sicherheitsscanner abgelehnt.',
  SHARE_EXPIRED: 'Dieser Freigabelink ist abgelaufen.',
  SHARE_REVOKED: 'Dieser Freigabelink wurde widerrufen.',
  SHARE_BLOCKED_BY_POLICY: 'Die externe Freigabe dieses Dokuments ist durch die Richtlinie Ihrer Organisation nicht erlaubt.',
  SHARE_BLOCKED_BY_CLASSIFICATION: 'Dokumente mit dieser Klassifizierungsstufe können nicht extern geteilt werden.',
  INTERNAL_ERROR: 'Ein interner Fehler ist aufgetreten. Bitte versuchen Sie es erneut. Wenn das Problem besteht, wenden Sie sich mit der Trace-ID {{traceId}} an den Support.',
  SERVICE_UNAVAILABLE: 'Dieser Dienst ist vorübergehend nicht verfügbar. Bitte versuchen Sie es in wenigen Augenblicken erneut.',
  MAINTENANCE_MODE: 'Smart EDMS befindet sich in geplanter Wartung. Bitte versuchen Sie es später erneut.',
  NETWORK_ERROR: 'Ein Netzwerkfehler ist aufgetreten. Bitte überprüfen Sie Ihre Verbindung und versuchen Sie es erneut.',
  TIMEOUT: 'Die Anfrage hat eine Zeitüberschreitung. Bitte versuchen Sie es erneut.',
  QUOTA_EXCEEDED: 'Sie haben Ihr Speicherkontingent überschritten. Bitte löschen Sie ungenutzte Dokumente oder wenden Sie sich an Ihren Administrator, um das Limit zu erhöhen.',
  USER_LIMIT_EXCEEDED: 'Sie haben das Benutzerlimit Ihres Lizenzplans erreicht.',
  CONCURRENT_SESSION_LIMIT: 'Sie haben die maximale Anzahl gleichzeitiger Sitzungen erreicht.',
  TOUR_NOT_FOUND: 'Die angeforderte Tour wurde nicht gefunden.',
  TOUR_NOT_LICENSED: 'Diese Tour ist in Ihrem aktuellen Lizenzplan nicht enthalten.',
  UNKNOWN: 'Ein unerwarteter Fehler ist aufgetreten.',
} as const;

export default errors;
