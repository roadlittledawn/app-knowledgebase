# Bcrypt Hash in Environment Variables

## Issue

Bcrypt hashes contain `$` characters (e.g., `$2b$10$...`) which can be interpreted as variable references by some dotenv parsers, causing the hash to be truncated.

## Symptom

- Login fails with 401 even with correct credentials
- Hash length in logs shows ~32 characters instead of 60
- Hash prefix doesn't start with `$2b$` or `$2a$`

## Solution

### `.env.local` — wrap in single quotes

dotenv-expand does not interpolate `$` inside single quotes. dotenv strips the quotes before setting the value, so `process.env.ADMIN_PASSWORD_HASH` receives the raw hash.

```
ADMIN_PASSWORD_HASH='$2b$10$gIzvM73qB3dvpWAC9P8touM7ur6AHdtPPHjWAFRp.2bWE0WKtkKuq'
```

### Vercel dashboard — paste the raw hash, no quoting or escaping

Vercel stores env vars as plain strings (no dotenv parsing). Paste the hash exactly as bcrypt outputs it.

```
$2b$10$gIzvM73qB3dvpWAC9P8touM7ur6AHdtPPHjWAFRp.2bWE0WKtkKuq
```

## Verification

The login route logs `hashLength` and `hashPrefix`. After setting the variable, check Vercel/local logs on a failed login attempt:

- `hashLength` should be **60**
- `hashPrefix` should start with **`$2b$`**
