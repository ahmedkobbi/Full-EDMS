/**
 * Smart EDMS marketing site — trial request API route (spec §7.5, §12.11).
 *
 * POST /api/trial
 *
 * Validates the request body with zod, returns 200 on success. In production
 * this would also:
 *   1. Create a trial tenant record in the licensing server's `customer` /
 *      `trial` table.
 *   2. Enqueue a notification email to the requester and the Smart EDMS
 *      onboarding team.
 *   3. Rate-limit by IP + email to prevent abuse.
 *
 * For this scaffold the route just validates input and returns a success
 * envelope so the front-end form can show its confirmation state.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

const TRIAL_SCHEMA = z.object({
  name: z.string().min(1).max(200),
  workEmail: z.string().email().max(320),
  company: z.string().min(1).max(200),
  size: z.enum(['1-10', '11-50', '51-200', '201-1000', '1000+']),
  country: z.string().max(100).optional().default(''),
  useCase: z.string().max(5000).optional().default(''),
  locale: z.string().max(20).optional().default('en'),
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

  const parsed = TRIAL_SCHEMA.safeParse(body);
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

  // Success. In production, create the trial tenant and enqueue the email.
  return NextResponse.json(
    {
      ok: true,
      message: 'Trial request received.',
      email: parsed.data.workEmail,
    },
    { status: 200 },
  );
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { ok: false, message: 'Method not allowed. Use POST.' },
    { status: 405, headers: { Allow: 'POST' } },
  );
}
