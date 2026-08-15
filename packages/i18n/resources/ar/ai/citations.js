"use strict";
/**
 * @smart-edms/i18n — ar translation: `ai.citations` namespace.
 *
 * Source of truth: en/ai/citations.ts
 * Translated from the English baseline.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const citations = {
    title: 'Citations', // falls back to English
    subtitle: 'Sources the AI used to produce this response.', // falls back to English
    empty: 'No citations. The response is based on the AI’s general knowledge and may be less reliable.', // falls back to English
    count: '{count, plural, one {# citation} other {# citations}}', // falls back to English
    view: 'View citation', // falls back to English
    viewDocument: 'Open document', // falls back to English
    viewPassage: 'Open at passage', // falls back to English
    'card.title': 'Source', // falls back to English
    'card.document': 'Document', // falls back to English
    'card.passage': 'Passage', // falls back to English
    'card.page': 'Page {{page}}', // falls back to English
    'card.confidence': 'Confidence: {{percent}}%', // falls back to English
    'card.matchType': 'Match type', // falls back to English
    'card.matchType.exact': 'Exact quote', // falls back to English
    'card.matchType.paraphrase': 'Paraphrased', // falls back to English
    'card.matchType.summary': 'Summarised', // falls back to English
    'card.matchType.inferred': 'Inferred from context', // falls back to English
    'card.snippet': 'Cited passage', // falls back to English
    'card.openDocument': 'Open document', // falls back to English
    'card.copyCitation': 'Copy citation', // falls back to English
    'list.title': 'All citations', // falls back to English
    'list.subtitle': 'Every source the AI consulted.', // falls back to English
    'list.sortBy': 'Sort by', // falls back to English
    'list.sortBy.confidence': 'Confidence', // falls back to English
    'list.sortBy.location': 'Document order', // falls back to English
    'list.sortBy.matchType': 'Match type', // falls back to English
    'verify.title': 'Verify citation', // falls back to English
    'verify.subtitle': 'Check that the cited passage actually supports the AI’s claim.', // falls back to English
    'verify.match': 'Citation verified — the passage supports the claim.', // falls back to English
    'verify.mismatch': 'Citation mismatch — the passage does not appear to support the claim.', // falls back to English
    'verify.report': 'Report mismatch', // falls back to English
    'verify.report.placeholder': 'Describe the mismatch', // falls back to English
    'blocked.title': 'Blocked citation', // falls back to English
    'blocked.subtitle': 'The AI attempted to cite a document you do not have access to.', // falls back to English
    'blocked.body': 'For your security, citations are limited to documents you can access. The blocked citation has been removed from the response.', // falls back to English
    'footnote.format': '[{{n}}] {{document}}, page {{page}}', // falls back to English
    'footnote.format.noPage': '[{{n}}] {{document}}', // falls back to English
    inlineCitation: '[{{n}}]', // falls back to English
    inlineCitationList: 'Sources: {{list}}', // falls back to English
    'export.title': 'Export citations', // falls back to English
    'export.subtitle': 'Download the list of citations for this response.', // falls back to English
    'export.format.bibtex': 'BibTeX', // falls back to English
    'export.format.ris': 'RIS', // falls back to English
    'export.format.json': 'JSON', // falls back to English
    'export.format.csv': 'CSV', // falls back to English
    'export.success': 'Citations exported.', // falls back to English
    disclaimer: 'Citations show where the AI found information. They do not guarantee the response is correct — always verify important details.', // falls back to English
    'disclaimer.short': 'Citations are pointers, not guarantees.', // falls back to English
};
exports.default = citations;
//# sourceMappingURL=citations.js.map