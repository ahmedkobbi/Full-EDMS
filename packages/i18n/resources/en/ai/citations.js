"use strict";
/**
 * @smart-edms/i18n — English baseline: `ai.citations` namespace (spec §16.4)
 *
 * Citation UI: how AI responses cite their sources.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const aiCitations = {
    'title': 'Citations',
    'subtitle': 'Sources the AI used to produce this response.',
    'empty': 'No citations. The response is based on the AI’s general knowledge and may be less reliable.',
    'count': '{count, plural, one {# citation} other {# citations}}',
    'view': 'View citation',
    'viewDocument': 'Open document',
    'viewPassage': 'Open at passage',
    'card.title': 'Source',
    'card.document': 'Document',
    'card.passage': 'Passage',
    'card.page': 'Page {{page}}',
    'card.confidence': 'Confidence: {{percent}}%',
    'card.matchType': 'Match type',
    'card.matchType.exact': 'Exact quote',
    'card.matchType.paraphrase': 'Paraphrased',
    'card.matchType.summary': 'Summarised',
    'card.matchType.inferred': 'Inferred from context',
    'card.snippet': 'Cited passage',
    'card.openDocument': 'Open document',
    'card.copyCitation': 'Copy citation',
    'list.title': 'All citations',
    'list.subtitle': 'Every source the AI consulted.',
    'list.sortBy': 'Sort by',
    'list.sortBy.confidence': 'Confidence',
    'list.sortBy.location': 'Document order',
    'list.sortBy.matchType': 'Match type',
    'verify.title': 'Verify citation',
    'verify.subtitle': 'Check that the cited passage actually supports the AI’s claim.',
    'verify.match': 'Citation verified — the passage supports the claim.',
    'verify.mismatch': 'Citation mismatch — the passage does not appear to support the claim.',
    'verify.report': 'Report mismatch',
    'verify.report.placeholder': 'Describe the mismatch',
    'blocked.title': 'Blocked citation',
    'blocked.subtitle': 'The AI attempted to cite a document you do not have access to.',
    'blocked.body': 'For your security, citations are limited to documents you can access. The blocked citation has been removed from the response.',
    'footnote.format': '[{{n}}] {{document}}, page {{page}}',
    'footnote.format.noPage': '[{{n}}] {{document}}',
    'inlineCitation': '[{{n}}]',
    'inlineCitationList': 'Sources: {{list}}',
    'export.title': 'Export citations',
    'export.subtitle': 'Download the list of citations for this response.',
    'export.format.bibtex': 'BibTeX',
    'export.format.ris': 'RIS',
    'export.format.json': 'JSON',
    'export.format.csv': 'CSV',
    'export.success': 'Citations exported.',
    'disclaimer': 'Citations show where the AI found information. They do not guarantee the response is correct — always verify important details.',
    'disclaimer.short': 'Citations are pointers, not guarantees.',
};
exports.default = aiCitations;
//# sourceMappingURL=citations.js.map