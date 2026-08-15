/**
 * @smart-edms/i18n — English baseline: `tour.documents` namespace (spec §16.4)
 */

const tourDocuments = {
  'title': 'Documents tour',
  'subtitle': 'Master the document library in 5 minutes.',

  'step.intro.title': 'Working with documents',
  'step.intro.body': 'This tour covers uploading, previewing, organising, and sharing documents.',

  'step.library.title': 'The document library',
  'step.library.body': 'This is your document library. Use the toolbar to switch between grid and list views, sort, and filter.',

  'step.upload.title': 'Uploading documents',
  'step.upload.body': 'Drag files anywhere on the library, or click Upload to browse. Large files are uploaded in chunks and resume automatically if your connection drops.',

  'step.versions.title': 'Version history',
  'step.versions.body': 'Every document keeps a full version history. You can compare versions, restore old ones, and add a note describing what changed.',

  'step.preview.title': 'Preview',
  'step.preview.body': 'Click any document to open a preview. You can zoom, rotate, and search within the document without downloading it.',

  'step.metadata.title': 'Metadata',
  'step.metadata.body': 'Each document has structured metadata — fields like author, date, contract number. You can edit metadata inline and search by any field.',

  'step.classification.title': 'Classification',
  'step.classification.body': 'Every document carries a classification label that controls who can see it, share it, and download it.',

  'step.folders.title': 'Folders',
  'step.folders.body': 'Organise documents into folders. Folders can have their own metadata schemas and permissions.',

  'step.tags.title': 'Tags',
  'step.tags.body': 'Tags are a flexible way to group documents across folders. Add as many as you like.',

  'step.comments.title': 'Comments and mentions',
  'step.comments.body': 'Comment on documents and @-mention colleagues to bring them into the conversation.',

  'step.checkout.title': 'Check out a document',
  'step.checkout.body': 'When you need to make changes without others editing at the same time, check the document out. Others will see it’s locked by you.',

  'step.sharing.title': 'Sharing',
  'step.sharing.body': 'Share documents with specific people or create a shareable link with optional expiry, password, and watermark.',

  'step.ocr.title': 'OCR',
  'step.ocr.body': 'OCR runs automatically on image PDFs. The extracted text becomes searchable and you can copy it out for use elsewhere.',

  'step.recycleBin.title': 'Recycle bin',
  'step.recycleBin.body': 'Deleted documents go to the recycle bin for 30 days. After that, they’re permanently removed — unless a retention schedule or legal hold keeps them longer.',

  'completion.title': 'You’re a documents pro',
  'completion.body': 'You now know how to upload, organise, preview, and share documents. Take the Workflows tour to learn about approvals and signatures.',
  'completion.next': 'Take the Workflows tour',
} as const;

export default tourDocuments;
