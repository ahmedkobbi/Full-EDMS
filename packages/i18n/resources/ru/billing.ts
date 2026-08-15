/**
 * @smart-edms/i18n — ru translation: `billing` namespace.
 *
 * Source of truth: en/billing.ts
 * Translated from the English baseline.
 */

const billing = {
  title: 'Billing',  // falls back to English
  subtitle: 'Manage your subscription, invoices, and payment methods.',  // falls back to English
  'tab.overview': 'Overview',  // falls back to English
  'tab.invoices': 'Invoices',  // falls back to English
  'tab.paymentMethods': 'Payment methods',  // falls back to English
  'tab.usage': 'Usage',  // falls back to English
  'tab.plans': 'Plans',  // falls back to English
  'overview.title': 'Billing overview',  // falls back to English
  'overview.currentPlan': 'Current plan',  // falls back to English
  'overview.billingCycle': 'Billing cycle',  // falls back to English
  'overview.nextInvoice': 'Next invoice',  // falls back to English
  'overview.nextInvoiceDate': 'Next invoice date',  // falls back to English
  'overview.amountDue': 'Amount due',  // falls back to English
  'overview.amountDue.description': 'Amount due on {{date}}',  // falls back to English
  'overview.paymentMethod': 'Payment method',  // falls back to English
  'overview.paymentMethod.none': 'No payment method on file',  // falls back to English
  'overview.changePlan': 'Change plan',  // falls back to English
  'overview.cancelSubscription': 'Cancel subscription',  // falls back to English
  'overview.cancelSubscription.confirm': 'Cancel your subscription? You will lose access at the end of the current billing period.',  // falls back to English
  'invoices.title': 'Invoices',  // falls back to English
  'invoices.subtitle': 'Your billing history.',  // falls back to English
  'invoices.empty': 'No invoices yet.',  // falls back to English
  'invoices.column.number': 'Invoice number',  // falls back to English
  'invoices.column.date': 'Date',  // falls back to English
  'invoices.column.amount': 'Amount',  // falls back to English
  'invoices.column.status': 'Status',  // falls back to English
  'invoices.column.dueDate': 'Due date',  // falls back to English
  'invoices.download': 'Download invoice',  // falls back to English
  'invoices.pay': 'Pay now',  // falls back to English
  'invoices.status.paid': 'Paid',  // falls back to English
  'invoices.status.due': 'Due',  // falls back to English
  'invoices.status.overdue': 'Overdue',  // falls back to English
  'invoices.status.failed': 'Failed',  // falls back to English
  'invoices.status.draft': 'Draft',  // falls back to English
  'invoices.status.void': 'Void',  // falls back to English
  'paymentMethods.title': 'Payment methods',  // falls back to English
  'paymentMethods.subtitle': 'Manage how you pay for Smart EDMS.',  // falls back to English
  'paymentMethods.add': 'Add payment method',  // falls back to English
  'paymentMethods.empty': 'No payment methods on file.',  // falls back to English
  'paymentMethods.column.type': 'Type',  // falls back to English
  'paymentMethods.column.last4': 'Last 4 digits',  // falls back to English
  'paymentMethods.column.expiry': 'Expiry',  // falls back to English
  'paymentMethods.column.default': 'Default',  // falls back to English
  'paymentMethods.setDefault': 'Set as default',  // falls back to English
  'paymentMethods.remove': 'Remove',  // falls back to English
  'paymentMethods.remove.confirm': 'Remove this payment method?',  // falls back to English
  'paymentMethods.type.card': 'Credit / debit card',  // falls back to English
  'paymentMethods.type.bankTransfer': 'Bank transfer',  // falls back to English
  'paymentMethods.type.directDebit': 'Direct debit',  // falls back to English
  'paymentMethods.type.wire': 'Wire transfer',  // falls back to English
  'paymentMethods.type.invoice': 'Invoice',  // falls back to English
  'paymentMethods.type.purchaseOrder': 'Purchase order',  // falls back to English
  'usage.title': 'Usage',  // falls back to English
  'usage.subtitle': 'Track how much of your plan you are using.',  // falls back to English
  'usage.period': 'Billing period',  // falls back to English
  'usage.period.current': 'Current period',  // falls back to English
  'usage.period.previous': 'Previous period',  // falls back to English
  'usage.users': 'Active users',  // falls back to English
  'usage.storage': 'Storage used',  // falls back to English
  'usage.documents': 'Documents',  // falls back to English
  'usage.ai.tokens': 'AI tokens used',  // falls back to English
  'usage.ai.requests': 'AI requests',  // falls back to English
  'usage.ocr.pages': 'OCR pages processed',  // falls back to English
  'usage.scanner.pages': 'Scanned pages',  // falls back to English
  'usage.bandwidth': 'Bandwidth',  // falls back to English
  'usage.apiCalls': 'API calls',  // falls back to English
  'usage.export': 'Export usage',  // falls back to English
  'usage.chart.users': 'Users over time',  // falls back to English
  'usage.chart.storage': 'Storage over time',  // falls back to English
  'usage.chart.aiTokens': 'AI token usage over time',  // falls back to English
  'plans.title': 'Plans',  // falls back to English
  'plans.subtitle': 'Compare plans and find the right fit.',  // falls back to English
  'plans.current': 'Current plan',  // falls back to English
  'plans.choose': 'Choose plan',  // falls back to English
  'plans.contactSales': 'Contact sales',  // falls back to English
  'plans.feature.included': 'Included',  // falls back to English
  'plans.feature.notIncluded': 'Not included',  // falls back to English
  'plans.feature.addOn': 'Add-on',  // falls back to English
  'plans.change.title': 'Change plan',  // falls back to English
  'plans.change.confirm': 'Switch to the {{plan}} plan? Changes take effect at the start of the next billing period.',  // falls back to English
  'plans.change.success': 'Plan change scheduled for {{date}}.',  // falls back to English
  'plans.change.immediate': 'Switch immediately',  // falls back to English
  'plans.change.immediate.confirm': 'Switch to the {{plan}} plan now? You will be charged a prorated amount immediately.',  // falls back to English
  'plans.prorated': 'Prorated charge: {{amount}}',  // falls back to English
  'plans.refund': 'Refund due: {{amount}}',  // falls back to English
  'invoice.title': 'Invoice {{number}}',  // falls back to English
  'invoice.from': 'From',  // falls back to English
  'invoice.to': 'To',  // falls back to English
  'invoice.issued': 'Issued on {{date}}',  // falls back to English
  'invoice.due': 'Due on {{date}}',  // falls back to English
  'invoice.lineItems': 'Line items',  // falls back to English
  'invoice.subtotal': 'Subtotal',  // falls back to English
  'invoice.tax': 'Tax',  // falls back to English
  'invoice.total': 'Total',  // falls back to English
  'invoice.amountPaid': 'Amount paid',  // falls back to English
  'invoice.amountDue': 'Amount due',  // falls back to English
  'invoice.pay': 'Pay invoice',  // falls back to English
  'invoice.download': 'Download PDF',  // falls back to English
  'invoice.note': 'Notes',  // falls back to English
  'invoice.terms': 'Payment terms',  // falls back to English
  'tax.id': 'Tax ID',  // falls back to English
  'tax.vat': 'VAT number',  // falls back to English
  'tax.ein': 'Employer Identification Number',  // falls back to English
  'tax.gst': 'GST number',  // falls back to English
  'address.billing': 'Billing address',  // falls back to English
  'address.street': 'Street',  // falls back to English
  'address.city': 'City',  // falls back to English
  'address.state': 'State / Province',  // falls back to English
  'address.postalCode': 'Postal code',  // falls back to English
  'address.country': 'Country',  // falls back to English
  'error.paymentFailed': 'Payment failed. Please try a different payment method.',  // falls back to English
  'error.cardDeclined': 'Your card was declined.',  // falls back to English
  'error.insufficientFunds': 'Insufficient funds.',  // falls back to English
  'error.expiredCard': 'Your card has expired.',  // falls back to English
  'error.invalidCvc': 'Invalid security code.',  // falls back to English
  'error.processingError': 'An error occurred while processing your payment. Please try again.',  // falls back to English
  'success.paymentReceived': 'Payment received. Thank you!',  // falls back to English
  'success.planChanged': 'Your plan has been changed.',  // falls back to English
  'success.subscriptionCancelled': 'Your subscription has been cancelled. You will retain access until {{date}}.',  // falls back to English
  'success.paymentMethodAdded': 'Payment method added.',  // falls back to English
  'success.paymentMethodRemoved': 'Payment method removed.',  // falls back to English
  'success.paymentMethodDefault': 'Default payment method updated.',  // falls back to English
} as const;

export default billing;
