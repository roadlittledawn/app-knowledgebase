# Knowledgebase

[![Vercel Deploy](https://deploy-badge.vercel.app/vercel/app-knowledgebase)](https://kb.clintonlangosch.com/browse)
[![PR Validation](https://github.com/roadlittledawn/app-knowledgebase/actions/workflows/pr-validation.yml/badge.svg)](https://github.com/roadlittledawn/app-knowledgebase/actions/workflows/pr-validation.yml)

A personal knowledgebase for writing, storing, and browsing technical how-tos and articles on software engineering and technical writing.

## Stack

- **Framework:** Next.js 16, App Router, TypeScript
- **Database:** MongoDB Atlas + Mongoose
- **Vector DB:** Pinecone
- **AI:** Anthropic SDK (claude-opus-4-6)
- **Styling:** Tailwind CSS v4
- **MDX:** next-mdx-remote + @roadlittledawn/docs-design-system-react (content rendering)
- **Auth:** [clang-auth](https://auth.clintonlangosch.com) shared sign-on (see [Auth](#auth))
- **Deployment:** Vercel (Fluid Compute)

## Features

- Browse and search articles by topic, tag, and language
- Hybrid search (MongoDB Atlas full-text + Pinecone semantic)
- MDX editor with live preview and frontmatter form
- AI writing assistant with researcher / writer / reviewer personas
- RAG-powered chat over your knowledgebase
- Admin dashboard with stats and writing agent configuration
- Dark mode by default

## Development

```bash
# Install dependencies
npm install

# Copy env file and fill in values
cp .env.example .env.local

# Run dev server (open http://kb.localtest.me:3003, not localhost; see Auth)
npx next dev -p 3003
```

## Environment Variables

See `.env.example` for required variables (MongoDB, Pinecone, Anthropic, S3, clang-auth).

## Auth

Sign-in is handled by clang-auth, the shared auth service for `*.clintonlangosch.com`. The app lives at `https://kb.clintonlangosch.com` (slug `kb`); the old `app-knowledgebase.vercel.app` address redirects there. Admin access requires the `kb:admin` grant.

For local development, run clang-auth locally (`http://auth.localtest.me:4000`), register the app, and grant yourself access:

```bash
clang-auth app create kb --name Knowledgebase --origin http://kb.localtest.me:3003
clang-auth grant set dev@localtest.me kb --role admin
```

Then open `http://kb.localtest.me:3003`. Vercel preview deployments don't receive the sign-in cookie, so they only show the public view. Details: [docs/clang-auth-migration.md](docs/clang-auth-migration.md).
