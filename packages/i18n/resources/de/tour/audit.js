"use strict";
/**
 * @smart-edms/i18n — de translation: `tour.audit` namespace.
 *
 * Source of truth: en/tour/audit.ts
 * Translated from the English baseline.
 *
 * REVIEW: native speaker needed
 * This namespace contains compliance-relevant content (audit, integrity,
 * legal hold). Translations should be reviewed by a native German-speaking
 * compliance specialist before production rollout.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const audit = {
    title: 'Audit-Tour',
    subtitle: 'Verstehen Sie die manipulationssichere Aufzeichnung jeder Aktion.',
    'step.intro.title': 'Das Audit-Protokoll',
    'step.intro.body': 'Jede Aktion in Smart EDMS — Anmeldung, Dokumentansicht, Workflow-Genehmigung, Legal Hold — wird in einem vertrauenswürdigen Audit-Protokoll aufgezeichnet.',
    'step.tamperEvident.title': 'Manipulationssicher',
    'step.tamperEvident.body': 'Jedes Audit-Ereignis enthält einen Hash des vorherigen Ereignisses und bildet so eine Kette. Wenn jemand ein altes Ereignis ändert, bricht die Kette und wir können dies erkennen.',
    'step.integrity.title': 'Integritätsprüfung',
    'step.integrity.body': 'Klicken Sie auf „Integrität prüfen“, um die Hash-Kette abzulaufen und zu bestätigen, dass kein Ereignis manipuliert wurde. Das Ergebnis selbst wird auditiert.',
    'step.filters.title': 'Filtern und Suche',
    'step.filters.body': 'Filtern Sie nach Akteur, Aktion, Kategorie, Ressource, Zeitraum oder Ergebnis. Speichern Sie häufige Abfragen für Compliance-Berichte.',
    'step.export.title': 'Export',
    'step.export.body': 'Exportieren Sie das Audit-Protokoll als CSV, JSON oder signiertes PDF. Das PDF enthält den Hash-Ketten-Kopf, sodass der Export später überprüft werden kann.',
    'step.actorKinds.title': 'Akteursarten',
    'step.actorKinds.body': 'Aktionen werden Benutzern, Servicekonten, dem System selbst, dem KI-Assistenten oder dem Lizenzserver zugeordnet. Wissen Sie immer, wer (oder was) was getan hat.',
    'step.categories.title': 'Kategorien',
    'step.categories.body': 'Ereignisse werden in 22 Kategorien gruppiert — Authentifizierung, Dokumentzugriff, Klassifizierung, Aufbewahrung, Legal Hold, KI-Werkzeugaufrufe und mehr.',
    'step.legalHold.title': 'Schnittstelle mit Legal Hold',
    'step.legalHold.body': 'Wenn eine Ressource unter Legal Hold steht, sind auch ihre Audit-Ereignisse vor Export und Änderung geschützt. Dies bewahrt Beweise für Rechtsstreitigkeiten.',
    'step.retention.title': 'Aufbewahrung',
    'step.retention.body': 'Audit-Ereignisse haben ihren eigenen Aufbewahrungsplan. Sie können vor ihrem Dispositionsdatum nicht gelöscht werden, auch nicht durch einen Administrator.',
    'step.liveTail.title': 'Live-Tail',
    'step.liveTail.body': 'Für Echtzeitüberwachung verwenden Sie den Live-Tail. Er streamt neue Ereignisse, sobald sie eintreten — nützlich während Untersuchungen.',
    'step.snapshot.title': 'Integritäts-Snapshots',
    'step.snapshot.body': 'Erstellen Sie einen Snapshot, um den aktuellen Hash-Ketten-Kopf zu erfassen. Speichern Sie ihn extern, um Manipulation erkennen zu können, selbst wenn Smart EDMS selbst kompromittiert wird.',
    'step.receipts.title': 'Hash-Ketten-Quittungen',
    'step.receipts.body': 'Für wertvolle Aktionen kann Smart EDMS eine signierte Quittung ausstellen, die die Aktion an einen Zeitpunkt anknüpft. Nützlich als Rechtsbeweis.',
    'completion.title': 'Sie können dem Audit-Protokoll vertrauen',
    'completion.body': 'Sie verstehen nun, wie Smart EDMS eine ehrliche Aufzeichnung jeder Aktion führt. Machen Sie die Admin-Tour, um mehr über die Benutzerverwaltung zu erfahren.',
    'completion.next': 'Admin-Tour starten',
};
exports.default = audit;
//# sourceMappingURL=audit.js.map