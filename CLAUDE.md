# CLAUDE.md

This file provides guidance for Claude Code when working in this repository.

## Project Overview

A personal knowledgebase web app for writing, storing, and browsing technical articles and how-tos. Entries are MDX documents backed by MongoDB Atlas, with Pinecone for semantic search and Anthropic Claude for AI features (RAG chat + writing assistance).

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16, App Router, TypeScript |
| Database | MongoDB Atlas + Mongoose |
| Vector DB | Pinecone (sparse-english integrated embedding) |
| AI | Anthropic SDK (`claude-opus-4-6`) |
| Styling | Tailwind CSS v4 |
| MDX | next-mdx-remote + `@roadlittledawn/docs-design-system-react` |
| Auth | [clang-auth](https://auth.clintonlangosch.com) shared sign-on: ES256 `ca_access` cookie verified via JWKS (`jose`) |
| Deployment | Vercel (Fluid Compute) |

## Branch & Deploy Strategy

- **`develop`** — default integration branch; all feature branches PR into here
- **`main`** — production branch; PRs from `develop` → `main` trigger Vercel production deploy
- PRs to `develop` must pass the **PR Validation** GitHub Actions workflow (lint + type-check + build)
- PRs to `main` are validated by the **Vercel preview deploy** check

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run type-check   # tsc --noEmit
npm run format       # Prettier write
npm run format:check # Prettier check
npm run migrate      # Run content migration script
npm run test:auth    # clang-auth token verification tests (tsx + node:assert)
```

There are no tests. Do not add a test framework unless explicitly requested.

## Project Structure

```
src/
  app/                  # Next.js App Router pages & API routes
    api/
      auth/me/          # current session for the UI (no DB call)
      entries/          # CRUD + listing
      categories/       # category tree + CRUD
      tags/             # unique tag aggregation
      search/           # hybrid search
      chat/             # RAG chat (SSE streaming)
      ai/writing-agent/ # AI writing assistant (SSE streaming)
      preview/          # MDX serialization for live preview
      admin/            # stats, writing-config
    browse/             # public browsing pages
    entries/            # new entry, entry detail, entry edit
    chat/               # chat UI
    admin/              # admin dashboard
    login/              # forwards to clang-auth sign-in (old links keep working)
  lib/
    db/                 # MongoDB connection + Mongoose models
    pinecone/           # Pinecone client + helpers
    auth/               # clang-auth: token verification, getSession(), browser client
    mdx/                # MDX serialization helpers
  types/                # Shared TypeScript types
  components/           # Shared React components
scripts/
  migrate.ts            # One-time content migration from flat-file MDX repo
```

## Data Model

### Entry

```typescript
{
  slug: string           // unique, URL-safe
  categoryId: string     // ref → Category._id
  status: 'draft' | 'published'
  frontmatter: {
    title: string
    tags: string[]       // freeform tags (NOT topics — topics are not used)
    languages: string[]  // e.g. ["javascript", "bash"]
    skillLevel: 1|2|3|4|5
    needsHelp: boolean
    isPrivate: boolean
    resources: { title, linkUrl }[]
    relatedEntries: string[]  // ObjectId refs
  }
  body: string           // raw MDX without frontmatter
  pineconeId?: string
}
```

> **Important:** Entries use **tags only** — there is no `topics` field in active use. Ignore any references to `topics` in older docs or spec files.

### Category

Hierarchical taxonomy with `name`, `slug`, `parentId?`, `order`. Entries belong to exactly one category via `categoryId`.

## Authentication

Sign-in is handled by **clang-auth**, the shared auth service for `*.clintonlangosch.com` (app slug `kb`). Background and rollout: `docs/clang-auth-migration.md`.

- The auth service sets an HttpOnly ES256 JWT cookie, `ca_access` (15 min), on `.clintonlangosch.com`. We verify it locally against the service's JWKS; no call per request.
- "Authenticated" means the token's `apps.kb` includes `admin`. A valid token without that grant is **forbidden**: anonymous on public pages, `403` (never a redirect, it would loop) on protected ones.
- **Server:** use `getSession()` / `isAuthenticated()` / `getAuthState()` from `@/lib/auth`. Don't read the cookie directly or add per-route auth helpers.
- **`src/proxy.ts`** (must live in `src/`; a root-level file is silently ignored) gates protected pages (redirect to sign-in), protected APIs (`401`/`403`), and rejects cross-origin `POST/PUT/PATCH/DELETE` to `/api/*` (CSRF: sibling subdomains are same-site).
- **Browser:** `useAuth()` (`AuthProvider` in the root layout) for UI state; it refreshes the token before expiry. Use `authFetch` from `@/lib/auth/client` for every call to a protected API (refreshes and retries on `401`). Sign out ends the session for every app on the domain.
- **Local dev:** run a local clang-auth (`auth.localtest.me:4000`) and open **`http://kb.localtest.me:3003`** (`next dev -p 3003`), not `localhost`: the cookie is never sent to `localhost`. Vercel preview URLs (`*.vercel.app`) never get the cookie, so previews only show the public view.

## Environment Variables

See `.env.example` for all required variables:

```
MONGODB_URI
PINECONE_API_KEY
PINECONE_INDEX_NAME
ANTHROPIC_API_KEY
AUTH_BASE_URL      # https://auth.clintonlangosch.com (local: http://auth.localtest.me:4000)
AUTH_APP_SLUG      # kb
```

Never commit `.env.local`. All env vars are server-side runtime only (no `NEXT_PUBLIC_` vars in active use; the root layout passes `AUTH_BASE_URL` to `AuthProvider` as a prop).

## Vercel Deployment

- Framework preset: **Next.js**
- Fluid Compute is enabled for streaming routes (`/api/chat`, `/api/ai/writing-agent`) — these set `export const maxDuration = 300`
- `vercel.json` is present for framework and build configuration
- Add all env vars from `.env.example` in the Vercel project dashboard

## Key Conventions

- **No topics field** — the codebase uses `tags` only for metadata/filtering
- **App Router only** — all routes use the Next.js 13+ App Router pattern (`page.tsx`, `route.ts`)
- **Server Components by default** — add `"use client"` only when needed
- **Streaming via SSE** — AI routes use Server-Sent Events, not `Response.json()`
- **Dynamic rendering on auth-gated pages** — use `export const dynamic = 'force-dynamic'` on pages that check the session
- **Monaco editor** — loaded dynamically with `ssr: false`
- **MDX rendering** — always use the DDS component map; do not use raw HTML elements for MDX content
- **MDX expression props** — `next-mdx-remote` v6 defaults `blockJS: true`, which silently strips all JSX expression props (`level={2}` → `undefined`). `serializeMDX` sets `blockJS: false` (with `blockDangerousJS` still on) so `{2}`-style props work — do not remove it. See `docs/mdx-numeric-props-bug.md`.
- **Tailwind arbitrary values** — the `[value]` bracket syntax (e.g. `max-h-[375px]`, `pb-[40px]`) can silently fail to apply in Tailwind v4. Use inline styles for load-bearing sizing/spacing on scroll containers. See `docs/tailwind-v4-arbitrary-values.md`.
- **Color tokens** — use CSS custom properties for all UI colors; no hardcoded values
- **Import paths** — use `@/*` alias (maps to `src/*`)
