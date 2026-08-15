/**
 * @smart-edms/i18n — ar translation: `documents` namespace.
 *
 * Source of truth: en/documents.ts
 * Translated from the English baseline.
 */

const documents = {
  'library.title': 'Document library',  // falls back to English
  'library.subtitle': 'All documents across your workspace.',  // falls back to English
  'library.empty.title': 'No documents yet',  // falls back to English
  'library.empty.subtitle': 'Upload your first document to get started.',  // falls back to English
  'library.empty.action': 'Upload document',  // falls back to English
  'library.view.grid': 'Grid view',  // falls back to English
  'library.view.list': 'List view',  // falls back to English
  'library.view.details': 'Details view',  // falls back to English
  'library.sort.name': 'Name',  // falls back to English
  'library.sort.dateCreated': 'Date created',  // falls back to English
  'library.sort.dateModified': 'Date modified',  // falls back to English
  'library.sort.size': 'Size',  // falls back to English
  'library.sort.author': 'Author',  // falls back to English
  'library.filter.type': 'File type',  // falls back to English
  'library.filter.classification': 'Classification',  // falls back to English
  'library.filter.tag': 'Tag',  // falls back to English
  'library.filter.dateRange': 'Date range',  // falls back to English
  'library.filter.owner': 'Owner',  // falls back to English
  'library.filter.status': 'Status',  // falls back to English
  'document.title': 'Document',  // falls back to English
  'document.name': 'Document name',  // falls back to English
  'document.type': 'Document type',  // falls back to English
  'document.size': 'File size',  // falls back to English
  'document.author': 'Author',  // falls back to English
  'document.owner': 'Owner',  // falls back to English
  'document.created': 'Created',  // falls back to English
  'document.modified': 'Last modified',  // falls back to English
  'document.accessed': 'Last accessed',  // falls back to English
  'document.version': 'Version',  // falls back to English
  'document.classification': 'Classification',  // falls back to English
  'document.tags': 'Tags',  // falls back to English
  'document.description': 'Description',  // falls back to English
  'document.status': 'Status',  // falls back to English
  'document.location': 'Location',  // falls back to English
  'document.checksum': 'Checksum',  // falls back to English
  'document.pages': 'Pages',  // falls back to English
  'document.language': 'Document language',  // falls back to English
  'document.source': 'Source',  // falls back to English
  'document.preview.title': 'Preview',  // falls back to English
  'document.preview.noPreview': 'No preview available for this file type.',  // falls back to English
  'document.preview.loading': 'Loading preview…',  // falls back to English
  'document.preview.downloadInstead': 'Download the file to view it.',  // falls back to English
  'document.preview.zoomIn': 'Zoom in',  // falls back to English
  'document.preview.zoomOut': 'Zoom out',  // falls back to English
  'document.preview.fitWidth': 'Fit width',  // falls back to English
  'document.preview.fitPage': 'Fit page',  // falls back to English
  'document.preview.rotate': 'Rotate',  // falls back to English
  'document.preview.page': 'Page {{current}} of {{total}}',  // falls back to English
  'document.upload.title': 'Upload documents',  // falls back to English
  'document.upload.subtitle': 'Drag and drop files or browse to upload.',  // falls back to English
  'document.upload.dropzone': 'Drop files here or click to browse',  // falls back to English
  'document.upload.dropzone.active': 'Drop files to upload',  // falls back to English
  'document.upload.browse': 'Browse files',  // falls back to English
  'document.upload.queue': 'Upload queue',  // falls back to English
  'document.upload.progress': 'Uploading {{name}}: {{percent}}%',  // falls back to English
  'document.upload.success': '{{name}} uploaded successfully.',  // falls back to English
  'document.upload.error.tooLarge': '{{name}} exceeds the maximum file size of {{max}}.',  // falls back to English
  'document.upload.error.unsafeType': '{{name}} has a file type that is not allowed.',  // falls back to English
  'document.upload.error.virus': '{{name}} was rejected by the antivirus scanner.',  // falls back to English
  'document.upload.error.quota': 'Uploading {{name}} would exceed your storage quota.',  // falls back to English
  'document.upload.error.network': 'Network error while uploading {{name}}.',  // falls back to English
  'document.upload.error.duplicate': 'A document with the same checksum already exists.',  // falls back to English
  'document.upload.ocrAuto': 'OCR will run automatically after upload.',  // falls back to English
  'document.upload.classificationAuto': 'Classification will be suggested automatically.',  // falls back to English
  'document.upload.retry': 'Retry upload',  // falls back to English
  'document.upload.cancel': 'Cancel upload',  // falls back to English
  'document.upload.pause': 'Pause',  // falls back to English
  'document.upload.resume': 'Resume',  // falls back to English
  'document.download.title': 'Download',  // falls back to English
  'document.download.original': 'Download original',  // falls back to English
  'document.download.pdf': 'Download as PDF',  // falls back to English
  'document.download.withAnnotations': 'Download with annotations',  // falls back to English
  'document.download.watermark': 'Download with watermark',  // falls back to English
  'document.download.watermark.text': 'Confidential — {{user}} — {{date}}',  // falls back to English
  'document.version.title': 'Version history',  // falls back to English
  'document.version.current': 'Current version',  // falls back to English
  'document.version.previous': 'Previous versions',  // falls back to English
  'document.version.upload': 'Upload new version',  // falls back to English
  'document.version.compare': 'Compare versions',  // falls back to English
  'document.version.restore': 'Restore this version',  // falls back to English
  'document.version.restored': 'Version {{version}} restored.',  // falls back to English
  'document.version.note.label': 'Version note',  // falls back to English
  'document.version.note.placeholder': 'Describe what changed',  // falls back to English
  'document.version.delete': 'Delete version',  // falls back to English
  'document.version.delete.confirm': 'Delete version {{version}}? This cannot be undone.',  // falls back to English
  'document.version.diff.added': 'Added',  // falls back to English
  'document.version.diff.removed': 'Removed',  // falls back to English
  'document.version.diff.changed': 'Changed',  // falls back to English
  'document.checkout.title': 'Checkout',  // falls back to English
  'document.checkout.button': 'Check out',  // falls back to English
  'document.checkout.button.undo': 'Check in',  // falls back to English
  'document.checkout.by': 'Checked out by {{user}}',  // falls back to English
  'document.checkout.at': 'Checked out on {{date}}',  // falls back to English
  'document.checkout.locked': 'This document is checked out by {{user}}. You cannot edit it until they check it back in.',  // falls back to English
  'document.checkout.cannotEdit': 'Document is checked out and locked for editing.',  // falls back to English
  'document.checkout.success': 'Document checked out. You can now edit it.',  // falls back to English
  'document.checkout.checkin.success': 'Document checked in.',  // falls back to English
  'document.comment.title': 'Comments',  // falls back to English
  'document.comment.placeholder': 'Write a comment…',  // falls back to English
  'document.comment.post': 'Post comment',  // falls back to English
  'document.comment.reply': 'Reply',  // falls back to English
  'document.comment.edit': 'Edit',  // falls back to English
  'document.comment.delete': 'Delete',  // falls back to English
  'document.comment.delete.confirm': 'Delete this comment?',  // falls back to English
  'document.comment.mention': 'Mention someone with @',  // falls back to English
  'document.comment.resolve': 'Resolve',  // falls back to English
  'document.comment.reopen': 'Reopen',  // falls back to English
  'document.comment.resolved': 'Resolved',  // falls back to English
  'document.comment.edited': 'edited',  // falls back to English
  'document.comment.count': '{count, plural, one {# comment} other {# comments}}',  // falls back to English
  'document.annotation.title': 'Annotations',  // falls back to English
  'document.annotation.add': 'Add annotation',  // falls back to English
  'document.annotation.highlight': 'Highlight',  // falls back to English
  'document.annotation.note': 'Note',  // falls back to English
  'document.annotation.draw': 'Draw',  // falls back to English
  'document.annotation.arrow': 'Arrow',  // falls back to English
  'document.annotation.delete': 'Delete annotation',  // falls back to English
  'document.annotation.clear': 'Clear all',  // falls back to English
  'document.tag.add': 'Add tag',  // falls back to English
  'document.tag.remove': 'Remove tag',  // falls back to English
  'document.tag.create': 'Create new tag',  // falls back to English
  'document.tag.placeholder': 'Tag name',  // falls back to English
  'document.tag.color': 'Tag color',  // falls back to English
  'document.tag.alreadyExists': 'A tag with this name already exists.',  // falls back to English
  'document.move.title': 'Move to folder',  // falls back to English
  'document.move.subtitle': 'Select a destination folder.',  // falls back to English
  'document.move.success': 'Moved {count, plural, one {# document} other {# documents}} to {{folder}}.',  // falls back to English
  'document.move.error.readOnly': 'The destination folder is read-only.',  // falls back to English
  'document.copy.title': 'Copy to folder',  // falls back to English
  'document.copy.success': 'Copied {count, plural, one {# document} other {# documents}} to {{folder}}.',  // falls back to English
  'document.delete.title': 'Delete document',  // falls back to English
  'document.delete.confirm': 'Delete "{{name}}"? This will move it to the recycle bin.',  // falls back to English
  'document.delete.permanent': 'Delete permanently',  // falls back to English
  'document.delete.permanent.confirm': 'Permanently delete "{{name}}"? This cannot be undone.',  // falls back to English
  'document.delete.blockedByLegalHold': 'This document is under legal hold and cannot be deleted.',  // falls back to English
  'document.delete.blockedByRetention': 'This document is under a retention schedule and cannot be deleted yet.',  // falls back to English
  'document.delete.blockedByCheckout': 'This document is checked out and cannot be deleted.',  // falls back to English
  'document.delete.success': 'Document moved to recycle bin.',  // falls back to English
  'document.delete.success.permanent': 'Document permanently deleted.',  // falls back to English
  'document.restore.title': 'Restore document',  // falls back to English
  'document.restore.success': 'Document restored to its original location.',  // falls back to English
  'document.recycleBin.title': 'Recycle bin',  // falls back to English
  'document.recycleBin.empty': 'Recycle bin is empty.',  // falls back to English
  'document.recycleBin.empty.action': 'Empty recycle bin',  // falls back to English
  'document.recycleBin.empty.confirm': 'Permanently delete all items in the recycle bin?',  // falls back to English
  'document.recycleBin.retention': 'Items will be permanently deleted after {{days}} days.',  // falls back to English
  'document.search.title': 'Search documents',  // falls back to English
  'document.search.placeholder': 'Search by name, content, or metadata…',  // falls back to English
  'document.search.advanced': 'Advanced search',  // falls back to English
  'document.search.results': '{count, plural, one {# result found} other {# results found}}',  // falls back to English
  'document.search.noResults': 'No documents match your search.',  // falls back to English
  'document.search.recent': 'Recent searches',  // falls back to English
  'document.search.saved': 'Saved searches',  // falls back to English
  'document.search.save': 'Save search',  // falls back to English
  'document.search.clear': 'Clear search',  // falls back to English
  'document.search.filter.content': 'File content',  // falls back to English
  'document.search.filter.metadata': 'Metadata',  // falls back to English
  'document.search.filter.tags': 'Tags',  // falls back to English
  'document.search.filter.classification': 'Classification',  // falls back to English
  'document.search.filter.dateRange': 'Date range',  // falls back to English
  'document.search.filter.size': 'Size',  // falls back to English
  'document.search.filter.author': 'Author',  // falls back to English
  'document.search.filter.fullText': 'Full text',  // falls back to English
  'document.search.filter.ocr': 'OCR text',  // falls back to English
  'document.search.highlight': 'Matched text',  // falls back to English
  'folder.title': 'Folders',  // falls back to English
  'folder.create': 'New folder',  // falls back to English
  'folder.name.label': 'Folder name',  // falls back to English
  'folder.name.placeholder': 'Folder name',  // falls back to English
  'folder.parent': 'Parent folder',  // falls back to English
  'folder.rename': 'Rename folder',  // falls back to English
  'folder.delete': 'Delete folder',  // falls back to English
  'folder.delete.confirm': 'Delete "{{name}}"? All documents inside will be moved to the parent folder.',  // falls back to English
  'folder.empty': 'This folder is empty.',  // falls back to English
  'folder.breadcrumb': 'Folder path',  // falls back to English
  'folder.moveHere': 'Move here',  // falls back to English
  'folder.color': 'Folder color',  // falls back to English
  'folder.description': 'Folder description',  // falls back to English
  'document.ocr.title': 'OCR results',  // falls back to English
  'document.ocr.status.pending': 'OCR pending',  // falls back to English
  'document.ocr.status.processing': 'Running OCR…',  // falls back to English
  'document.ocr.status.completed': 'OCR completed',  // falls back to English
  'document.ocr.status.failed': 'OCR failed',  // falls back to English
  'document.ocr.confidence': 'Confidence: {{percent}}%',  // falls back to English
  'document.ocr.review': 'Review OCR text',  // falls back to English
  'document.ocr.reprocess': 'Re-run OCR',  // falls back to English
  'document.ocr.language': 'OCR language',  // falls back to English
  'document.ocr.text.copy': 'Copy text',  // falls back to English
  'document.ocr.text.export': 'Export text',  // falls back to English
  'document.metadata.title': 'Metadata',  // falls back to English
  'document.metadata.edit': 'Edit metadata',  // falls back to English
  'document.metadata.save': 'Save metadata',  // falls back to English
  'document.metadata.add': 'Add field',  // falls back to English
  'document.metadata.remove': 'Remove field',  // falls back to English
  'document.metadata.required': 'Required',  // falls back to English
  'document.metadata.invalid': 'Invalid value for {{field}}',  // falls back to English
} as const;

export default documents;
