/**
 * @smart-edms/i18n — fr translation: `tour.audit` namespace.
 *
 * Source of truth: en/tour/audit.ts
 * Translated from the English baseline.
 *
 * REVIEW: native speaker needed
 * This namespace contains compliance-relevant content (audit, integrity,
 * legal hold). Translations should be reviewed by a native French-speaking
 * compliance specialist before production rollout.
 */

const audit = {
  title: 'Visite audit',
  subtitle: 'Comprendre l\'enregistrement infalsifiable de chaque action.',

  'step.intro.title': 'Le journal d\'audit',
  'step.intro.body': 'Chaque action dans Smart EDMS — connexion, consultation de document, approbation de workflow, gel légal — est enregistrée dans un journal d\'audit fiable.',

  'step.tamperEvident.title': 'Infalsifiable',
  'step.tamperEvident.body': 'Chaque événement d\'audit inclut un hachage de l\'événement précédent, formant une chaîne. Si quelqu\'un modifie un ancien événement, la chaîne se brise et nous pouvons le détecter.',

  'step.integrity.title': 'Vérification d\'intégrité',
  'step.integrity.body': 'Cliquez sur « Vérifier l\'intégrité » pour parcourir la chaîne de hachage et confirmer qu\'aucun événement n\'a été falsifié. Le résultat est lui-même audité.',

  'step.filters.title': 'Filtrage et recherche',
  'step.filters.body': 'Filtrez par acteur, action, catégorie, ressource, plage de dates ou résultat. Enregistrez les requêtes fréquentes pour les rapports de conformité.',

  'step.export.title': 'Export',
  'step.export.body': 'Exportez le journal d\'audit au format CSV, JSON ou PDF signé. Le PDF inclut la tête de chaîne de hachage afin que l\'export puisse être vérifié ultérieurement.',

  'step.actorKinds.title': 'Types d\'acteurs',
  'step.actorKinds.body': 'Les actions sont attribuées aux utilisateurs, comptes de service, au système lui-même, à l\'assistant IA ou au serveur de licences. Sachez toujours qui (ou quoi) a fait quoi.',

  'step.categories.title': 'Catégories',
  'step.categories.body': 'Les événements sont regroupés en 22 catégories — authentification, accès aux documents, classification, conservation, gel légal, invocation d\'outils IA, et plus encore.',

  'step.legalHold.title': 'Croisement avec le gel légal',
  'step.legalHold.body': 'Lorsqu\'une ressource est sous gel légal, ses événements d\'audit sont également protégés contre l\'export et la modification. Cela préserve les preuves pour les litiges.',

  'step.retention.title': 'Conservation',
  'step.retention.body': 'Les événements d\'audit ont leur propre calendrier de conservation. Ils ne peuvent pas être supprimés avant leur date de disposition, même par un administrateur.',

  'step.liveTail.title': 'Flux en direct',
  'step.liveTail.body': 'Pour une surveillance en temps réel, utilisez le flux en direct. Il diffuse les nouveaux événements au fur et à mesure — utile pendant les enquêtes.',

  'step.snapshot.title': 'Instantanés d\'intégrité',
  'step.snapshot.body': 'Créez un instantané pour capturer la tête actuelle de la chaîne de hachage. Stockez-le hors site pour pouvoir détecter la falsification même si Smart EDMS lui-même est compromis.',

  'step.receipts.title': 'Reçus de chaîne de hachage',
  'step.receipts.body': 'Pour les actions à forte valeur, Smart EDMS peut émettre un reçu signé ancrant l\'action à un instant donné. Utile comme preuve juridique.',

  'completion.title': 'Vous pouvez faire confiance au journal d\'audit',
  'completion.body': 'Vous comprenez désormais comment Smart EDMS conserve un enregistrement honnête de chaque action. Suivez la visite Admin pour découvrir la gestion des utilisateurs.',
  'completion.next': 'Suivre la visite Admin',
} as const;

export default audit;
