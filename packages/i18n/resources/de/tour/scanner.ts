/**
 * @smart-edms/i18n — de translation: `tour.scanner` namespace.
 *
 * Source of truth: en/tour/scanner.ts
 * Translated from the English baseline.
 */

const scanner = {
  title: 'Scanner tour',  // falls back to English
  subtitle: 'From paper to digital in minutes.',  // falls back to English
  'step.intro.title': 'Digitize paper with Smart EDMS',  // falls back to English
  'step.intro.body': 'This tour shows you how to connect a scanner, configure capture profiles, and process batches of paper documents.',  // falls back to English
  'step.devices.title': 'Scanner devices',  // falls back to English
  'step.devices.body': 'Add a scanner to Smart EDMS. You can connect via TWAIN, WIA, ISIS, a network protocol, or a local agent for cross-platform access.',  // falls back to English
  'step.profiles.title': 'Capture profiles',  // falls back to English
  'step.profiles.body': 'A capture profile bundles scan settings — resolution, color mode, paper size, duplex — for a specific document type. Create one profile per common paper type.',  // falls back to English
  'step.batches.title': 'Batches',  // falls back to English
  'step.batches.body': 'Each scan session is a batch. Batches group pages, run OCR, split into documents, and apply capture rules — all automatically.',  // falls back to English
  'step.captureRules.title': 'Capture rules',  // falls back to English
  'step.captureRules.body': 'Capture rules decide how to split a long scan into individual documents — by barcode, blank page, page count, or content type.',  // falls back to English
  'step.ocr.title': 'OCR during scan',  // falls back to English
  'step.ocr.body': 'OCR runs automatically after each scan. You can choose multiple OCR languages for documents that mix scripts.',  // falls back to English
  'step.verification.title': 'Human verification',  // falls back to English
  'step.verification.body': 'Pages with low OCR confidence are routed to a human verification queue. You can review and approve extracted text before it’s committed.',  // falls back to English
  'step.classify.title': 'Auto-classify',  // falls back to English
  'step.classify.body': 'After OCR, Smart EDMS suggests a document type and classification label. You can accept or override the suggestion.',  // falls back to English
  'step.agent.title': 'Local agent',  // falls back to English
  'step.agent.body': 'For desktop scanners, install the local agent. It pairs with your tenant using a one-time code and bridges the scanner to Smart EDMS.',  // falls back to English
  'completion.title': 'You’re ready to digitize',  // falls back to English
  'completion.body': 'You now know how to scan, process, and verify paper documents. Take the Collaboration tour to learn about sharing and comments.',  // falls back to English
  'completion.next': 'Take the Collaboration tour',  // falls back to English
} as const;

export default scanner;
