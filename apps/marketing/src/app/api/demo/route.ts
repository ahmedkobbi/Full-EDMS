/**
 * Smart EDMS marketing site — demo request API route (spec §7.5, §12.11).
 *
 * POST /api/demo
 *
 * Validates the request body with zod, returns 200 on success. In production
 * this would also enqueue an email to the Smart EDMS sales team via the
 * licensing server's webhook infrastructure, but that wiring is out of scope
 * for this task — the route returns a success envelope so the front-end form
 * can show its confirmation state.
 *
 * No data is persisted in this scaffold. Real deployments must:
 *   1. Persist the lead in the licensing server's `customer` / `lead` table.
 *   2. Enqueue a notification email via the licensing server webhook module.
 *   3. Rate-limit by IP + email to prevent abuse.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const DEMO_SCHEMA = z.object({
  name: z.string().min(1).max(200),
  workEmail: z.string().email().max(320),
  company: z.string().min(1).max(200),
  role: z.string().max(200).optional(),
  size: z
    .enum(['1-10', '11-50', '51-200', '201-1000', '1000+'])
    .optional(),
  country: z.string().max(100).optional(),
  useCase: z.string().max(5000).optional(),
  phone: z.string().max(50).optional(),
  locale: z.string().max(20).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Invalid JSON body.' },
      { status: 400 },
    );
  }

  const parsed = DEMO_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Validation failed.',
        errors: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 422 },
    );
  }

  // Success. In production, persist the lead and enqueue the notification
  // email here. For now we just acknowledge.
  return NextResponse.json(
    {
      ok: true,
      message: 'Demo request received.',
      // Echo the parsed email so the client can show a "we'll email you at X"
      // confirmation. PII is intentionally minimal in the response.
      email: parsed.data.workEmail,
    },
    { status: 200 },
  );
}

/**
 * Method-not-allowed handler. Next.js will return 405 automatically, but we
 * also include an Allow header for clarity.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { ok: false, message: 'Method not allowed. Use POST.' },
    { status: 405, headers: { Allow: 'POST' } },
  );
}
