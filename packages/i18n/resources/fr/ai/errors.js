"use strict";
/**
 * @smart-edms/i18n — fr translation: `ai.errors` namespace.
 *
 * Source of truth: en/ai/errors.ts
 * Translated from the English baseline.
 *
 * REVIEW: native speaker needed
 * This namespace contains AI-safety-relevant strings. Translations should be
 * reviewed by a native French-speaking AI safety specialist before production
 * rollout.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const errors = {
    unavailable: 'L\'assistant IA est indisponible. Veuillez réessayer ultérieurement.',
    'unavailable.long': 'L\'assistant IA est indisponible. Il peut s\'agir d\'une panne temporaire. Vous pouvez continuer à utiliser Smart EDMS sans les fonctionnalités IA.',
    notLicensed: 'Les fonctionnalités de l\'assistant IA ne sont pas incluses dans votre formule de licence actuelle. Contactez votre administrateur pour une mise à niveau.',
    notEnabled: 'L\'assistant IA n\'est pas activé pour votre organisation. Contactez votre administrateur.',
    toolForbidden: 'Vous n\'avez pas la permission d\'utiliser cet outil IA.',
    toolDisabled: 'Cet outil IA a été désactivé par votre administrateur.',
    toolNotFound: 'L\'outil IA demandé est introuvable.',
    toolFailed: 'L\'outil IA n\'a pas pu terminer. Veuillez réessayer.',
    toolTimeout: 'L\'outil IA a mis trop de temps à répondre. Veuillez réessayer ou reformuler votre requête.',
    rateLimited: 'Vous avez atteint la limite de débit IA. Veuillez patienter {seconds, plural, one {# seconde} other {# secondes}} avant de réessayer.',
    quotaExceeded: 'Vous avez utilisé votre quota IA quotidien. Veuillez réessayer demain.',
    'quotaExceeded.tokens': 'Vous avez utilisé {{used}} sur {{limit}} jetons aujourd\'hui.',
    contextTooLarge: 'Le contexte que vous avez fourni est trop volumineux. Essayez de sélectionner une portion plus petite du document.',
    'contextTooLarge.details': 'Le contexte représente {{actual}} jetons, mais le modèle accepte au maximum {{max}} jetons.',
    promptEmpty: 'Veuillez saisir une question ou une instruction pour l\'IA.',
    promptTooLong: 'Votre message est trop long. Veuillez le raccourcir.',
    promptInjectionDetected: 'Une potentielle injection de prompt a été détectée dans votre saisie. La requête a été bloquée par mesure de sécurité.',
    'promptInjectionDetected.details': 'Le système a détecté des instructions intégrées dans la saisie qui semblent être une tentative de manipulation de l\'IA. S\'il s\'agit d\'un faux positif, reformulez votre saisie et réessayez.',
    'promptInjectionDetected.document': 'Le document que vous avez joint semble contenir une injection de prompt. La requête a été bloquée. Veuillez examiner le document manuellement.',
    sensitiveContent: 'L\'IA a refusé de traiter cette requête car elle semble impliquer un contenu sensible.',
    externalDisabled: 'Les fournisseurs IA externes sont désactivés pour votre organisation. Veuillez utiliser un modèle local ou contacter votre administrateur.',
    externalUnavailable: 'Le fournisseur IA externe est indisponible. Veuillez réessayer ultérieurement.',
    externalError: 'Le fournisseur IA externe a renvoyé une erreur. Veuillez réessayer.',
    localUnavailable: 'Le modèle IA local est indisponible. Veuillez réessayer ultérieurement ou passer à un modèle externe.',
    localError: 'Le modèle IA local a rencontré une erreur. Veuillez réessayer.',
    modelNotFound: 'Le modèle IA sélectionné est introuvable.',
    modelDeprecated: 'Le modèle IA sélectionné est obsolète. Veuillez choisir un autre modèle.',
    modelOverloaded: 'Le modèle IA sélectionné est actuellement surchargé. Veuillez réessayer ultérieurement ou choisir un autre modèle.',
    invalidResponse: 'L\'IA a renvoyé une réponse invalide. Veuillez réessayer ou reformuler votre requête.',
    noCitations: 'L\'IA n\'a trouvé aucun document à citer pour cette réponse. La réponse peut être peu fiable.',
    citationBlocked: 'L\'IA a tenté de citer un document auquel vous n\'avez pas accès. La citation a été supprimée.',
    actionRequiresConfirmation: 'Cette action IA nécessite votre confirmation avant de pouvoir être appliquée.',
    actionBlocked: 'Cette action IA a été bloquée par la politique.',
    'actionBlocked.legalHold': 'Cette action IA est bloquée car le document est sous gel légal.',
    'actionBlocked.retention': 'Cette action IA est bloquée car le document est sous un calendrier de conservation actif.',
    'actionBlocked.classification': 'Cette action IA est bloquée en raison du niveau de classification du document.',
    actionFailed: 'L\'action IA n\'a pas pu être appliquée. Veuillez réessayer ou appliquer la modification manuellement.',
    sessionExpired: 'Votre session IA a expiré. Veuillez démarrer une nouvelle session.',
    sessionNotFound: 'La session IA est introuvable. Elle a peut-être été supprimée.',
    feedbackFailed: 'Impossible d\'envoyer votre commentaire. Veuillez réessayer.',
    unknown: 'Une erreur inattendue s\'est produite lors du traitement de votre requête IA. Veuillez réessayer.',
    'safety.title': 'Sécurité IA',
    'safety.disclaimer': 'Les garde-fous de sécurité IA de Smart EDMS sont actifs. L\'IA ne peut pas :',
    'safety.disclaimer.bullet1': 'Modifier un document sans votre confirmation explicite.',
    'safety.disclaimer.bullet2': 'Citer des documents auxquels vous n\'avez pas accès.',
    'safety.disclaimer.bullet3': 'Exécuter des injections de prompt intégrées dans les documents.',
    'safety.disclaimer.bullet4': 'Contourner les politiques de conservation, de gel légal ou de classification de votre organisation.',
    'safety.disclaimer.bullet5': 'Donner des conseils juridiques, médicaux ou financiers.',
    'safety.report': 'Signaler un problème de sécurité IA',
    'safety.report.placeholder': 'Décrivez ce qui s\'est passé',
    'safety.report.success': 'Merci. Votre signalement a été enregistré et sera examiné par un spécialiste de la sécurité IA.',
};
exports.default = errors;
//# sourceMappingURL=errors.js.map