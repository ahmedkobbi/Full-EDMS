// REVIEW: native speaker needed
/**
 * @smart-edms/i18n — German: not-found + error-page namespace.
 */
const notFound = {
  'notFound.title': 'Seite nicht gefunden',
  'notFound.subtitle': 'Die gesuchte Seite existiert nicht oder wurde verschoben.',
  'notFound.action.home': 'Zurück zum Dashboard',
  'notFound.action.search': 'Dokumente durchsuchen',
  'notFound.action.help': 'Support kontaktieren',

  'forbidden.title': 'Zugriff verweigert',
  'forbidden.subtitle': 'Sie haben keine Berechtigung, auf diese Ressource zuzugreifen.',
  'forbidden.action.dashboard': 'Zurück zum Dashboard',
  'forbidden.action.signOut': 'Mit anderem Konto anmelden',

  'serverError.title': 'Serverfehler',
  'serverError.subtitle': 'Es ist ein Fehler auf unserer Seite aufgetreten. Bitte versuchen Sie es in einem Moment erneut.',
  'serverError.action.retry': 'Erneut versuchen',
  'serverError.action.support': 'Support kontaktieren',

  'licenseInvalid.title': 'Lizenz ungültig',
  'licenseInvalid.subtitle': 'Die Smart EDMS-Lizenz für diese Bereitstellung ist ungültig. Bitte kontaktieren Sie Ihren Administrator.',
  'licenseInvalid.action.import': 'Lizenz importieren (.sedmslic)',
  'licenseInvalid.action.contact': 'Support kontaktieren',

  'licenseExpired.title': 'Lizenz abgelaufen',
  'licenseExpired.subtitle': 'Die Smart EDMS-Lizenz ist abgelaufen. Bitte verlängern Sie Ihre Lizenz, um fortzufahren.',
  'licenseExpired.action.renew': 'Lizenz verlängern',
  'licenseExpired.action.contact': 'Vertrieb kontaktieren',

  'networkError.title': 'Netzwerkfehler',
  'networkError.subtitle': 'Verbindung zum Smart EDMS-Server nicht möglich. Bitte überprüfen Sie Ihre Verbindung.',
  'networkError.action.retry': 'Verbindung wiederholen',
} as const;

export default notFound;
