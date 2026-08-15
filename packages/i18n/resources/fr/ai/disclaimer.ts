/**
 * @smart-edms/i18n — fr translation: `ai.disclaimer` namespace.
 *
 * Source of truth: en/ai/disclaimer.ts
 * Translated from the English baseline.
 *
 * REVIEW: native speaker needed
 * This namespace contains compliance-relevant content (AI safety, legal
 * disclaimers). Translations should be reviewed by a native French-speaking
 * AI safety / compliance specialist before production rollout.
 */

const disclaimer = {
  title: 'Avertissements IA',
  subtitle: 'Comment l\'assistant IA reste sûr et fiable.',
  readOnlyDefault: 'L\'assistant IA est en lecture seule par défaut. Il peut lire les documents auxquels vous avez accès et répondre à vos questions, mais il ne peut rien modifier sans votre confirmation explicite.',
  'readOnlyDefault.short': 'Lecture seule par défaut. Confirmation requise pour les modifications.',
  confirmationRequired: 'Chaque action IA qui modifierait un document, des métadonnées, un workflow ou un paramètre requiert votre confirmation explicite. Vous voyez exactement ce que l\'IA propose de faire avant que quoi que ce soit ne se produise.',
  'confirmationRequired.short': 'Chaque modification nécessite votre confirmation.',
  notLegalAdvice: 'L\'assistant IA peut résumer des documents juridiques mais ne peut pas donner de conseil juridique. Pour les décisions juridiques, consultez un avocat qualifié. Les résumés générés par IA de textes juridiques sont des brouillons, pas des avis juridiques.',
  'notLegalAdvice.short': 'Pas un conseil juridique. Consultez un avocat qualifié pour les décisions juridiques.',
  citationsLimitedToAccessible: 'Chaque affirmation de l\'IA est étayée par une citation vers un document spécifique. L\'IA ne peut citer que les documents que vous avez le droit de consulter — elle ne peut pas utiliser des documents hors de votre portée pour étayer ses réponses.',
  'citationsLimitedToAccessible.short': 'Les citations sont limitées aux documents auxquels vous avez accès.',
  toolAudited: 'Chaque appel d\'outil IA est enregistré dans le journal d\'audit infalsifiable. Le prompt, la réponse, les documents consultés et l\'utilisateur qui a déclenché l\'appel sont tous conservés pour examen de conformité.',
  'toolAudited.short': 'Chaque appel d\'outil IA est audité.',
  promptInjectionProtected: 'L\'assistant IA est protégé contre l\'injection de prompt — tentatives de manipuler l\'IA en intégrant des instructions dans le contenu des documents. Les injections détectées sont bloquées et signalées.',
  'promptInjectionProtected.short': 'Protégé contre l\'injection de prompt.',
  degradesGracefully: 'Si l\'assistant IA devient indisponible — panne du fournisseur, limite de licence, problème réseau — Smart EDMS continue de fonctionner normalement. Vous perdez seulement temporairement les fonctionnalités IA ; vos documents et workflows continuent de fonctionner.',
  'degradesGracefully.short': 'Se dégrade normalement quand l\'IA est indisponible.',
  mayContainErrors: 'Les réponses générées par l\'IA peuvent contenir des erreurs. Vérifiez les détails importants auprès des sources citées avant de vous y fier.',
  'mayContainErrors.short': 'Peut contenir des erreurs. Vérifiez avant de vous y fier.',
  noPersonalDataToExternal: 'Lors de l\'utilisation d\'un fournisseur IA externe, Smart EDMS minimise les données envoyées. Les informations personnellement identifiables sont caviardées lorsque c\'est possible. Utilisez un modèle local ou hybride pour les documents sensibles.',
  'noPersonalDataToExternal.short': 'Les données personnelles sont caviardées avant l\'envoi aux fournisseurs IA externes.',
  humanReviewRequired: 'Les suggestions de l\'IA pour la classification, la conservation et le gel légal sont consultatives uniquement. Un utilisateur humain doit approuver chaque décision de ce type.',
  'humanReviewRequired.short': 'Les suggestions IA pour la conformité sont consultatives. Approbation humaine requise.',
  notForHighStakes: 'Pour les décisions à enjeux — juridiques, médicales, financières — traitez la sortie de l\'IA comme un brouillon, pas comme définitif. Consultez toujours un professionnel qualifié.',
  'notForHighStakes.short': 'Pour les décisions à enjeux, traitez la sortie IA comme un brouillon.',
  modelCapabilities: 'Les capacités de l\'IA dépendent du modèle utilisé. Les modèles plus grands sont plus capables mais plus lents et plus coûteux. Smart EDMS choisit le bon modèle pour chaque tâche en mode hybride.',
  'modelCapabilities.short': 'Les capacités dépendent du modèle.',
  contextLimits: 'L\'IA ne peut prendre en compte qu\'une quantité limitée de contexte à la fois. Pour les documents très longs, elle peut manquer des détails près du début ou de la fin. Fournissez un contexte ciblé pour de meilleurs résultats.',
  'contextLimits.short': 'Le contexte est limité. Concentrez votre question pour de meilleurs résultats.',
  languageAccuracy: 'L\'IA est plus précise en anglais. Les traductions et résumés dans d\'autres langues peuvent contenir des erreurs. Faites relire le contenu critique pour la conformité par un locuteur natif.',
  'languageAccuracy.short': 'Plus précis en anglais. Faites relire les traductions dans d\'autres langues.',
  versionTransparency: 'Le modèle et la version de l\'IA sont enregistrés avec chaque réponse afin que vous puissiez vérifier quel modèle a produit une réponse donnée.',
  'versionTransparency.short': 'Le modèle et la version sont enregistrés avec chaque réponse.',
  noSelfModification: 'L\'IA ne peut pas modifier sa propre configuration, sa licence ou sa piste d\'audit. Ceux-ci sont protégés par une authentification et une autorisation séparées.',
  'noSelfModification.short': 'L\'IA ne peut pas modifier ses propres paramètres ou piste d\'audit.',
  complianceOverride: 'Les actions de l\'IA sont soumises aux mêmes règles de conformité que les actions humaines. Les calendriers de conservation, les gels légaux et les politiques de classification s\'appliquent de manière égale.',
  'complianceOverride.short': 'L\'IA est soumise aux mêmes règles de conformité que les humains.',
  feedbackLoop: 'Vos commentaires aident à améliorer l\'IA. Utilisez les boutons utile / pas utile sur chaque réponse pour orienter les améliorations futures.',
  'feedbackLoop.short': 'Vos commentaires améliorent l\'IA.',
  disclaimerBanner: 'Les réponses générées par l\'IA peuvent contenir des erreurs. Vérifiez auprès des sources citées. Pas un conseil juridique, médical ou financier.',
} as const;

export default disclaimer;
