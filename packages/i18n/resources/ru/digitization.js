"use strict";
/**
 * @smart-edms/i18n — ru translation: `digitization` namespace.
 *
 * Source of truth: en/digitization.ts
 * Translated from the English baseline.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const digitization = {
    title: 'Digitization', // falls back to English
    subtitle: 'Convert paper documents into searchable digital records.', // falls back to English
    'tab.batches': 'Batches', // falls back to English
    'tab.captureRules': 'Capture rules', // falls back to English
    'tab.verification': 'Human verification', // falls back to English
    'tab.throughput': 'Throughput', // falls back to English
    'batch.title': 'Digitization batches', // falls back to English
    'batch.subtitle': 'A batch groups pages scanned in a single session.', // falls back to English
    'batch.create': 'New batch', // falls back to English
    'batch.name': 'Batch name', // falls back to English
    'batch.description': 'Description', // falls back to English
    'batch.profile': 'Capture profile', // falls back to English
    'batch.operator': 'Operator', // falls back to English
    'batch.scanner': 'Scanner', // falls back to English
    'batch.startedAt': 'Started', // falls back to English
    'batch.completedAt': 'Completed', // falls back to English
    'batch.pages': 'Pages', // falls back to English
    'batch.documents': 'Documents extracted', // falls back to English
    'batch.status.draft': 'Draft', // falls back to English
    'batch.status.scanning': 'Scanning', // falls back to English
    'batch.status.processing': 'Processing', // falls back to English
    'batch.status.review': 'Awaiting review', // falls back to English
    'batch.status.completed': 'Completed', // falls back to English
    'batch.status.failed': 'Failed', // falls back to English
    'batch.status.cancelled': 'Cancelled', // falls back to English
    'batch.empty': 'No batches yet.', // falls back to English
    'batch.cancel': 'Cancel batch', // falls back to English
    'batch.cancel.confirm': 'Cancel batch "{{name}}"? Any unprocessed pages will be discarded.', // falls back to English
    'batch.delete': 'Delete batch', // falls back to English
    'batch.delete.confirm': 'Delete batch "{{name}}"? This cannot be undone.', // falls back to English
    'batch.resume': 'Resume batch', // falls back to English
    'batch.duplicate': 'Duplicate batch', // falls back to English
    'batch.export': 'Export batch', // falls back to English
    'batch.pages.count': '{count, plural, one {# page} other {# pages}}', // falls back to English
    'batch.documents.count': '{count, plural, one {# document} other {# documents}}', // falls back to English
    'captureRule.title': 'Capture rules', // falls back to English
    'captureRule.subtitle': 'Define how raw scans are split into documents and how metadata is extracted.', // falls back to English
    'captureRule.create': 'Create rule', // falls back to English
    'captureRule.name': 'Rule name', // falls back to English
    'captureRule.description': 'Description', // falls back to English
    'captureRule.trigger': 'Apply rule when', // falls back to English
    'captureRule.trigger.pageCount': 'Page count reaches', // falls back to English
    'captureRule.trigger.barcode': 'Barcode detected', // falls back to English
    'captureRule.trigger.blankPage': 'Blank page detected', // falls back to English
    'captureRule.trigger.documentType': 'Document type detected', // falls back to English
    'captureRule.trigger.keyword': 'Keyword detected', // falls back to English
    'captureRule.action': 'Action', // falls back to English
    'captureRule.action.splitDocument': 'Split into new document', // falls back to English
    'captureRule.action.assignType': 'Assign document type', // falls back to English
    'captureRule.action.assignMetadata': 'Extract metadata', // falls back to English
    'captureRule.action.classify': 'Classify document', // falls back to English
    'captureRule.action.routeToFolder': 'Move to folder', // falls back to English
    'captureRule.action.routeToWorkflow': 'Start workflow', // falls back to English
    'captureRule.action.requireVerification': 'Require human verification', // falls back to English
    'captureRule.empty': 'No capture rules defined.', // falls back to English
    'captureRule.delete.confirm': 'Delete rule "{{name}}"?', // falls back to English
    'captureRule.priority': 'Priority', // falls back to English
    'captureRule.enabled': 'Enabled', // falls back to English
    'verification.title': 'Human verification queue', // falls back to English
    'verification.subtitle': 'Pages and fields that need a human eye before they can be committed.', // falls back to English
    'verification.empty': 'No items awaiting verification.', // falls back to English
    'verification.column.page': 'Page', // falls back to English
    'verification.column.field': 'Field', // falls back to English
    'verification.column.value': 'Extracted value', // falls back to English
    'verification.column.confidence': 'Confidence', // falls back to English
    'verification.column.batch': 'Batch', // falls back to English
    'verification.approve': 'Approve', // falls back to English
    'verification.edit': 'Edit value', // falls back to English
    'verification.reject': 'Reject and reprocess', // falls back to English
    'verification.approveAll': 'Approve all in batch', // falls back to English
    'verification.approveAll.confirm': 'Approve all {{count}} items in this batch?', // falls back to English
    'verification.success': 'Verified and committed.', // falls back to English
    'verification.reject.confirm': 'Reject this extraction? The page will be reprocessed.', // falls back to English
    'verification.lowConfidence': 'Low confidence — review required', // falls back to English
    'verification.mediumConfidence': 'Medium confidence — review recommended', // falls back to English
    'verification.highConfidence': 'High confidence — auto-approved', // falls back to English
    'verification.threshold.title': 'Confidence thresholds', // falls back to English
    'verification.threshold.description': 'Pages below the low threshold always require verification; pages above the high threshold are auto-approved.', // falls back to English
    'verification.threshold.low': 'Low threshold', // falls back to English
    'verification.threshold.high': 'High threshold', // falls back to English
    'ocr.title': 'OCR', // falls back to English
    'ocr.subtitle': 'Optical character recognition extracts text from scanned pages.', // falls back to English
    'ocr.language': 'OCR language', // falls back to English
    'ocr.language.multi': 'Multiple languages', // falls back to English
    'ocr.confidence': 'Confidence: {{percent}}%', // falls back to English
    'ocr.reprocess': 'Re-run OCR', // falls back to English
    'ocr.reprocess.confirm': 'Re-run OCR on {count, plural, one {# page} other {# pages}}? Existing OCR text will be replaced.', // falls back to English
    'ocr.review': 'Review OCR text', // falls back to English
    'ocr.fix': 'Fix OCR text', // falls back to English
    'ocr.export': 'Export OCR text', // falls back to English
    'ocr.autoRotate': 'Auto-rotate pages', // falls back to English
    'ocr.deskew': 'Deskew images', // falls back to English
    'ocr.denoise': 'Denoise images', // falls back to English
    'ocr.binary': 'Binarize (black & white)', // falls back to English
    'omr.title': 'OMR', // falls back to English
    'omr.subtitle': 'Optical mark recognition detects checkboxes and filled bubbles.', // falls back to English
    'omr.fields': 'Detected fields', // falls back to English
    'omr.review': 'Review OMR', // falls back to English
    'omr.template': 'OMR template', // falls back to English
    'omr.template.upload': 'Upload template', // falls back to English
    'omr.confidence': 'Confidence: {{percent}}%', // falls back to English
    'icr.title': 'ICR', // falls back to English
    'icr.subtitle': 'Intelligent character recognition reads handwritten text.', // falls back to English
    'icr.review': 'Review ICR', // falls back to English
    'icr.confidence': 'Confidence: {{percent}}%', // falls back to English
    'icr.disclaimer': 'ICR is less accurate than OCR for printed text. Always review handwritten fields.', // falls back to English
    'barcode.title': 'Barcode detection', // falls back to English
    'barcode.subtitle': 'Detect barcodes and QR codes on scanned pages.', // falls back to English
    'barcode.detected': 'Barcode detected: {{value}}', // falls back to English
    'barcode.empty': 'No barcodes detected on this page.', // falls back to English
    'barcode.types': 'Supported types', // falls back to English
    'barcode.types.qr': 'QR code', // falls back to English
    'barcode.types.code128': 'Code 128', // falls back to English
    'barcode.types.code39': 'Code 39', // falls back to English
    'barcode.types.ean13': 'EAN-13', // falls back to English
    'barcode.types.ean8': 'EAN-8', // falls back to English
    'barcode.types.upc': 'UPC-A', // falls back to English
    'barcode.types.pdf417': 'PDF417', // falls back to English
    'barcode.types.datamatrix': 'Data Matrix', // falls back to English
    'throughput.title': 'Throughput', // falls back to English
    'throughput.subtitle': 'How many pages per hour are being processed.', // falls back to English
    'throughput.pagesPerHour': '{{count}} pages / hour', // falls back to English
    'throughput.documentsPerHour': '{{count}} documents / hour', // falls back to English
    'throughput.errorRate': 'Error rate: {{percent}}%', // falls back to English
    'throughput.averageConfidence': 'Average OCR confidence: {{percent}}%', // falls back to English
    'throughput.queueDepth': 'Queue depth: {count, plural, one {# page} other {# pages}}', // falls back to English
    'throughput.estimatedTime': 'Estimated time to clear queue: {{duration}}', // falls back to English
};
exports.default = digitization;
//# sourceMappingURL=digitization.js.map