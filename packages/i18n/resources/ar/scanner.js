"use strict";
/**
 * @smart-edms/i18n — ar translation: `scanner` namespace.
 *
 * Source of truth: en/scanner.ts
 * Translated from the English baseline.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const scanner = {
    title: 'Scanners', // falls back to English
    subtitle: 'Configure scanning devices and capture profiles.', // falls back to English
    'tab.devices': 'Devices', // falls back to English
    'tab.profiles': 'Capture profiles', // falls back to English
    'tab.jobs': 'Scan jobs', // falls back to English
    'tab.drivers': 'Drivers', // falls back to English
    'devices.title': 'Scanner devices', // falls back to English
    'devices.subtitle': 'Scanners connected to Smart EDMS.', // falls back to English
    'devices.add': 'Add scanner', // falls back to English
    'devices.empty': 'No scanners configured.', // falls back to English
    'devices.column.name': 'Name', // falls back to English
    'devices.column.model': 'Model', // falls back to English
    'devices.column.driver': 'Driver', // falls back to English
    'devices.column.status': 'Status', // falls back to English
    'devices.column.lastSeen': 'Last seen', // falls back to English
    'devices.status.online': 'Online', // falls back to English
    'devices.status.offline': 'Offline', // falls back to English
    'devices.status.busy': 'Busy', // falls back to English
    'devices.status.error': 'Error', // falls back to English
    'devices.test': 'Test connection', // falls back to English
    'devices.test.success': 'Scanner is online and responding.', // falls back to English
    'devices.test.failed': 'Could not reach scanner: {{reason}}', // falls back to English
    'devices.remove': 'Remove scanner', // falls back to English
    'devices.remove.confirm': 'Remove scanner "{{name}}"? Pending jobs will be cancelled.', // falls back to English
    'devices.rename': 'Rename', // falls back to English
    'profile.title': 'Capture profiles', // falls back to English
    'profile.subtitle': 'Reusable scan settings for different document types.', // falls back to English
    'profile.create': 'Create profile', // falls back to English
    'profile.name': 'Profile name', // falls back to English
    'profile.description': 'Description', // falls back to English
    'profile.scanner': 'Default scanner', // falls back to English
    'profile.resolution': 'Resolution (DPI)', // falls back to English
    'profile.colorMode': 'Color mode', // falls back to English
    'profile.colorMode.color': 'Color', // falls back to English
    'profile.colorMode.grayscale': 'Grayscale', // falls back to English
    'profile.colorMode.binary': 'Black & white', // falls back to English
    'profile.paperSize': 'Paper size', // falls back to English
    'profile.paperSize.a4': 'A4 (210 × 297 mm)', // falls back to English
    'profile.paperSize.a3': 'A3 (297 × 420 mm)', // falls back to English
    'profile.paperSize.letter': 'Letter (8.5 × 11 in)', // falls back to English
    'profile.paperSize.legal': 'Legal (8.5 × 14 in)', // falls back to English
    'profile.paperSize.auto': 'Auto-detect', // falls back to English
    'profile.duplex': 'Duplex (two-sided)', // falls back to English
    'profile.duplex.simplex': 'Simplex (one-sided)', // falls back to English
    'profile.duplex.longEdge': 'Duplex — long edge', // falls back to English
    'profile.duplex.shortEdge': 'Duplex — short edge', // falls back to English
    'profile.autoFeed': 'Auto feed', // falls back to English
    'profile.batchSize': 'Batch size (pages)', // falls back to English
    'profile.ocrLanguage': 'OCR language', // falls back to English
    'profile.ocrAuto': 'Run OCR automatically', // falls back to English
    'profile.classifyAuto': 'Auto-classify', // falls back to English
    'profile.splitOnBarcode': 'Split on barcode', // falls back to English
    'profile.splitOnBlankPage': 'Split on blank page', // falls back to English
    'profile.deskew': 'Deskew automatically', // falls back to English
    'profile.denoise': 'Denoise', // falls back to English
    'profile.removePunchHoles': 'Remove punch holes', // falls back to English
    'profile.removeBorders': 'Remove borders', // falls back to English
    'profile.delete.confirm': 'Delete profile "{{name}}"?', // falls back to English
    'profile.empty': 'No capture profiles defined.', // falls back to English
    'job.title': 'Scan jobs', // falls back to English
    'job.subtitle': 'Active and historical scan jobs.', // falls back to English
    'job.column.profile': 'Profile', // falls back to English
    'job.column.scanner': 'Scanner', // falls back to English
    'job.column.operator': 'Operator', // falls back to English
    'job.column.pages': 'Pages', // falls back to English
    'job.column.status': 'Status', // falls back to English
    'job.column.started': 'Started', // falls back to English
    'job.column.completed': 'Completed', // falls back to English
    'job.status.queued': 'Queued', // falls back to English
    'job.status.scanning': 'Scanning', // falls back to English
    'job.status.processing': 'Processing', // falls back to English
    'job.status.completed': 'Completed', // falls back to English
    'job.status.failed': 'Failed', // falls back to English
    'job.status.cancelled': 'Cancelled', // falls back to English
    'job.cancel': 'Cancel job', // falls back to English
    'job.cancel.confirm': 'Cancel scan job? Any pages already scanned will be kept.', // falls back to English
    'job.retry': 'Retry job', // falls back to English
    'job.empty': 'No scan jobs.', // falls back to English
    'job.start': 'Start scan', // falls back to English
    'job.pages.scanned': '{count, plural, one {# page scanned} other {# pages scanned}}', // falls back to English
    'job.error.paperJam': 'Paper jam detected. Clear the jam and retry.', // falls back to English
    'job.error.noPaper': 'No paper in the feeder. Load paper and retry.', // falls back to English
    'job.error.coverOpen': 'Scanner cover is open. Close it and retry.', // falls back to English
    'job.error.driver': 'Driver error: {{reason}}', // falls back to English
    'job.error.timeout': 'Scan timed out. The scanner may be busy or unresponsive.', // falls back to English
    'driver.title': 'Scanner drivers', // falls back to English
    'driver.subtitle': 'Smart EDMS supports multiple driver protocols.', // falls back to English
    'driver.kind.upload': 'Upload (no driver — drag files into a batch)', // falls back to English
    'driver.kind.twain': 'TWAIN', // falls back to English
    'driver.kind.wia': 'WIA (Windows Image Acquisition)', // falls back to English
    'driver.kind.isis': 'ISIS', // falls back to English
    'driver.kind.network': 'Network (HTTP/REST)', // falls back to English
    'driver.kind.localAgent': 'Local agent (cross-platform)', // falls back to English
    'driver.install': 'Install driver', // falls back to English
    'driver.installed': 'Installed', // falls back to English
    'driver.notInstalled': 'Not installed', // falls back to English
    'driver.version': 'Version', // falls back to English
    'driver.update': 'Update driver', // falls back to English
    'driver.update.available': 'An update is available for {{name}}.', // falls back to English
    'driver.update.success': 'Driver updated.', // falls back to English
    'driver.update.failed': 'Could not update the driver: {{reason}}', // falls back to English
    'driver.uninstall': 'Uninstall driver', // falls back to English
    'driver.uninstall.confirm': 'Uninstall {{name}}? Scanners using this driver will be disconnected.', // falls back to English
    'agent.title': 'Local agent', // falls back to English
    'agent.subtitle': 'A small helper application that connects a desktop scanner to Smart EDMS.', // falls back to English
    'agent.download': 'Download agent', // falls back to English
    'agent.download.macOS': 'Download for macOS', // falls back to English
    'agent.download.windows': 'Download for Windows', // falls back to English
    'agent.download.linux': 'Download for Linux', // falls back to English
    'agent.pairingCode': 'Pairing code', // falls back to English
    'agent.pairingCode.description': 'Enter this code in the agent to pair it with this Smart EDMS tenant.', // falls back to English
    'agent.pairingCode.regenerate': 'Regenerate pairing code', // falls back to English
    'agent.status.paired': 'Paired', // falls back to English
    'agent.status.unpaired': 'Not paired', // falls back to English
    'agent.lastSeen': 'Last seen: {{date}}', // falls back to English
    'agent.version': 'Agent version: {{version}}', // falls back to English
    'agent.unpair': 'Unpair agent', // falls back to English
    'agent.unpair.confirm': 'Unpair this agent? Scanners connected through it will be disconnected.', // falls back to English
};
exports.default = scanner;
//# sourceMappingURL=scanner.js.map