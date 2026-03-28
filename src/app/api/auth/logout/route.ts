import { NextResponse } from 'next/server';
import { getAuthCookieName } from '@/lib/auth';

interface LogoutResponse {
  ok: true;
}

export async function POST(): Promise<NextResponse<LogoutResponse>> {
  const response = NextResponse.json<LogoutResponse>({ ok: true });

  // Clear the auth cookie by setting it to expire immediately
  response.cookies.set(getAuthCookieName(), '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // Expire immediately
  });

  return response;
}
