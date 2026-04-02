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
| Auth | JWT + bcryptjs, HTTP-only cookie, single admin user |
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
```

There are no tests. Do not add a test framework unless explicitly requested.

## Project Structure

```
src/
  app/                  # Next.js App Router pages & API routes
    api/
      auth/             # login, logout
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
    login/
  lib/
    db/                 # MongoDB connection + Mongoose models
    pinecone/           # Pinecone client + helpers
    auth/               # JWT helpers
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

Single-admin model. Credentials (`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`) come from env vars. JWT stored as HTTP-only cookie. Protected routes checked via middleware.

## Environment Variables

See `.env.example` for all required variables:

```
MONGODB_URI
PINECONE_API_KEY
PINECONE_INDEX_NAME
ANTHROPIC_API_KEY
AUTH_SECRET
ADMIN_USERNAME
ADMIN_PASSWORD_HASH
```

Never commit `.env.local`. All env vars are server-side runtime only (no `NEXT_PUBLIC_` vars in active use).

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
- **Dynamic rendering on auth-gated pages** — use `export const dynamic = 'force-dynamic'` on pages that check auth cookies
- **Monaco editor** — loaded dynamically with `ssr: false`
- **MDX rendering** — always use the DDS component map; do not use raw HTML elements for MDX content
- **Color tokens** — use CSS custom properties for all UI colors; no hardcoded values
- **Import paths** — use `@/*` alias (maps to `src/*`)
