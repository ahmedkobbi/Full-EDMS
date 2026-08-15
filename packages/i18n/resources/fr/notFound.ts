// REVIEW: native speaker needed
/**
 * @smart-edms/i18n — French: not-found + error-page namespace.
 */
const notFound = {
  'notFound.title': 'Page introuvable',
  'notFound.subtitle': 'La page que vous recherchez n\'existe pas ou a été déplacée.',
  'notFound.action.home': 'Retour au tableau de bord',
  'notFound.action.search': 'Rechercher des documents',
  'notFound.action.help': 'Contacter le support',

  'forbidden.title': 'Accès refusé',
  'forbidden.subtitle': 'Vous n\'avez pas l\'autorisation d\'accéder à cette ressource.',
  'forbidden.action.dashboard': 'Retour au tableau de bord',
  'forbidden.action.signOut': 'Se connecter avec un autre compte',

  'serverError.title': 'Erreur serveur',
  'serverError.subtitle': 'Un problème est survenu de notre côté. Veuillez réessayer dans un instant.',
  'serverError.action.retry': 'Réessayer',
  'serverError.action.support': 'Contacter le support',

  'licenseInvalid.title': 'Licence invalide',
  'licenseInvalid.subtitle': 'La licence Smart EDMS pour ce déploiement n\'est pas valide. Veuillez contacter votre administrateur.',
  'licenseInvalid.action.import': 'Importer une licence (.sedmslic)',
  'licenseInvalid.action.contact': 'Contacter le support',

  'licenseExpired.title': 'Licence expirée',
  'licenseExpired.subtitle': 'La licence Smart EDMS a expiré. Veuillez renouveler votre licence pour continuer.',
  'licenseExpired.action.renew': 'Renouveler la licence',
  'licenseExpired.action.contact': 'Contacter les ventes',

  'networkError.title': 'Erreur réseau',
  'networkError.subtitle': 'Impossible de joindre le serveur Smart EDMS. Veuillez vérifier votre connexion.',
  'networkError.action.retry': 'Réessayer la connexion',
} as const;

export default notFound;
