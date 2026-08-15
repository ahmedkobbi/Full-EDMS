"use strict";
/**
 * @smart-edms/i18n — zh-CN translation: `provenance` namespace.
 *
 * Source of truth: en/provenance.ts
 * Translated from the English baseline.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const provenance = {
    title: 'Provenance', // falls back to English
    subtitle: 'Cryptographic evidence of where a document came from and how it has been modified.', // falls back to English
    'tab.manifest': 'C2PA manifest', // falls back to English
    'tab.chainOfCustody': 'Chain of custody', // falls back to English
    'tab.evidence': 'Evidence package', // falls back to English
    'tab.forgery': 'Forgery detection', // falls back to English
    'manifest.title': 'C2PA manifest', // falls back to English
    'manifest.subtitle': 'Content credentials embedded in the document per the C2PA standard.', // falls back to English
    'manifest.empty': 'No C2PA manifest found in this document.', // falls back to English
    'manifest.issuer': 'Issuer', // falls back to English
    'manifest.issuedAt': 'Issued at', // falls back to English
    'manifest.claims': 'Claims', // falls back to English
    'manifest.assertions': 'Assertions', // falls back to English
    'manifest.signature': 'Signature', // falls back to English
    'manifest.signature.valid': 'Signature valid', // falls back to English
    'manifest.signature.invalid': 'Signature invalid', // falls back to English
    'manifest.signature.unknown': 'Signature could not be verified', // falls back to English
    'manifest.verified': 'C2PA manifest verified. Content credentials are authentic.', // falls back to English
    'manifest.tampered': 'C2PA manifest verification failed: the document has been modified after signing.', // falls back to English
    'manifest.download': 'Download manifest', // falls back to English
    'manifest.embed': 'Embed manifest', // falls back to English
    'manifest.embed.success': 'C2PA manifest embedded.', // falls back to English
    'manifest.embed.failed': 'Failed to embed C2PA manifest: {{reason}}', // falls back to English
    'manifest.assertion.created': 'Document created', // falls back to English
    'manifest.assertion.modified': 'Document modified', // falls back to English
    'manifest.assertion.converted': 'Format converted', // falls back to English
    'manifest.assertion.redacted': 'Content redacted', // falls back to English
    'manifest.assertion.annotated': 'Annotations added', // falls back to English
    'manifest.assertion.signed': 'Document signed', // falls back to English
    'manifest.assertion.classified': 'Classification applied', // falls back to English
    'manifest.assertion.ocrExtracted': 'OCR text extracted', // falls back to English
    'manifest.assertion.aiGenerated': 'AI-generated content', // falls back to English
    'manifest.assertion.aiModified': 'AI-assisted edit', // falls back to English
    'chainOfCustody.title': 'Chain of custody', // falls back to English
    'chainOfCustody.subtitle': 'Every transfer of possession is recorded.', // falls back to English
    'chainOfCustody.empty': 'No chain-of-custody entries.', // falls back to English
    'chainOfCustody.column.timestamp': 'Timestamp', // falls back to English
    'chainOfCustody.column.from': 'From', // falls back to English
    'chainOfCustody.column.to': 'To', // falls back to English
    'chainOfCustody.column.reason': 'Reason', // falls back to English
    'chainOfCustody.column.method': 'Transfer method', // falls back to English
    'chainOfCustody.column.hash': 'Document hash', // falls back to English
    'chainOfCustody.method.upload': 'Upload', // falls back to English
    'chainOfCustody.method.email': 'Email', // falls back to English
    'chainOfCustody.method.physical': 'Physical transfer', // falls back to English
    'chainOfCustody.method.share': 'Share link', // falls back to English
    'chainOfCustody.method.export': 'Export', // falls back to English
    'chainOfCustody.method.intake': 'Intake', // falls back to English
    'chainOfCustody.add': 'Add entry', // falls back to English
    'chainOfCustody.export': 'Export chain of custody', // falls back to English
    'chainOfCustody.export.format.pdf': 'PDF (signed)', // falls back to English
    'chainOfCustody.export.format.csv': 'CSV', // falls back to English
    'chainOfCustody.continuous': 'Chain of custody is continuous: no gaps detected.', // falls back to English
    'chainOfCustody.gap': 'Gap detected between {{from}} and {{to}}. Investigate.', // falls back to English
    'evidence.title': 'Evidence package', // falls back to English
    'evidence.subtitle': 'A signed bundle containing the document, its provenance manifest, the chain of custody, and the relevant audit events.', // falls back to English
    'evidence.create': 'Create evidence package', // falls back to English
    'evidence.name': 'Package name', // falls back to English
    'evidence.description': 'Description', // falls back to English
    'evidence.scope': 'Scope', // falls back to English
    'evidence.scope.document': 'Single document', // falls back to English
    'evidence.scope.batch': 'Digitization batch', // falls back to English
    'evidence.scope.folder': 'Folder', // falls back to English
    'evidence.scope.query': 'Documents matching a query', // falls back to English
    'evidence.includeAuditEvents': 'Include audit events', // falls back to English
    'evidence.includeChainOfCustody': 'Include chain of custody', // falls back to English
    'evidence.includeManifests': 'Include C2PA manifests', // falls back to English
    'evidence.includeOcr': 'Include OCR text', // falls back to English
    'evidence.includeVersions': 'Include all versions', // falls back to English
    'evidence.sign': 'Sign package', // falls back to English
    'evidence.signingKey': 'Signing key', // falls back to English
    'evidence.created': 'Evidence package created and signed.', // falls back to English
    'evidence.download': 'Download package', // falls back to English
    'evidence.verify': 'Verify package', // falls back to English
    'evidence.verified': 'Evidence package verified. All signatures are valid.', // falls back to English
    'evidence.invalid': 'Evidence package verification failed: {{reason}}', // falls back to English
    'evidence.size': 'Package size: {{size}}', // falls back to English
    'evidence.empty': 'No evidence packages.', // falls back to English
    'forgery.title': 'Forgery detection', // falls back to English
    'forgery.subtitle': 'Detect tampering and AI-generated forgeries in documents.', // falls back to English
    'forgery.run': 'Run forgery detection', // falls back to English
    'forgery.running': 'Analysing document…', // falls back to English
    'forgery.verdict.clean': 'No signs of tampering detected.', // falls back to English
    'forgery.verdict.suspicious': 'Some anomalies were detected. Review recommended.', // falls back to English
    'forgery.verdict.tampered': 'Tampering detected. Document integrity cannot be guaranteed.', // falls back to English
    'forgery.verdict.aiGenerated': 'Document appears to be AI-generated.', // falls back to English
    'forgery.verdict.unknown': 'Could not determine document integrity.', // falls back to English
    'forgery.signal.pixelAnomaly': 'Pixel-level anomalies detected in region {{region}}', // falls back to English
    'forgery.signal.metadataMismatch': 'Metadata does not match file content', // falls back to English
    'forgery.signal.signatureMissing': 'Expected signature is missing', // falls back to English
    'forgery.signal.signatureInvalid': 'Signature is invalid', // falls back to English
    'forgery.signal.aiFingerprint': 'AI generation fingerprint detected', // falls back to English
    'forgery.signal.resavingArtifacts': 'Multiple resaving artifacts detected', // falls back to English
    'forgery.signal.cloneDetection': 'Cloned regions detected', // falls back to English
    'forgery.signal.splicingDetected': 'Image splicing detected', // falls back to English
    'forgery.signal.exifInconsistent': 'EXIF metadata is inconsistent', // falls back to English
    'forgery.signal.c2paMissing': 'No C2PA manifest present', // falls back to English
    'forgery.signal.c2paBroken': 'C2PA manifest is broken or invalid', // falls back to English
    'forgery.confidence': 'Confidence: {{percent}}%', // falls back to English
    'forgery.report': 'View full report', // falls back to English
    'forgery.report.download': 'Download report', // falls back to English
    'forgery.disclaimer': 'Forgery detection is probabilistic. A human reviewer should always make the final determination.', // falls back to English
    'manifest.assertion.dcterms.title': 'Dublin Core metadata', // falls back to English
    'manifest.assertion.dcterms.creator': 'Creator', // falls back to English
    'manifest.assertion.dcterms.description': 'Description', // falls back to English
    'manifest.assertion.dcterms.rights': 'Rights', // falls back to English
    'manifest.assertion.exif.title': 'EXIF metadata', // falls back to English
    'manifest.assertion.exif.cameraMake': 'Camera make', // falls back to English
    'manifest.assertion.exif.cameraModel': 'Camera model', // falls back to English
    'manifest.assertion.exif.software': 'Software', // falls back to English
    'manifest.assertion.exif.timestamp': 'Capture timestamp', // falls back to English
};
exports.default = provenance;
//# sourceMappingURL=provenance.js.map