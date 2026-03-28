import bcrypt from 'bcryptjs';

/**
 * Verifies a password against a bcrypt hash
 * @param password - The plain text password to verify
 * @param hash - The bcrypt hash to compare against
 * @returns true if the password matches the hash, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Hashes a password using bcrypt
 * @param password - The plain text password to hash
 * @param rounds - The number of salt rounds (default: 10)
 * @returns The bcrypt hash of the password
 */
export async function hashPassword(password: string, rounds: number = 10): Promise<string> {
  return bcrypt.hash(password, rounds);
}
