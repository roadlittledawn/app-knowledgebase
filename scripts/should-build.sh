#!/bin/bash
# Vercel Ignored Build Step script.
# Exit 1 = proceed with build. Exit 0 = skip build.
#
# Desired behavior:
#   - Push to `main`          → production build  (VERCEL_ENV=production)
#   - PR targeting `main`     → preview build     (VERCEL_ENV=preview)
#   - Everything else         → skip

if [ "$VERCEL_ENV" = "production" ]; then
  echo "Production build — proceeding (branch: $VERCEL_GIT_COMMIT_REF)"
  exit 1
fi

if [ "$VERCEL_ENV" = "preview" ]; then
  echo "Preview build — proceeding (branch: $VERCEL_GIT_COMMIT_REF)"
  exit 1
fi

echo "Skipping build (env: $VERCEL_ENV, branch: $VERCEL_GIT_COMMIT_REF)"
exit 0
