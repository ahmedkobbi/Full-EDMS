"use strict";
/**
 * @smart-edms/i18n — English baseline: `tour.workflows` namespace (spec §16.4)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tourWorkflows = {
    'title': 'Workflows tour',
    'subtitle': 'Automate approvals, reviews, and signatures.',
    'step.intro.title': 'Workflows that don’t break',
    'step.intro.body': 'This tour shows you how to create, run, and approve workflows. Smart EDMS workflows are durable — they survive server restarts.',
    'step.definitions.title': 'Workflow definitions',
    'step.definitions.body': 'A workflow definition is the template. It describes the steps, who needs to approve, and what happens at each branch.',
    'step.bpmn.title': 'BPMN, CMMN, and DMN',
    'step.bpmn.body': 'Smart EDMS supports BPMN for processes, CMMN for cases, and DMN for decision tables. You can import existing BPMN XML or design visually.',
    'step.durable.title': 'Durable execution',
    'step.durable.body': 'When a workflow is durable, its state is persisted after every step. If the server crashes mid-workflow, it picks up where it left off.',
    'step.triggers.title': 'Triggers',
    'step.triggers.body': 'Workflows can start manually, on document upload, on metadata change, on a schedule, or from an external event.',
    'step.approval.title': 'Approval steps',
    'step.approval.body': 'Approval steps route to a user or a group. You can require a comment, set a due date, and configure automatic escalation if no one acts.',
    'step.signature.title': 'Signature steps',
    'step.signature.body': 'Signature steps capture an electronic, digital (PKI), or qualified electronic signature (eIDAS) on the document.',
    'step.parallel.title': 'Parallel branches',
    'step.parallel.body': 'Run multiple steps at the same time and join the results. Useful when several departments need to review independently.',
    'step.delegation.title': 'Delegation and escalation',
    'step.delegation.body': 'Need to hand off a step? Delegate it. Step overdue? Configure automatic escalation to a manager.',
    'step.ai.title': 'AI assistance',
    'step.ai.body': 'The AI assistant can draft an approval path for you. You review and adjust before publishing — AI never publishes workflows on its own.',
    'step.instances.title': 'Workflow instances',
    'step.instances.body': 'Each time a workflow runs, it’s an instance. You can see active, completed, and failed instances from the workflows dashboard.',
    'step.history.title': 'Audit trail',
    'step.history.body': 'Every workflow event — start, approval, rejection, completion — is recorded in the audit log.',
    'completion.title': 'You’re ready to automate',
    'completion.body': 'You now know how to create and run workflows. Take the Sharing tour to learn about external collaboration.',
    'completion.next': 'Take the Sharing tour',
};
exports.default = tourWorkflows;
//# sourceMappingURL=workflows.js.map