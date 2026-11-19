// Server-side auth. Browser code imports '@/lib/auth/client' instead.
export {
  ACCESS_COOKIE,
  REQUIRED_ROLE,
  authSettings,
  loginUrl,
  resolveToken,
  verifyAccessToken,
  type AccessClaims,
  type AuthState,
  type Session,
} from './clang-auth';
export { getAuthState, getSession, isAuthenticated, loginUrlFor } from './session';
