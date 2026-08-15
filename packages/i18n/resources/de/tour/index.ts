/**
 * @smart-edms/i18n — de locale: tour sub-namespaces barrel.
 */

import common from './common.js';
import welcome from './welcome.js';
import documents from './documents.js';
import search from './search.js';
import workflows from './workflows.js';
import audit from './audit.js';
import admin from './admin.js';
import license from './license.js';
import scanner from './scanner.js';
import collaboration from './collaboration.js';
import aiAssistant from './aiAssistant.js';
import checklist from './checklist.js';
import marketing from './marketing.js';

export const tour = {
  common,
  welcome,
  documents,
  search,
  workflows,
  audit,
  admin,
  license,
  scanner,
  collaboration,
  aiAssistant,
  checklist,
  marketing,
} as const;
