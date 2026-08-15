/**
 * @smart-edms/i18n — de translation: `ai.disclaimer` namespace.
 *
 * Source of truth: en/ai/disclaimer.ts
 * Translated from the English baseline.
 *
 * REVIEW: native speaker needed
 * This namespace contains compliance-relevant content (AI safety, legal
 * disclaimers). Translations should be reviewed by a native German-speaking
 * AI safety / compliance specialist before production rollout.
 */

const disclaimer = {
  title: 'KI-Hinweise',
  subtitle: 'Wie der KI-Assistent sicher und vertrauenswürdig bleibt.',
  readOnlyDefault: 'Der KI-Assistent ist standardmäßig schreibgeschützt. Er kann Dokumente lesen, auf die Sie Zugriff haben, und Fragen beantworten, aber er kann nichts ohne Ihre ausdrückliche Bestätigung ändern.',
  'readOnlyDefault.short': 'Standardmäßig schreibgeschützt. Für Änderungen ist eine Bestätigung erforderlich.',
  confirmationRequired: 'Jede KI-Aktion, die ein Dokument, Metadaten, einen Workflow oder eine Einstellung ändern würde, erfordert Ihre ausdrückliche Bestätigung. Sie sehen genau, was die KI vorzunehmen beabsichtigt, bevor etwas passiert.',
  'confirmationRequired.short': 'Jede Änderung erfordert Ihre Bestätigung.',
  notLegalAdvice: 'Der KI-Assistent kann Rechtsdokumente zusammenfassen, aber keine Rechtsberatung leisten. Wenden Sie sich für rechtliche Entscheidungen an einen qualifizierten Anwalt. KI-generierte Zusammenfassungen rechtlicher Texte sind Entwürfe, keine Rechtsauffassungen.',
  'notLegalAdvice.short': 'Keine Rechtsberatung. Wenden Sie sich für rechtliche Entscheidungen an einen qualifizierten Anwalt.',
  citationsLimitedToAccessible: 'Jede Behauptung der KI wird durch ein Zitat aus einem bestimmten Dokument belegt. Die KI kann nur Dokumente zitieren, auf die Sie Zugriffsrechte haben — sie kann keine Dokumente außerhalb Ihrer Reichweite verwenden, um ihre Antworten zu untermauern.',
  'citationsLimitedToAccessible.short': 'Zitate sind auf Dokumente beschränkt, auf die Sie Zugriff haben.',
  toolAudited: 'Jeder KI-Werkzeugaufruf wird im manipulationssicheren Audit-Protokoll aufgezeichnet. Prompt, Antwort, zugegriffene Dokumente und der Benutzer, der den Aufruf ausgelöst hat, werden für die Compliance-Prüfung aufbewahrt.',
  'toolAudited.short': 'Jeder KI-Werkzeugaufruf wird auditiert.',
  promptInjectionProtected: 'Der KI-Assistent ist gegen Prompt-Injection geschützt — Versuche, die KI durch in Dokumentinhalte eingebettete Anweisungen zu manipulieren. Erkannte Injections werden blockiert und gemeldet.',
  'promptInjectionProtected.short': 'Geschützt gegen Prompt-Injection.',
  degradesGracefully: 'Wenn der KI-Assistent nicht verfügbar wird — Provider-Ausfall, Lizenzlimit, Netzwerkproblem — arbeitet Smart EDMS normal weiter. Sie verlieren nur vorübergehend die KI-Funktionen; Ihre Dokumente und Workflows funktionieren weiter.',
  'degradesGracefully.short': 'Degradiert ordnungsgemäß, wenn die KI nicht verfügbar ist.',
  mayContainErrors: 'KI-generierte Antworten können Fehler enthalten. Überprüfen Sie wichtige Details anhand der zitierten Quellen, bevor Sie sich darauf verlassen.',
  'mayContainErrors.short': 'Kann Fehler enthalten. Vor Verwendung überprüfen.',
  noPersonalDataToExternal: 'Bei Verwendung eines externen KI-Providers minimiert Smart EDMS die gesendeten Daten. Personenbezogene Daten werden nach Möglichkeit geschwärzt. Verwenden Sie für sensible Dokumente ein lokales oder hybrides Modell.',
  'noPersonalDataToExternal.short': 'Personenbezogene Daten werden vor dem Versand an externe KI-Provider geschwärzt.',
  humanReviewRequired: 'KI-Vorschläge für Klassifizierung, Aufbewahrung und Legal Hold sind nur beratend. Ein menschlicher Benutzer muss jede solche Entscheidung genehmigen.',
  'humanReviewRequired.short': 'KI-Vorschläge für Compliance sind beratend. Menschliche Freigabe erforderlich.',
  notForHighStakes: 'Bei weitreichenden Entscheidungen — rechtlicher, medizinischer, finanzieller Art — behandeln Sie die KI-Ausgabe als Entwurf, nicht als endgültig. Wenden Sie sich immer an einen qualifizierten Fachmann.',
  'notForHighStakes.short': 'Bei weitreichenden Entscheidungen die KI-Ausgabe als Entwurf behandeln.',
  modelCapabilities: 'Die Fähigkeiten der KI hängen vom verwendeten Modell ab. Größere Modelle sind leistungsfähiger, aber langsamer und teurer. Im hybriden Modus wählt Smart EDMS das passende Modell für jede Aufgabe.',
  'modelCapabilities.short': 'Fähigkeiten hängen vom Modell ab.',
  contextLimits: 'Die KI kann nur eine begrenzte Kontextmenge gleichzeitig berücksichtigen. Bei sehr langen Dokumenten kann sie Details am Anfang oder Ende übersehen. Liefern Sie fokussierten Kontext für beste Ergebnisse.',
  'contextLimits.short': 'Kontext ist begrenzt. Fokussieren Sie Ihre Frage für beste Ergebnisse.',
  languageAccuracy: 'Die KI ist auf Englisch am genauesten. Übersetzungen und Zusammenfassungen in anderen Sprachen können Fehler enthalten. Lassen Sie compliance-kritische Inhalte von einem Muttersprachler prüfen.',
  'languageAccuracy.short': 'Auf Englisch am genauesten. Übersetzungen in anderen Sprachen prüfen lassen.',
  versionTransparency: 'KI-Modell und Version werden mit jeder Antwort aufgezeichnet, damit Sie nachprüfen können, welches Modell eine bestimmte Antwort erzeugt hat.',
  'versionTransparency.short': 'Modell und Version werden mit jeder Antwort aufgezeichnet.',
  noSelfModification: 'Die KI kann ihre eigene Konfiguration, Lizenz oder Audit-Spur nicht ändern. Diese sind durch separate Authentifizierung und Autorisierung geschützt.',
  'noSelfModification.short': 'Die KI kann ihre eigenen Einstellungen oder die Audit-Spur nicht ändern.',
  complianceOverride: 'KI-Aktionen unterliegen denselben Compliance-Regeln wie menschliche Aktionen. Aufbewahrungspläne, Legal Holds und Klassifizierungsrichtlinien gelten gleichermaßen.',
  'complianceOverride.short': 'Die KI unterliegt denselben Compliance-Regeln wie Menschen.',
  feedbackLoop: 'Ihr Feedback hilft, die KI zu verbessern. Verwenden Sie die Schaltflächen „hilfreich“ / „nicht hilfreich“ bei jeder Antwort, um zukünftige Verbesserungen zu lenken.',
  'feedbackLoop.short': 'Ihr Feedback verbessert die KI.',
  disclaimerBanner: 'KI-generierte Antworten können Fehler enthalten. Überprüfen Sie anhand der zitierten Quellen. Keine Rechts-, medizinische oder finanzielle Beratung.',
} as const;

export default disclaimer;
