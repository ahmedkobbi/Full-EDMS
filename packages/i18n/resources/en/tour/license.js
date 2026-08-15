"use strict";
/**
 * @smart-edms/i18n — English baseline: `tour.license` namespace (spec §16.4, §4.4)
 *
 * Walks the user through the six license states in calm, non-alarming
 * language per spec §4.4.
 *
 * REVIEW: Compliance-relevant content. English baseline is written by a
 * senior engineer but should be reviewed by a native English-speaking
 * licensing specialist before production rollout.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tourLicense = {
    'title': 'License tour',
    'subtitle': 'Understand your license status and what each state means.',
    'step.intro.title': 'Your license, simply explained',
    'step.intro.body': 'Smart EDMS uses a calm, predictable license model. This tour walks you through each state so you know what to expect — and what not to worry about.',
    'step.overview.title': 'License overview',
    'step.overview.body': 'From the License page you can see your current status, when your license expires, how many users and how much storage you have used, and which modules are enabled.',
    'step.state.valid.title': 'State 1: Active',
    'step.state.valid.body': 'When your license is active, everything works as expected. All features you’ve licensed are available. This is the normal, everyday state.',
    'step.state.expiringSoon.title': 'State 2: Renewal due soon',
    'step.state.expiringSoon.body': 'A few weeks before your license expires, you’ll see a gentle reminder. Nothing changes — everything keeps working. This is just a friendly nudge to renew when convenient.',
    'step.state.expiredGrace.title': 'State 3: Renewal in progress',
    'step.state.expiredGrace.body': 'If your license expires before renewal completes, you enter a grace period. The system continues to work fully. Your data is safe. Renew at your convenience.',
    'step.state.graceExhausted.title': 'State 4: Renewal required',
    'step.state.graceExhausted.body': 'If the grace period ends without renewal, write access is paused. You can still read documents and export data — you just can’t add or change anything. Renew to restore full access.',
    'step.state.extendedRemediation.title': 'State 5: Remediation in progress',
    'step.state.extendedRemediation.body': 'In rare cases — for example, a billing dispute or a prolonged connectivity issue — your license enters extended remediation. The system runs in a degraded state. Contact support to resolve.',
    'step.state.invalid.title': 'State 6: License not active',
    'step.state.invalid.body': 'If the license is revoked or never activated, the system is not active. Contact your administrator to restore access. Your data remains intact.',
    'step.heartbeat.title': 'The heartbeat model',
    'step.heartbeat.body': 'Smart EDMS periodically checks in with the license server. If it can’t reach the server — for example, you’re offline — the system keeps working normally. Heartbeat failures never block access.',
    'step.offline.title': 'Working offline',
    'step.offline.body': 'Smart EDMS is designed for offline operation. You can work without contacting the license server for weeks at a time. When connectivity returns, the heartbeat resumes automatically.',
    'step.renew.title': 'How to renew',
    'step.renew.body': 'Renewal takes one click. You can renew online with a payment method, or import a .sedmslic license file received from your account manager.',
    'step.import.title': 'Importing a license file',
    'step.import.body': 'A .sedmslic file is a signed license file. Import it from the License page to activate or extend your license. The file is verified against your organisation’s identifier.',
    'step.export.title': 'Exporting a request file',
    'step.export.body': 'For air-gapped installations, generate a .sedmsreq request file. Send it to your account manager, who will return a .sedmslic file.',
    'step.noAlarm.title': 'No surprises, no alarms',
    'step.noAlarm.body': 'Smart EDMS never locks you out without warning. Every state transition is announced in advance, and your data is always safe.',
    'step.adminRole.title': 'Who sees what',
    'step.adminRole.body': 'License status is visible to administrators. Regular users see only a small, dismissible banner when renewal is due — they are never alarmed.',
    'step.dataSafety.title': 'Your data is safe',
    'step.dataSafety.body': 'No license state ever deletes your documents. Even if the license is revoked, your data remains intact and can be exported.',
    'completion.title': 'You understand the license model',
    'completion.body': 'You now know what each license state means and how to renew. Take the Scanner tour to learn about paper digitization.',
    'completion.next': 'Take the Scanner tour',
    'checklist.title': 'License tour checklist',
    'checklist.item.viewStatus': 'View your current license status',
    'checklist.item.checkExpiry': 'Check the expiry date',
    'checklist.item.identifyRenewal': 'Identify the renewal button',
    'checklist.item.findImport': 'Find the .sedmslic import option',
    'checklist.item.findExport': 'Find the .sedmsreq export option',
};
exports.default = tourLicense;
//# sourceMappingURL=license.js.map