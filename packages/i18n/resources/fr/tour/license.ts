/**
 * @smart-edms/i18n — fr translation: `tour.license` namespace.
 *
 * Source of truth: en/tour/license.ts
 * Translated from the English baseline.
 *
 * REVIEW: native speaker needed
 * This namespace contains compliance-relevant content (license states, grace
 * periods, remediation). Translations should be reviewed by a native
 * French-speaking licensing / compliance specialist before production rollout.
 */

const license = {
  title: 'Visite licence',
  subtitle: 'Comprendre le statut de votre licence et ce que chaque état signifie.',

  'step.intro.title': 'Votre licence, expliquée simplement',
  'step.intro.body': 'Smart EDMS utilise un modèle de licence calme et prévisible. Cette visite vous guide à travers chaque état afin que vous sachiez à quoi vous attendre — et de quoi ne pas vous inquiéter.',

  'step.overview.title': 'Aperçu de la licence',
  'step.overview.body': 'Depuis la page Licence, vous pouvez voir votre statut actuel, la date d\'expiration de votre licence, le nombre d\'utilisateurs et le volume de stockage utilisés, ainsi que les modules activés.',

  'step.state.valid.title': 'État 1 : Actif',
  'step.state.valid.body': 'Lorsque votre licence est active, tout fonctionne comme prévu. Toutes les fonctionnalités que vous avez souscrites sont disponibles. C\'est l\'état normal au quotidien.',

  'step.state.expiringSoon.title': 'État 2 : Renouvellement à venir',
  'step.state.expiringSoon.body': 'Quelques semaines avant l\'expiration de votre licence, vous verrez un rappel discret. Rien ne change — tout continue de fonctionner. C\'est simplement une invitation amicale à renouveler quand cela vous arrange.',

  'step.state.expiredGrace.title': 'État 3 : Renouvellement en cours',
  'step.state.expiredGrace.body': 'Si votre licence expire avant la fin du renouvellement, vous entrez en période de grâce. Le système continue de fonctionner pleinement. Vos données sont en sécurité. Renouvelez à votre convenance.',

  'step.state.graceExhausted.title': 'État 4 : Renouvellement requis',
  'step.state.graceExhausted.body': 'Si la période de grâce se termine sans renouvellement, l\'accès en écriture est suspendu. Vous pouvez toujours lire les documents et exporter les données — vous ne pouvez simplement rien ajouter ni modifier. Renouvelez pour restaurer l\'accès complet.',

  'step.state.extendedRemediation.title': 'État 5 : Remédiation en cours',
  'step.state.extendedRemediation.body': 'Dans de rares cas — par exemple, un litige de facturation ou un problème de connectivité prolongé — votre licence entre en remédiation étendue. Le système fonctionne en mode dégradé. Contactez le support pour résoudre la situation.',

  'step.state.invalid.title': 'État 6 : Licence inactive',
  'step.state.invalid.body': 'Si la licence est révoquée ou n\'a jamais été activée, le système est inactif. Contactez votre administrateur pour restaurer l\'accès. Vos données restent intactes.',

  'step.heartbeat.title': 'Le modèle de pulsation',
  'step.heartbeat.body': 'Smart EDMS vérifie périodiquement le serveur de licences. S\'il ne peut pas l\'atteindre — par exemple, vous êtes hors ligne — le système continue de fonctionner normalement. Les échecs de pulsation ne bloquent jamais l\'accès.',

  'step.offline.title': 'Travail hors ligne',
  'step.offline.body': 'Smart EDMS est conçu pour fonctionner hors ligne. Vous pouvez travailler sans contacter le serveur de licences pendant des semaines. Lorsque la connectivité revient, la pulsation reprend automatiquement.',

  'step.renew.title': 'Comment renouveler',
  'step.renew.body': 'Le renouvellement se fait en un clic. Vous pouvez renouveler en ligne avec un moyen de paiement, ou importer un fichier de licence .sedmslic reçu de votre responsable de compte.',

  'step.import.title': 'Importer un fichier de licence',
  'step.import.body': 'Un fichier .sedmslic est un fichier de licence signé. Importez-le depuis la page Licence pour activer ou prolonger votre licence. Le fichier est vérifié par rapport à l\'identifiant de votre organisation.',

  'step.export.title': 'Exporter un fichier de demande',
  'step.export.body': 'Pour les installations isolées, générez un fichier de demande .sedmsreq. Envoyez-le à votre responsable de compte, qui vous retournera un fichier .sedmslic.',

  'step.noAlarm.title': 'Pas de surprises, pas d\'alarmes',
  'step.noAlarm.body': 'Smart EDMS ne vous bloque jamais sans avertissement. Chaque transition d\'état est annoncée à l\'avance, et vos données sont toujours en sécurité.',

  'step.adminRole.title': 'Qui voit quoi',
  'step.adminRole.body': 'Le statut de la licence est visible par les administrateurs. Les utilisateurs ordinaires ne voient qu\'une petite bannière dismissible lorsque le renouvellement est dû — ils ne sont jamais alarmés.',

  'step.dataSafety.title': 'Vos données sont en sécurité',
  'step.dataSafety.body': 'Aucun état de licence ne supprime jamais vos documents. Même si la licence est révoquée, vos données restent intactes et exportables.',

  'completion.title': 'Vous comprenez le modèle de licence',
  'completion.body': 'Vous savez maintenant ce que chaque état de licence signifie et comment renouveler. Suivez la visite Scanner pour découvrir la numérisation papier.',
  'completion.next': 'Suivre la visite Scanner',

  'checklist.title': 'Liste de contrôle de la visite Licence',
  'checklist.item.viewStatus': 'Consultez le statut actuel de votre licence',
  'checklist.item.checkExpiry': 'Vérifiez la date d\'expiration',
  'checklist.item.identifyRenewal': 'Identifiez le bouton de renouvellement',
  'checklist.item.findImport': 'Trouvez l\'option d\'import .sedmslic',
  'checklist.item.findExport': 'Trouvez l\'option d\'export .sedmsreq',
} as const;

export default license;
