/**
 * @smart-edms/i18n — zh-CN translation: `sharing` namespace.
 *
 * Source of truth: en/sharing.ts
 * Translated from the English baseline.
 */

const sharing = {
  title: 'Sharing',  // falls back to English
  subtitle: 'Share documents securely with internal and external users.',  // falls back to English
  'share.button': 'Share',  // falls back to English
  'share.title': 'Share "{{name}}"',  // falls back to English
  'share.subtitle': 'Grant access to specific people or create a shareable link.',  // falls back to English
  'share.tab.people': 'People',  // falls back to English
  'share.tab.link': 'Link',  // falls back to English
  'share.tab.embed': 'Embed',  // falls back to English
  'recipient.add': 'Add recipient',  // falls back to English
  'recipient.placeholder': 'Name or email address',  // falls back to English
  'recipient.internal': 'Internal',  // falls back to English
  'recipient.external': 'External',  // falls back to English
  'recipient.group': 'Group',  // falls back to English
  'recipient.role': 'Role',  // falls back to English
  'recipient.role.viewer': 'Viewer',  // falls back to English
  'recipient.role.commenter': 'Commenter',  // falls back to English
  'recipient.role.editor': 'Editor',  // falls back to English
  'recipient.role.downloader': 'Downloader',  // falls back to English
  'recipient.role.full': 'Full access',  // falls back to English
  'recipient.expires': 'Expires',  // falls back to English
  'recipient.expires.never': 'Never',  // falls back to English
  'recipient.expires.custom': 'Custom',  // falls back to English
  'recipient.message': 'Personal message',  // falls back to English
  'recipient.message.placeholder': 'Add a note to the invitation email',  // falls back to English
  'recipient.notify': 'Notify by email',  // falls back to English
  'recipient.requireLogin': 'Require sign-in',  // falls back to English
  'recipient.requireMfa': 'Require MFA',  // falls back to English
  'recipient.watermark': 'Apply watermark',  // falls back to English
  'recipient.watermark.text': 'Confidential — {{recipient}} — {{date}}',  // falls back to English
  'recipient.remove': 'Remove recipient',  // falls back to English
  'recipient.remove.confirm': 'Remove access for {{name}}?',  // falls back to English
  'recipient.alreadyHasAccess': '{{name}} already has access to this document.',  // falls back to English
  'link.title': 'Shareable link',  // falls back to English
  'link.create': 'Create link',  // falls back to English
  'link.copy': 'Copy link',  // falls back to English
  'link.copied': 'Link copied to clipboard',  // falls back to English
  'link.regenerate': 'Regenerate link',  // falls back to English
  'link.regenerate.confirm': 'Regenerate the link? The previous link will stop working immediately.',  // falls back to English
  'link.disable': 'Disable link',  // falls back to English
  'link.enable': 'Enable link',  // falls back to English
  'link.delete': 'Delete link',  // falls back to English
  'link.delete.confirm': 'Delete this share link? Anyone using it will lose access immediately.',  // falls back to English
  'link.expiry': 'Link expiry',  // falls back to English
  'link.expiry.7days': '7 days',  // falls back to English
  'link.expiry.30days': '30 days',  // falls back to English
  'link.expiry.90days': '90 days',  // falls back to English
  'link.expiry.never': 'Never expires',  // falls back to English
  'link.expiry.custom': 'Custom date',  // falls back to English
  'link.password': 'Password protection',  // falls back to English
  'link.password.set': 'Set password',  // falls back to English
  'link.password.placeholder': 'Optional password',  // falls back to English
  'link.password.required': 'Password is required to access this link.',  // falls back to English
  'link.password.invalid': 'Incorrect password.',  // falls back to English
  'link.limitDownloads': 'Download limit',  // falls back to English
  'link.limitDownloads.placeholder': 'Maximum downloads (optional)',  // falls back to English
  'link.limitDownloads.exhausted': 'This link has reached its download limit.',  // falls back to English
  'link.requireLogin': 'Require sign-in to view',  // falls back to English
  'link.allowDownload': 'Allow downloads',  // falls back to English
  'link.allowPrint': 'Allow printing',  // falls back to English
  'link.allowCopy': 'Allow copy',  // falls back to English
  'link.blockScreenshots': 'Block screenshots (where supported)',  // falls back to English
  'link.watermark': 'Apply dynamic watermark',  // falls back to English
  'embed.title': 'Embed',  // falls back to English
  'embed.subtitle': 'Embed this document in another website or application.',  // falls back to English
  'embed.code': 'Embed code',  // falls back to English
  'embed.copy': 'Copy embed code',  // falls back to English
  'embed.restrictDomains': 'Restrict to domains',  // falls back to English
  'embed.restrictDomains.placeholder': 'example.com',  // falls back to English
  'embed.addDomain': 'Add domain',  // falls back to English
  'embed.allowFullscreen': 'Allow fullscreen',  // falls back to English
  'embed.allowDownload': 'Allow downloads from embed',  // falls back to English
  'access.title': 'Access log',  // falls back to English
  'access.subtitle': 'Who has viewed or downloaded this document.',  // falls back to English
  'access.who': 'User',  // falls back to English
  'access.when': 'When',  // falls back to English
  'access.action': 'Action',  // falls back to English
  'access.action.view': 'Viewed',  // falls back to English
  'access.action.download': 'Downloaded',  // falls back to English
  'access.action.print': 'Printed',  // falls back to English
  'access.action.share': 'Shared',  // falls back to English
  'access.action.comment': 'Commented',  // falls back to English
  'access.action.edit': 'Edited',  // falls back to English
  'access.action.delete': 'Deleted',  // falls back to English
  'access.ip': 'IP address',  // falls back to English
  'access.location': 'Location',  // falls back to English
  'access.device': 'Device',  // falls back to English
  'access.empty': 'No access events yet.',  // falls back to English
  'permission.denied': 'You do not have permission to perform this action.',  // falls back to English
  'permission.denied.download': 'You do not have permission to download this document.',  // falls back to English
  'permission.denied.print': 'You do not have permission to print this document.',  // falls back to English
  'permission.denied.edit': 'You do not have permission to edit this document.',  // falls back to English
  'permission.denied.share': 'You do not have permission to share this document.',  // falls back to English
  'permission.denied.delete': 'You do not have permission to delete this document.',  // falls back to English
  'share.expired': 'This share link has expired.',  // falls back to English
  'share.revoked': 'This share link has been revoked.',  // falls back to English
  'share.blockedByPolicy': 'Your organisation’s policy does not allow sharing this document externally.',  // falls back to English
  'share.blockedByClassification': 'Documents with this classification level cannot be shared externally.',  // falls back to English
  'share.blockedByLegalHold': 'This document is under legal hold and cannot be shared.',  // falls back to English
  'share.blockedByRetention': 'This document is under retention and cannot be shared externally.',  // falls back to English
  'share.success': 'Document shared with {count, plural, one {# recipient} other {# recipients}}.',  // falls back to English
  'share.linkCreated': 'Share link created.',  // falls back to English
  'share.linkDisabled': 'Share link disabled.',  // falls back to English
  'share.linkDeleted': 'Share link deleted.',  // falls back to English
  'share.accessRevoked': 'Access revoked for {{name}}.',  // falls back to English
  'share.accessGranted': 'Access granted to {{name}}.',  // falls back to English
  'policy.title': 'Sharing policy',  // falls back to English
  'policy.subtitle': 'Tenant-wide rules that govern how documents can be shared.',  // falls back to English
  'policy.allowExternal': 'Allow external sharing',  // falls back to English
  'policy.requireMfa': 'Require MFA for external access',  // falls back to English
  'policy.requireApproval': 'Require admin approval for external shares',  // falls back to English
  'policy.maxExpiry': 'Maximum link expiry (days)',  // falls back to English
  'policy.allowedDomains': 'Allowed email domains',  // falls back to English
  'policy.blockedDomains': 'Blocked email domains',  // falls back to English
  'policy.minClassification': 'Minimum classification level that can be shared',  // falls back to English
  'policy.requireWatermark': 'Require watermark on external access',  // falls back to English
  'policy.blockDownload': 'Block downloads for external viewers',  // falls back to English
  'policy.requirePassword': 'Require password on links',  // falls back to English
  'policy.auditExternal': 'Audit all external access',  // falls back to English
} as const;

export default sharing;
