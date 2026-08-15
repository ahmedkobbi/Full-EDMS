"use strict";
/**
 * @smart-edms/i18n — zh-CN translation: `tour.workflows` namespace.
 *
 * Source of truth: en/tour/workflows.ts
 * Translated from the English baseline.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const workflows = {
    title: 'Workflows tour', // falls back to English
    subtitle: 'Automate approvals, reviews, and signatures.', // falls back to English
    'step.intro.title': 'Workflows that don’t break', // falls back to English
    'step.intro.body': 'This tour shows you how to create, run, and approve workflows. Smart EDMS workflows are durable — they survive server restarts.', // falls back to English
    'step.definitions.title': 'Workflow definitions', // falls back to English
    'step.definitions.body': 'A workflow definition is the template. It describes the steps, who needs to approve, and what happens at each branch.', // falls back to English
    'step.bpmn.title': 'BPMN, CMMN, and DMN', // falls back to English
    'step.bpmn.body': 'Smart EDMS supports BPMN for processes, CMMN for cases, and DMN for decision tables. You can import existing BPMN XML or design visually.', // falls back to English
    'step.durable.title': 'Durable execution', // falls back to English
    'step.durable.body': 'When a workflow is durable, its state is persisted after every step. If the server crashes mid-workflow, it picks up where it left off.', // falls back to English
    'step.triggers.title': 'Triggers', // falls back to English
    'step.triggers.body': 'Workflows can start manually, on document upload, on metadata change, on a schedule, or from an external event.', // falls back to English
    'step.approval.title': 'Approval steps', // falls back to English
    'step.approval.body': 'Approval steps route to a user or a group. You can require a comment, set a due date, and configure automatic escalation if no one acts.', // falls back to English
    'step.signature.title': 'Signature steps', // falls back to English
    'step.signature.body': 'Signature steps capture an electronic, digital (PKI), or qualified electronic signature (eIDAS) on the document.', // falls back to English
    'step.parallel.title': 'Parallel branches', // falls back to English
    'step.parallel.body': 'Run multiple steps at the same time and join the results. Useful when several departments need to review independently.', // falls back to English
    'step.delegation.title': 'Delegation and escalation', // falls back to English
    'step.delegation.body': 'Need to hand off a step? Delegate it. Step overdue? Configure automatic escalation to a manager.', // falls back to English
    'step.ai.title': 'AI assistance', // falls back to English
    'step.ai.body': 'The AI assistant can draft an approval path for you. You review and adjust before publishing — AI never publishes workflows on its own.', // falls back to English
    'step.instances.title': 'Workflow instances', // falls back to English
    'step.instances.body': 'Each time a workflow runs, it’s an instance. You can see active, completed, and failed instances from the workflows dashboard.', // falls back to English
    'step.history.title': 'Audit trail', // falls back to English
    'step.history.body': 'Every workflow event — start, approval, rejection, completion — is recorded in the audit log.', // falls back to English
    'completion.title': 'You’re ready to automate', // falls back to English
    'completion.body': 'You now know how to create and run workflows. Take the Sharing tour to learn about external collaboration.', // falls back to English
    'completion.next': 'Take the Sharing tour', // falls back to English
};
exports.default = workflows;
//# sourceMappingURL=workflows.js.map