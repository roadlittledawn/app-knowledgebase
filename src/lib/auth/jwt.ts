import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export interface AuthPayload extends JWTPayload {
  username: string;
}

const JWT_EXPIRATION = '7d';
const COOKIE_NAME = 'auth_token';

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Signs a JWT token with the given payload
 */
export async function signToken(payload: { username: string }): Promise<string> {
  const token = await new SignJWT({ username: payload.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(getSecret());

  return token;
}

/**
 * Verifies a JWT token and returns the payload
 * Returns null if the token is invalid or expired
 */
export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as AuthPayload;
  } catch {
    return null;
  }
}

/**
 * Gets the cookie name used for authentication
 */
export function getAuthCookieName(): string {
  return COOKIE_NAME;
}
