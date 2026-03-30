/**
 * Generate a bcrypt hash for a password
 * Usage: npx tsx scripts/hash-password.ts "your-password"
 */

import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password) {
  console.error('Usage: npx tsx scripts/hash-password.ts "your-password"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log(hash);
