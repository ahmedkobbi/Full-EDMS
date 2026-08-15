/**
 * @smart-edms/i18n — English baseline: `tour.scanner` namespace (spec §16.4)
 */

const tourScanner = {
  'title': 'Scanner tour',
  'subtitle': 'From paper to digital in minutes.',

  'step.intro.title': 'Digitize paper with Smart EDMS',
  'step.intro.body': 'This tour shows you how to connect a scanner, configure capture profiles, and process batches of paper documents.',

  'step.devices.title': 'Scanner devices',
  'step.devices.body': 'Add a scanner to Smart EDMS. You can connect via TWAIN, WIA, ISIS, a network protocol, or a local agent for cross-platform access.',

  'step.profiles.title': 'Capture profiles',
  'step.profiles.body': 'A capture profile bundles scan settings — resolution, color mode, paper size, duplex — for a specific document type. Create one profile per common paper type.',

  'step.batches.title': 'Batches',
  'step.batches.body': 'Each scan session is a batch. Batches group pages, run OCR, split into documents, and apply capture rules — all automatically.',

  'step.captureRules.title': 'Capture rules',
  'step.captureRules.body': 'Capture rules decide how to split a long scan into individual documents — by barcode, blank page, page count, or content type.',

  'step.ocr.title': 'OCR during scan',
  'step.ocr.body': 'OCR runs automatically after each scan. You can choose multiple OCR languages for documents that mix scripts.',

  'step.verification.title': 'Human verification',
  'step.verification.body': 'Pages with low OCR confidence are routed to a human verification queue. You can review and approve extracted text before it’s committed.',

  'step.classify.title': 'Auto-classify',
  'step.classify.body': 'After OCR, Smart EDMS suggests a document type and classification label. You can accept or override the suggestion.',

  'step.agent.title': 'Local agent',
  'step.agent.body': 'For desktop scanners, install the local agent. It pairs with your tenant using a one-time code and bridges the scanner to Smart EDMS.',

  'completion.title': 'You’re ready to digitize',
  'completion.body': 'You now know how to scan, process, and verify paper documents. Take the Collaboration tour to learn about sharing and comments.',
  'completion.next': 'Take the Collaboration tour',
} as const;

export default tourScanner;
