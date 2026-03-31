# Bcrypt Hash in Environment Variables

## Issue

Bcrypt hashes contain `$` characters (e.g., `$2b$10$...`) which can be interpreted as variable references by some dotenv parsers, causing the hash to be truncated.

## Symptom

- Login fails with 401 even with correct credentials
- Hash length in logs shows ~32 characters instead of 60
- Hash prefix doesn't start with `$2b$` or `$2a$`

## Solution

Escape each `$` with a backslash in your `.env` / `.env.local` file:

```
ADMIN_PASSWORD_HASH=\$2b\$10\$gIzvM73qB3dvpWAC9P8touM7ur6AHdtPPHjWAFRp.2bWE0WKtkKuq
```

## Notes

- This behavior may vary between Next.js versions and dotenv implementations
- Double quotes (`"$2b$..."`) work in some setups but not all
- Single quotes are treated literally and included in the value
- Always verify hash length is 60 characters after server restart
