/**
 * @smart-edms/i18n — fr translation: `metadata` namespace.
 *
 * Source of truth: en/metadata.ts
 * Translated from the English baseline.
 */

const metadata = {
  'schema.title': 'Metadata schemas',  // falls back to English
  'schema.subtitle': 'Define the structure of document metadata for each document type.',  // falls back to English
  'schema.create': 'Create schema',  // falls back to English
  'schema.name': 'Schema name',  // falls back to English
  'schema.description': 'Schema description',  // falls back to English
  'schema.fields': 'Fields',  // falls back to English
  'schema.appliesTo': 'Applies to document types',  // falls back to English
  'schema.inherited': 'Inherited from parent schema',  // falls back to English
  'schema.default': 'Default schema',  // falls back to English
  'schema.active': 'Active',  // falls back to English
  'schema.archived': 'Archived',  // falls back to English
  'schema.delete.confirm': 'Delete schema "{{name}}"? Existing documents will keep their metadata values.',  // falls back to English
  'schema.empty': 'No schemas defined yet.',  // falls back to English
  'field.title': 'Field',  // falls back to English
  'field.name': 'Field name',  // falls back to English
  'field.label': 'Display label',  // falls back to English
  'field.description': 'Help text',  // falls back to English
  'field.type': 'Field type',  // falls back to English
  'field.required': 'Required',  // falls back to English
  'field.multiple': 'Allow multiple values',  // falls back to English
  'field.readOnly': 'Read-only',  // falls back to English
  'field.defaultValue': 'Default value',  // falls back to English
  'field.placeholder': 'Placeholder text',  // falls back to English
  'field.validation': 'Validation rules',  // falls back to English
  'field.order': 'Display order',  // falls back to English
  'field.group': 'Field group',  // falls back to English
  'field.condition': 'Conditional display',  // falls back to English
  'field.delete.confirm': 'Remove field "{{name}}"?',  // falls back to English
  'field.type.text': 'Text',  // falls back to English
  'field.type.textarea': 'Long text',  // falls back to English
  'field.type.number': 'Number',  // falls back to English
  'field.type.boolean': 'Boolean',  // falls back to English
  'field.type.date': 'Date',  // falls back to English
  'field.type.datetime': 'Date and time',  // falls back to English
  'field.type.select': 'Single select',  // falls back to English
  'field.type.multiselect': 'Multi select',  // falls back to English
  'field.type.user': 'User',  // falls back to English
  'field.type.group': 'Group',  // falls back to English
  'field.type.document': 'Document reference',  // falls back to English
  'field.type.url': 'URL',  // falls back to English
  'field.type.email': 'Email',  // falls back to English
  'field.type.phone': 'Phone',  // falls back to English
  'field.type.currency': 'Currency',  // falls back to English
  'field.type.percentage': 'Percentage',  // falls back to English
  'field.type.rating': 'Rating',  // falls back to English
  'field.type.color': 'Color',  // falls back to English
  'field.type.barcode': 'Barcode',  // falls back to English
  'field.type.qrCode': 'QR code',  // falls back to English
  'field.type.signature': 'Signature',  // falls back to English
  'field.type.json': 'Structured JSON',  // falls back to English
  'validation.required': 'This field is required.',  // falls back to English
  'validation.minLength': 'Must be at least {{min}} characters.',  // falls back to English
  'validation.maxLength': 'Must be at most {{max}} characters.',  // falls back to English
  'validation.min': 'Must be at least {{min}}.',  // falls back to English
  'validation.max': 'Must be at most {{max}}.',  // falls back to English
  'validation.pattern': 'Invalid format. Expected: {{pattern}}.',  // falls back to English
  'validation.email': 'Must be a valid email address.',  // falls back to English
  'validation.url': 'Must be a valid URL.',  // falls back to English
  'validation.date': 'Must be a valid date.',  // falls back to English
  'validation.dateRange': 'Date must be between {{min}} and {{max}}.',  // falls back to English
  'validation.unique': 'This value must be unique.',  // falls back to English
  'validation.numeric': 'Must be a number.',  // falls back to English
  'validation.integer': 'Must be an integer.',  // falls back to English
  'validation.positive': 'Must be positive.',  // falls back to English
  'validation.nonNegative': 'Must be zero or positive.',  // falls back to English
  'validation.vocabulary': 'Must be a value from the controlled vocabulary.',  // falls back to English
  'validation.userNotFound': 'User not found.',  // falls back to English
  'validation.documentNotFound': 'Document not found.',  // falls back to English
  'vocabulary.title': 'Controlled vocabularies',  // falls back to English
  'vocabulary.subtitle': 'Reusable lists of allowed values for metadata fields.',  // falls back to English
  'vocabulary.create': 'Create vocabulary',  // falls back to English
  'vocabulary.name': 'Vocabulary name',  // falls back to English
  'vocabulary.values': 'Allowed values',  // falls back to English
  'vocabulary.value.add': 'Add value',  // falls back to English
  'vocabulary.value.label': 'Display label',  // falls back to English
  'vocabulary.value.code': 'Stable code',  // falls back to English
  'vocabulary.value.color': 'Color',  // falls back to English
  'vocabulary.value.description': 'Description',  // falls back to English
  'vocabulary.value.archived': 'Archived',  // falls back to English
  'vocabulary.import': 'Import vocabulary',  // falls back to English
  'vocabulary.export': 'Export vocabulary',  // falls back to English
  'vocabulary.hierarchical': 'Hierarchical',  // falls back to English
  'vocabulary.parent': 'Parent value',  // falls back to English
  'schema.preview': 'Schema preview',  // falls back to English
  'schema.preview.subtitle': 'How the metadata form will appear to users.',  // falls back to English
  'schema.apply': 'Apply schema',  // falls back to English
  'schema.applied': 'Schema applied to {count, plural, one {# document type} other {# document types}}.',  // falls back to English
  'schema.export': 'Export schema',  // falls back to English
  'schema.import': 'Import schema',  // falls back to English
  'schema.version': 'Schema version',  // falls back to English
  'schema.version.history': 'Version history',  // falls back to English
  'schema.version.migrate': 'Migrate documents to new version',  // falls back to English
  'value.notSet': 'Not set',  // falls back to English
  'value.empty': 'Empty',  // falls back to English
  'value.unknown': 'Unknown',  // falls back to English
  'value.multiple': '{{count}} values',  // falls back to English
} as const;

export default metadata;
