/**
 * @smart-edms/i18n — zh-CN locale barrel.
 */

import common from './common.js';
import auth from './auth.js';
import documents from './documents.js';
import metadata from './metadata.js';
import workflow from './workflow.js';
import sharing from './sharing.js';
import audit from './audit.js';
import admin from './admin.js';
import security from './security.js';
import errors from './errors.js';
import notifications from './notifications.js';
import emails from './emails.js';
import retention from './retention.js';
import classification from './classification.js';
import digitization from './digitization.js';
import provenance from './provenance.js';
import license from './license.js';
import billing from './billing.js';
import marketing from './marketing.js';
import settings from './settings.js';
import scanner from './scanner.js';
import locales from './locales.js';
import nav from './nav.js';
import dashboard from './dashboard.js';
import notFound from './notFound.js';

import { tour } from './tour/index.js';
import { ai } from './ai/index.js';

export const zhCN = {
  common,
  auth,
  documents,
  metadata,
  workflow,
  sharing,
  audit,
  admin,
  security,
  errors,
  notifications,
  emails,
  retention,
  classification,
  digitization,
  provenance,
  license,
  billing,
  marketing,
  settings,
  scanner,
  locales,
  nav,
  dashboard,
  notFound,
  'tour.common': tour.common,
  'tour.welcome': tour.welcome,
  'tour.documents': tour.documents,
  'tour.search': tour.search,
  'tour.workflows': tour.workflows,
  'tour.audit': tour.audit,
  'tour.admin': tour.admin,
  'tour.license': tour.license,
  'tour.scanner': tour.scanner,
  'tour.collaboration': tour.collaboration,
  'tour.aiAssistant': tour.aiAssistant,
  'tour.checklist': tour.checklist,
  'tour.marketing': tour.marketing,
  'ai.common': ai.common,
  'ai.bubble': ai.bubble,
  'ai.errors': ai.errors,
  'ai.actions': ai.actions,
  'ai.disclaimer': ai.disclaimer,
  'ai.citations': ai.citations,
} as const;
