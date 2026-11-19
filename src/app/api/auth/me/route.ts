/**
 * GET /api/auth/me
 *
 * The current clang-auth session, for the UI (AuthProvider). No DB call.
 * - 200 { email, name, roles, exp }: signed in with access to this app
 * - 401: signed out, or the 15-minute token expired (the client may refresh)
 * - 403: signed in, but without a `kb:admin` grant (refreshing won't help)
 */

import { NextResponse } from 'next/server';
import { getAuthState } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await getAuthState();
  const headers = { 'Cache-Control': 'no-store' };
  if (auth.status === 'anonymous') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
  }
  if (auth.status === 'forbidden') {
    return NextResponse.json(
      { error: "You don't have access to this app", email: auth.email },
      { status: 403, headers }
    );
  }
  const { email, name, roles, exp } = auth.session;
  return NextResponse.json({ email, name, roles, exp }, { headers });
}
