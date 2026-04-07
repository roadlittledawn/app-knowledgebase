#!/bin/bash
# Vercel Ignored Build Step script.
# Exit 1 = proceed with build. Exit 0 = skip build.
#
# Deployments are handled by GitHub Actions (.github/workflows/vercel-deploy.yml)
# which uses `vercel deploy` directly and bypasses this script.
#
# This script skips ALL Git-triggered builds from Vercel's automatic integration.

echo "Skipping Git-triggered build (env: $VERCEL_ENV, branch: $VERCEL_GIT_COMMIT_REF)"
echo "Deployments are handled by GitHub Actions."
exit 0
