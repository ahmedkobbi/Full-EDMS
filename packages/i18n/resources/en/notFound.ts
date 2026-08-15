/**
 * @smart-edms/i18n — Not-found + error-page namespace
 *
 * Strings for 404, 403, 500, and license-invalid error pages.
 */
const notFound = {
  'notFound.title': 'Page not found',
  'notFound.subtitle': "The page you're looking for doesn't exist or has been moved.",
  'notFound.action.home': 'Back to dashboard',
  'notFound.action.search': 'Search documents',
  'notFound.action.help': 'Contact support',

  'forbidden.title': 'Access denied',
  'forbidden.subtitle': "You don't have permission to access this resource.",
  'forbidden.action.dashboard': 'Back to dashboard',
  'forbidden.action.signOut': 'Sign in with a different account',

  'serverError.title': 'Server error',
  'serverError.subtitle': 'Something went wrong on our end. Please try again in a moment.',
  'serverError.action.retry': 'Try again',
  'serverError.action.support': 'Contact support',

  'licenseInvalid.title': 'License invalid',
  'licenseInvalid.subtitle': 'The Smart EDMS license for this deployment is not valid. Please contact your administrator.',
  'licenseInvalid.action.import': 'Import license (.sedmslic)',
  'licenseInvalid.action.contact': 'Contact support',

  'licenseExpired.title': 'License expired',
  'licenseExpired.subtitle': 'The Smart EDMS license has expired. Please renew your license to continue.',
  'licenseExpired.action.renew': 'Renew license',
  'licenseExpired.action.contact': 'Contact sales',

  'networkError.title': 'Network error',
  'networkError.subtitle': 'Unable to reach the Smart EDMS server. Please check your connection.',
  'networkError.action.retry': 'Retry connection',
} as const;

export default notFound;
