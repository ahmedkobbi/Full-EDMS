/**
 * @smart-edms/i18n — fr locale: ai sub-namespaces barrel.
 */

import common from './common.js';
import bubble from './bubble.js';
import errors from './errors.js';
import actions from './actions.js';
import disclaimer from './disclaimer.js';
import citations from './citations.js';

export const ai = {
  common,
  bubble,
  errors,
  actions,
  disclaimer,
  citations,
} as const;
