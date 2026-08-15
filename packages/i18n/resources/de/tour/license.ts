/**
 * @smart-edms/i18n — de translation: `tour.license` namespace.
 *
 * Source of truth: en/tour/license.ts
 * Translated from the English baseline.
 *
 * REVIEW: native speaker needed
 * This namespace contains compliance-relevant content (license states, grace
 * periods, remediation). Translations should be reviewed by a native
 * German-speaking licensing / compliance specialist before production rollout.
 */

const license = {
  title: 'Lizenz-Tour',
  subtitle: 'Verstehen Sie Ihren Lizenzstatus und was jeder Zustand bedeutet.',

  'step.intro.title': 'Ihre Lizenz, einfach erklärt',
  'step.intro.body': 'Smart EDMS verwendet ein ruhiges, vorhersehbares Lizenzmodell. Diese Tour führt Sie durch jeden Zustand, damit Sie wissen, was Sie erwartet — und was Sie nicht beunruhigen muss.',

  'step.overview.title': 'Lizenzüberblick',
  'step.overview.body': 'Auf der Lizenzseite sehen Sie Ihren aktuellen Status, wann Ihre Lizenz abläuft, wie viele Nutzer und wie viel Speicher Sie verwendet haben und welche Module aktiviert sind.',

  'step.state.valid.title': 'Zustand 1: Aktiv',
  'step.state.valid.body': 'Wenn Ihre Lizenz aktiv ist, funktioniert alles wie erwartet. Alle lizenzierten Funktionen sind verfügbar. Das ist der normale, alltägliche Zustand.',

  'step.state.expiringSoon.title': 'Zustand 2: Verlängerung steht an',
  'step.state.expiringSoon.body': 'Einige Wochen vor Ablauf Ihrer Lizenz sehen Sie eine dezente Erinnerung. Nichts ändert sich — alles funktioniert weiter. Das ist nur ein freundlicher Hinweis, bei Gelegenheit zu verlängern.',

  'step.state.expiredGrace.title': 'Zustand 3: Verlängerung läuft',
  'step.state.expiredGrace.body': 'Wenn Ihre Lizenz vor Abschluss der Verlängerung abläuft, treten Sie in eine Kulanzperiode ein. Das System arbeitet weiterhin vollständig. Ihre Daten sind sicher. Verlängern Sie, wann es Ihnen passt.',

  'step.state.graceExhausted.title': 'Zustand 4: Verlängerung erforderlich',
  'step.state.graceExhausted.body': 'Endet die Kulanzperiode ohne Verlängerung, wird der Schreibzugriff pausiert. Sie können weiterhin Dokumente lesen und Daten exportieren — Sie können nur nichts hinzufügen oder ändern. Verlängern Sie, um den vollen Zugriff wiederherzustellen.',

  'step.state.extendedRemediation.title': 'Zustand 5: Behebung läuft',
  'step.state.extendedRemediation.body': 'In seltenen Fällen — beispielsweise bei einer Abrechnungsstreitigkeit oder anhaltendem Verbindungsproblem — tritt Ihre Lizenz in eine erweiterte Behebungsphase ein. Das System arbeitet in einem eingeschränkten Zustand. Wenden Sie sich an den Support, um die Situation zu klären.',

  'step.state.invalid.title': 'Zustand 6: Lizenz nicht aktiv',
  'step.state.invalid.body': 'Wenn die Lizenz widerrufen oder nie aktiviert wurde, ist das System nicht aktiv. Wenden Sie sich an Ihren Administrator, um den Zugriff wiederherzustellen. Ihre Daten bleiben intakt.',

  'step.heartbeat.title': 'Das Heartbeat-Modell',
  'step.heartbeat.body': 'Smart EDMS meldet sich regelmäßig beim Lizenzserver. Wenn der Server nicht erreichbar ist — z. B. weil Sie offline sind — arbeitet das System normal weiter. Heartbeat-Fehler blockieren niemals den Zugriff.',

  'step.offline.title': 'Offline arbeiten',
  'step.offline.body': 'Smart EDMS ist für Offline-Betrieb ausgelegt. Sie können wochenlang arbeiten, ohne den Lizenzserver zu kontaktieren. Wenn die Verbindung zurückkehrt, wird der Heartbeat automatisch fortgesetzt.',

  'step.renew.title': 'Wie verlängern',
  'step.renew.body': 'Die Verlängerung erfordert nur einen Klick. Sie können online mit einer Zahlungsmethode verlängern oder eine .sedmslic-Lizenzdatei importieren, die Sie von Ihrem Account Manager erhalten haben.',

  'step.import.title': 'Lizenzdatei importieren',
  'step.import.body': 'Eine .sedmslic-Datei ist eine signierte Lizenzdatei. Importieren Sie sie von der Lizenzseite, um Ihre Lizenz zu aktivieren oder zu verlängern. Die Datei wird gegen die Kennung Ihrer Organisation geprüft.',

  'step.export.title': 'Anfragedatei exportieren',
  'step.export.body': 'Für air-gapped Installationen erzeugen Sie eine .sedmsreq-Anfragedatei. Senden Sie sie an Ihren Account Manager, der Ihnen eine .sedmslic-Datei zurücksendet.',

  'step.noAlarm.title': 'Keine Überraschungen, keine Alarme',
  'step.noAlarm.body': 'Smart EDMS sperrt Sie nie ohne Vorwarnung aus. Jede Zustandsänderung wird im Voraus angekündigt, und Ihre Daten sind immer sicher.',

  'step.adminRole.title': 'Wer sieht was',
  'step.adminRole.body': 'Der Lizenzstatus ist für Administratoren sichtbar. Normale Benutzer sehen nur einen kleinen, schließbaren Banner, wenn die Verlängerung ansteht — sie werden nie beunruhigt.',

  'step.dataSafety.title': 'Ihre Daten sind sicher',
  'step.dataSafety.body': 'Kein Lizenzzustand löscht jemals Ihre Dokumente. Auch wenn die Lizenz widerrufen wird, bleiben Ihre Daten intakt und lassen sich exportieren.',

  'completion.title': 'Sie verstehen das Lizenzmodell',
  'completion.body': 'Sie wissen nun, was jeder Lizenzzustand bedeutet und wie Sie verlängern. Machen Sie die Scanner-Tour, um mehr über die Papierdigitalisierung zu erfahren.',
  'completion.next': 'Scanner-Tour starten',

  'checklist.title': 'Checkliste der Lizenz-Tour',
  'checklist.item.viewStatus': 'Zeigen Sie Ihren aktuellen Lizenzstatus an',
  'checklist.item.checkExpiry': 'Prüfen Sie das Ablaufdatum',
  'checklist.item.identifyRenewal': 'Identifizieren Sie die Schaltfläche „Verlängern“',
  'checklist.item.findImport': 'Finden Sie die .sedmslic-Importoption',
  'checklist.item.findExport': 'Finden Sie die .sedmsreq-Exportoption',
} as const;

export default license;
