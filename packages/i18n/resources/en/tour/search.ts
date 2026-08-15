/**
 * @smart-edms/i18n — English baseline: `tour.search` namespace (spec §16.4)
 */

const tourSearch = {
  'title': 'Search tour',
  'subtitle': 'Find any document in seconds.',

  'step.intro.title': 'Search smarter',
  'step.intro.body': 'This tour shows you how to find anything — by name, content, metadata, or tags.',

  'step.searchbar.title': 'The search bar',
  'step.searchbar.body': 'Start typing here to search across document names, content (including OCR text), and metadata. Results update as you type.',

  'step.filters.title': 'Filters',
  'step.filters.body': 'Use the filters panel to narrow by file type, classification, tag, owner, or date range.',

  'step.advanced.title': 'Advanced search',
  'step.advanced.body': 'For complex queries, open the advanced search builder. You can compose multiple conditions and group them with AND / OR.',

  'step.fullText.title': 'Full-text search',
  'step.fullText.body': 'Full-text search finds documents containing your terms anywhere in the content. Highlights show exactly where the match is.',

  'step.saved.title': 'Saved searches',
  'step.saved.body': 'Run the same search often? Save it. You can even schedule a saved search to run daily and email you the results.',

  'step.recent.title': 'Recent searches',
  'step.recent.body': 'Your recent searches appear here so you can quickly rerun something you just did.',

  'step.facets.title': 'Facets',
  'step.facets.body': 'The facets sidebar shows you the breakdown of results by type, classification, owner, and more. Click a facet to refine.',

  'step.sort.title': 'Sorting',
  'step.sort.body': 'Sort results by relevance, date, name, or size. Relevance uses a full-text ranking algorithm.',

  'step.flex.title': 'Flex search',
  'step.flex.body': 'Flex search lets you search across multiple tenants or document stores at once — useful for investigations and audits.',

  'completion.title': 'You’re a search expert',
  'completion.body': 'You can now find anything in Smart EDMS. Take the Audit tour to learn about the tamper-evident log.',
  'completion.next': 'Take the Audit tour',
} as const;

export default tourSearch;
