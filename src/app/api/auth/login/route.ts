import { NextRequest, NextResponse } from 'next/server';
import { signToken, getAuthCookieName, verifyPassword } from '@/lib/auth';

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  ok: true;
}

interface ErrorResponse {
  error: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<LoginResponse | ErrorResponse>> {
  try {
    const body = (await request.json()) as LoginRequest;
    const { username, password } = body;

    // Validate request body
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    // Get admin credentials from environment
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    console.log('Login attempt:', {
      username,
      adminUsername,
      hasHash: !!adminPasswordHash,
      hashLength: adminPasswordHash?.length,
      hashPrefix: adminPasswordHash?.substring(0, 7),
    });

    if (!adminUsername || !adminPasswordHash) {
      console.error('Admin credentials not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Verify credentials
    const usernameMatches = username === adminUsername;
    const passwordMatches = await verifyPassword(password, adminPasswordHash);

    console.log('Verification result:', { usernameMatches, passwordMatches });

    if (!usernameMatches || !passwordMatches) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Sign JWT token
    const token = await signToken({ username });

    // Create response with HTTP-only cookie
    const response = NextResponse.json<LoginResponse>({ ok: true });
    response.cookies.set(getAuthCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
