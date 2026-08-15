"use strict";
/**
 * @smart-edms/i18n — fr translation: `errors` namespace.
 *
 * Source of truth: en/errors.ts
 * Translated from the English baseline.
 *
 * REVIEW: This namespace contains compliance-relevant content.
 * Translations should be reviewed by a native speaker before production rollout.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const errors = {
    UNAUTHENTICATED: 'Vous devez vous connecter pour continuer.',
    UNAUTHORIZED: 'Vous n\'êtes pas autorisé à effectuer cette action.',
    FORBIDDEN: 'Accès refusé. Vous n\'avez pas la permission d\'accéder à cette ressource.',
    NOT_FOUND: 'La ressource demandée est introuvable.',
    VALIDATION_FAILED: 'Certains champs contiennent des valeurs invalides. Veuillez les vérifier et réessayer.',
    RATE_LIMITED: 'Trop de requêtes. Veuillez ralentir et réessayer dans {seconds, plural, one {# seconde} other {# secondes}}.',
    CONFLICT: 'Cette action entre en conflit avec l\'état actuel de la ressource. Veuillez rafraîchir et réessayer.',
    LICENSE_INVALID: 'La licence de cette organisation n\'est pas valide. Veuillez contacter votre administrateur.',
    LICENSE_EXPIRED: 'La licence de cette organisation a expiré. Veuillez contacter votre administrateur pour la renouveler.',
    LICENSE_REVOKED: 'La licence de cette organisation a été révoquée. Veuillez contacter votre administrateur.',
    LICENSE_GRACE_EXHAUSTED: 'La période de grâce de la licence expirée est terminée. Veuillez contacter votre administrateur pour rétablir l\'accès.',
    LICENSE_FEATURE_NOT_ENTITLED: 'Cette fonctionnalité n\'est pas incluse dans votre formule de licence actuelle.',
    TENANT_MISMATCH: 'La ressource n\'appartient pas à votre organisation.',
    AI_NOT_LICENSED: 'Les fonctionnalités de l\'assistant IA ne sont pas incluses dans votre formule de licence actuelle.',
    AI_TOOL_FORBIDDEN: 'Vous n\'avez pas la permission d\'utiliser cet outil IA.',
    AI_ACTION_REQUIRES_CONFIRMATION: 'Cette action IA nécessite votre confirmation avant de pouvoir être appliquée.',
    PROMPT_INJECTION_DETECTED: 'Une potentielle injection de prompt a été détectée dans votre saisie. La requête a été bloquée par mesure de sécurité.',
    EXTERNAL_AI_DISABLED: 'Les fournisseurs IA externes sont désactivés pour votre organisation. Veuillez contacter votre administrateur.',
    WORKFLOW_NOT_DURABLE: 'Ce workflow n\'est pas configuré pour une exécution durable et ne peut pas être démarré.',
    WORKFLOW_INVALID_STATE: 'Le workflow n\'est pas dans un état permettant cette action.',
    LEGAL_HOLD_BLOCKS_DELETION: 'Ce document est sous conservation légale et ne peut pas être supprimé.',
    LEGAL_HOLD_BLOCKS_ACTION: 'Cette action est bloquée car la ressource est sous conservation légale.',
    RETENTION_BLOCKS_DELETION: 'Ce document est soumis à un calendrier de conservation et ne peut pas encore être supprimé.',
    RETENTION_BLOCKS_ACTION: 'Cette action est bloquée car la ressource est soumise à un calendrier de conservation actif.',
    CLASSIFICATION_DOWNGRADE_DENIED: 'L\'abaissement du niveau de classification n\'est pas autorisé par la politique.',
    UPLOAD_TOO_LARGE: 'Le fichier téléversé dépasse la taille maximale autorisée de {{max}}.',
    UNSAFE_FILE_TYPE: 'Le type de fichier téléversé n\'est pas autorisé.',
    UNSAFE_FILE_CONTENT: 'Le fichier téléversé a été rejeté par l\'analyseur de sécurité.',
    SHARE_EXPIRED: 'Ce lien de partage a expiré.',
    SHARE_REVOKED: 'Ce lien de partage a été révoqué.',
    SHARE_BLOCKED_BY_POLICY: 'Le partage externe de ce document n\'est pas autorisé par la politique de votre organisation.',
    SHARE_BLOCKED_BY_CLASSIFICATION: 'Les documents avec ce niveau de classification ne peuvent pas être partagés à l\'externe.',
    INTERNAL_ERROR: 'Une erreur interne s\'est produite. Veuillez réessayer. Si le problème persiste, contactez l\'assistance avec l\'ID de trace {{traceId}}.',
    SERVICE_UNAVAILABLE: 'Ce service est temporairement indisponible. Veuillez réessayer dans quelques instants.',
    MAINTENANCE_MODE: 'Smart EDMS est en maintenance programmée. Veuillez réessayer plus tard.',
    NETWORK_ERROR: 'Une erreur réseau s\'est produite. Veuillez vérifier votre connexion et réessayer.',
    TIMEOUT: 'La requête a expiré. Veuillez réessayer.',
    QUOTA_EXCEEDED: 'Vous avez dépassé votre quota de stockage. Veuillez supprimer les documents inutilisés ou contacter votre administrateur pour augmenter la limite.',
    USER_LIMIT_EXCEEDED: 'Vous avez atteint la limite d\'utilisateurs de votre formule de licence.',
    CONCURRENT_SESSION_LIMIT: 'Vous avez atteint le nombre maximal de sessions simultanées.',
    TOUR_NOT_FOUND: 'Le tutoriel demandé est introuvable.',
    TOUR_NOT_LICENSED: 'Ce tutoriel n\'est pas inclus dans votre formule de licence actuelle.',
    UNKNOWN: 'Une erreur inattendue s\'est produite.',
};
exports.default = errors;
//# sourceMappingURL=errors.js.map