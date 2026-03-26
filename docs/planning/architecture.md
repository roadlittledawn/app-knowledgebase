# Knowledgebase App — Spec-Driven Development Plan

## Context

Building a personal knowledgebase app to write, store, and browse technical how-tos, concepts on software engineering and technical writing/documentation. The app replaces a flat-file MDX repo at `/Users/clinton/Projects/knowledgebase` with a full-featured web app backed by MongoDB Atlas, with AI-powered chat (RAG), AI writing assistance, hybrid search, and an MDX editor with live preview.

This plan covers the complete architecture spec. The AI writing agent system prompt and skills design is a separate follow-up.

---

## Tech Stack

| Concern          | Choice                                              |
| ---------------- | --------------------------------------------------- |
| Framework        | Next.js 16, App Router, TypeScript                  |
| Database         | MongoDB Atlas (required for Atlas full-text search) |
| ODM              | Mongoose                                            |
| Vector DB        | Pinecone                                            |
| AI               | Anthropic SDK (claude-opus-4-6)                     |
| Design System    | @roadlittledawn/docs-design-system-react            |
| Styling          | Tailwind CSS v4                                     |
| MDX              | next-mdx-remote                                     |
| Editor           | @monaco-editor/react (dynamic import, SSR: false)   |
| Syntax highlight | Shiki                                               |
| Auth             | jsonwebtoken + bcryptjs, HTTP-only cookie           |
| Deployment       | Vercel                                              |

---

## File Structure

```
app-knowledgebase/
├── .env.local                         # AUTH_SECRET, MONGODB_URI, PINECONE_*, ANTHROPIC_API_KEY
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── middleware.ts                       # JWT route guard
├── scripts/
│   └── migrate.ts                     # One-time import from flat-file repo
└── src/
    ├── app/
    │   ├── layout.tsx                  # Root: ThemeProvider, DDS styles, pre-paint script
    │   ├── globals.css                 # CSS custom props, dark/light vars, Tailwind
    │   ├── page.tsx                    # Redirect to /browse
    │   ├── login/page.tsx
    │   ├── browse/
    │   │   ├── layout.tsx              # Sidebar (TopicTree) + main area
    │   │   ├── page.tsx                # Entry list / search results
    │   │   └── [...slug]/page.tsx      # Entry detail (rendered MDX)
    │   ├── admin/
    │   │   └── page.tsx               # Dashboard (protected)
    │   ├── chat/page.tsx               # AI chat (protected)
    │   ├── entries/
    │   │   ├── new/page.tsx            # Create (protected)
    │   │   └── [id]/edit/page.tsx      # Edit (protected)
    │   └── api/
    │       ├── auth/login/route.ts
    │       ├── auth/logout/route.ts
    │       ├── entries/route.ts        # GET list, POST create
    │       ├── entries/[id]/route.ts   # GET one, PUT, DELETE
    │       ├── search/route.ts         # Hybrid search
    │       ├── preview/route.ts        # MDX serialize for live preview
    │       ├── tags/route.ts           # Enumerate all tags/topics/languages
    │       ├── chat/route.ts           # RAG chat (SSE stream)
    │       ├── ai/writing-agent/route.ts   # Editor AI assist (SSE stream)
    │       └── admin/stats/route.ts
    ├── components/
    │   ├── layout/
    │   │   ├── AppShell.tsx
    │   │   ├── TopNav.tsx
    │   │   └── ThemeToggle.tsx
    │   ├── editor/
    │   │   ├── EntryEditor.tsx         # Orchestrator: Monaco + preview + form + AI panel
    │   │   ├── MonacoPane.tsx          # Dynamic-imported Monaco instance
    │   │   ├── PreviewPane.tsx         # Debounced MDX preview via /api/preview
    │   │   ├── FrontmatterForm.tsx     # Title, topics, tags, skillLevel, isPrivate toggle, resources, related
    │   │   ├── AIWritingPanel.tsx      # Collapsible panel: actions + SSE output + Apply
    │   │   └── SplitLayout.tsx        # Resizable panes (react-resizable-panels)
    │   ├── browse/
    │   │   ├── TopicTree.tsx           # File-explorer tree, grouped by topicPath
    │   │   ├── EntryCard.tsx
    │   │   ├── EntryDetail.tsx         # Full rendered entry
    │   │   ├── SearchBar.tsx           # Debounced input → /api/search
    │   │   ├── TagFilter.tsx           # Multi-select chip filter
    │   │   └── RelatedEntries.tsx
    │   ├── chat/
    │   │   ├── ChatInterface.tsx
    │   │   ├── MessageList.tsx
    │   │   ├── MessageBubble.tsx
    │   │   ├── ChatInput.tsx
    │   │   └── SourceCitations.tsx    # Cited entries shown after response
    │   ├── admin/
    │   │   ├── StatsPanel.tsx
    │   │   ├── RecentEntries.tsx
    │   │   └── TopTagsChart.tsx
    │   └── shared/
    │       ├── MdxRenderer.tsx         # MDXRemote + full DDS component map
    │       ├── CodePlayground.tsx      # iframe embed (CodeSandbox/JSFiddle/CodePen)
    │       ├── SkillLevelBadge.tsx
    │       ├── ResourceList.tsx
    │       └── TopicBreadcrumb.tsx
    ├── lib/
    │   ├── db/
    │   │   ├── mongoose.ts             # Connection singleton
    │   │   ├── models/Entry.ts         # Mongoose schema + TS interface
    │   │   └── queries/
    │   │       ├── entries.ts          # Reusable query helpers
    │   │       └── search.ts           # Atlas $search pipeline builder
    │   ├── pinecone/
    │   │   ├── client.ts
    │   │   ├── upsert.ts               # Embed + upsert vector
    │   │   └── query.ts                # Semantic search
    │   ├── ai/
    │   │   ├── anthropic.ts            # Client singleton
    │   │   ├── chat.ts                 # RAG flow + streaming
    │   │   └── writing-agent.ts        # Action dispatch + streaming
    │   ├── auth/
    │   │   ├── jwt.ts                  # sign/verify helpers
    │   │   └── password.ts             # bcryptjs compare
    │   ├── mdx/
    │   │   ├── serialize.ts            # next-mdx-remote serialize wrapper
    │   │   └── dds-components.ts       # DDS component map
    │   └── search/
    │       └── merge.ts               # Deduplicate + rank Atlas + Pinecone results
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useTheme.ts
    │   ├── useSearch.ts
    │   ├── useChatStream.ts
    │   └── useDebounce.ts
    ├── providers/
    │   ├── AuthProvider.tsx
    │   └── ThemeProvider.tsx
    └── types/
        ├── entry.ts
        ├── search.ts
        ├── chat.ts
        └── api.ts
```

---

## Data Models

### Entry (MongoDB/Mongoose)

```typescript
// src/types/entry.ts
interface Resource {
  title: string;
  linkUrl: string;
}

interface EntryFrontmatter {
  title: string;
  topics: string[]; // e.g. ["bash", "search"]
  tags: string[]; // freeform tags
  languages: string[]; // e.g. ["javascript", "bash"]
  skillLevel: 1 | 2 | 3 | 4 | 5;
  needsHelp: boolean;
  isPrivate: boolean; // when true, entry is hidden from unauthenticated views
  resources: Resource[];
  relatedEntries: string[]; // ObjectId refs
}

interface IEntry {
  _id: string;
  slug: string; // unique, URL-safe
  topicPath: string; // e.g. "programming/bash"
  frontmatter: EntryFrontmatter;
  body: string; // raw MDX (without frontmatter YAML)
  pineconeId: string;
  sourceFile?: string; // migration provenance
  createdAt: Date;
  updatedAt: Date;
}
```

**Mongoose indexes:**

- `slug` — unique
- `topicPath` — for tree queries
- `frontmatter.topics`, `frontmatter.tags`, `frontmatter.languages`
- `frontmatter.isPrivate` — for efficient public-only filtering

**Atlas Search index** (`entry_search`):

- Fields: `frontmatter.title` (lucene.standard, boosted 2×), `body` (lucene.standard), `frontmatter.topics/tags/languages` (lucene.keyword)

**No other collections.** Tags are aggregated from entries. Auth is env-var only (single user).

---

## API Contracts

All write operations (`POST /api/entries`, `PUT`, `DELETE`) and protected pages require valid `auth_token` HTTP-only cookie. Reads are public, except entries with `isPrivate: true` which are excluded from all unauthenticated responses.

### Auth

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | /api/auth/login | `{username, password}` | Sets cookie. `{ok: true}` or 401 |
| POST | /api/auth/logout | — | Clears cookie. `{ok: true}` |

### Entries

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | /api/entries | No | `?topicPath&tag&language&page&limit&sort` → `{entries[], total, page, pages}` (body excluded). Unauthenticated requests exclude entries where `isPrivate: true`. |
| POST | /api/entries | Yes | `{slug?, topicPath, frontmatter, body}` → `{entry: IEntry}`. Side effect: Pinecone upsert |
| GET | /api/entries/[id] | No | `{entry: IEntry}`. Returns 404 for private entries when unauthenticated (avoids revealing existence). |
| PUT | /api/entries/[id] | Yes | Partial update → `{entry: IEntry}`. Re-embeds if body/title changed |
| DELETE | /api/entries/[id] | Yes | `{ok: true}`. Deletes Pinecone vector |

### Search

`GET /api/search?q&mode=hybrid&tags&topics&languages&limit` → `{results: [{entry (no body), score, source: "atlas"|"pinecone"|"both", excerpt?}], total}`. Unauthenticated requests exclude private entries at both the Atlas query (`{ "frontmatter.isPrivate": { $ne: true } }`) and post-merge filter stages.

### Preview

`POST /api/preview` body: `{mdx: string}` → `{serialized: MDXRemoteSerializeResult}` Used by live preview (no auth required — content is not persisted).

### Chat

`POST /api/chat` (auth required) body: `{messages: [{role, content}][]}` → SSE stream: `data: {delta: string}` … `data: {done: true, sources: [{id, title, slug, topicPath}]}`

### AI Writing Agent

`POST /api/ai/writing-agent` (auth required) body: `{action: "review"|"improve"|"expand"|"suggest-title"|"suggest-tags", body, frontmatter, selection?}` → SSE stream: `data: {delta: string}` … `data: {done: true}`

### Admin

`GET /api/admin/stats` (auth required) → `{totalEntries, totalTopics, totalTags, needsHelpCount, recentlyCreated[], recentlyUpdated[], topTags[], topTopics[], skillLevelDistribution}`

### Tags

`GET /api/tags` (No auth) → `{tags: string[], topics: string[], languages: string[]}`

---

## Pages

| URL | Auth | Description |
| --- | --- | --- |
| `/` | No | Redirects to `/browse` |
| `/login` | No (redirect if authed) | Username/password form → POST /api/auth/login |
| `/browse` | No | Two-col: TopicTree sidebar + EntryCard list + SearchBar + TagFilter |
| `/browse/[...slug]` | No | EntryDetail (rendered MDX) with RelatedEntries and ResourceList |
| `/chat` | Yes | Full-page ChatInterface with streaming RAG responses + SourceCitations |
| `/entries/new` | Yes | EntryEditor: Monaco + FrontmatterForm + PreviewPane + AIWritingPanel |
| `/entries/[id]/edit` | Yes | Same as new, loads existing entry. Includes Delete button |
| `/admin` | Yes | StatsPanel + RecentEntries + TopTagsChart |

---

## Middleware

```typescript
// middleware.ts — protect all write routes + protected pages
const PROTECTED_PREFIXES = [
  "/admin",
  "/chat",
  "/entries",
  "/api/chat",
  "/api/ai",
  "/api/admin",
];

// GET /api/entries and GET /api/entries/[id] are public.
// POST/PUT/DELETE on /api/entries are protected via withAuth() helper inside route handlers.

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const isProtected = PROTECTED_PREFIXES.some((p) =>
    request.nextUrl.pathname.startsWith(p),
  );
  if (!isProtected) return NextResponse.next();
  if (!token || !verifyJwt(token)) {
    return request.nextUrl.pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url));
  }
}
```

Auth pattern reused from `/Users/clinton/Projects/portfolio-site`:

- `src/lib/auth/jwt.ts` — sign/verify with `AUTH_SECRET`
- `src/lib/auth/password.ts` — bcryptjs compare with `ADMIN_PASSWORD_HASH`
- `providers/AuthProvider.tsx` — client-side re-verify on mount

---

## Search Architecture

Three-layer hybrid search merged at `/api/search`:

1. **MongoDB Atlas full-text** — keyword/phrase, fuzzy match, field boosting
2. **Pinecone semantic** — embedding-based meaning search (same model used at index time)
3. **Tag/topic filter** — applied as both a query constraint and post-merge filter

**Merge strategy** (`src/lib/search/merge.ts`):

- Normalize Atlas scores to 0–1, weight 50%
- Pinecone cosine scores weighted 50%
- Entries found in both sources score highest
- Final list sorted by combined score, deduped by `_id`

---

## AI Chat RAG Flow (src/lib/ai/chat.ts)

1. Embed last user message → query Pinecone (topK=5)
2. Fetch matching entry bodies from MongoDB by IDs (no `isPrivate` filter — chat is auth-gated, so private entries are available as context)
3. Build context string (each entry truncated to ~1500 tokens, max 5 entries)
4. Assemble Anthropic messages: system prompt + RAG context + conversation history (last 10 turns) + user message
5. `anthropic.messages.stream(...)` → pipe SSE deltas to client
6. On stream end, emit `{done: true, sources: [...]}` from Pinecone metadata

Model: `claude-opus-4-6`

---

## MDX Editor Architecture

```
EntryEditor (full viewport)
├── TopBar: slug | topicPath | Save | AI toggle
├── SplitLayout (react-resizable-panels)
│   ├── Left pane
│   │   ├── FrontmatterForm (collapsible)
│   │   └── MonacoPane (Monaco, language=markdown, theme synced to dark/light)
│   └── Right pane: PreviewPane
└── AIWritingPanel (slide-in drawer)
    ├── Action buttons (Review / Improve / Expand / Suggest Tags / Suggest Title)
    ├── Streaming markdown output
    └── Apply (inserts into Monaco) / Dismiss
```

**Key decisions:**

- **Frontmatter is NOT in Monaco.** The `FrontmatterForm` manages metadata separately; on save, frontmatter is serialized to YAML and prepended to body as `---` block. On load, frontmatter is stripped from body and hydrated into form state.
- **Live preview** uses 600ms debounce + `POST /api/preview` (server-side serialize, returns `MDXRemoteSerializeResult`). Avoids client-side MDX compilation complexity.
- **Monaco** must be `dynamic(() => import(...), { ssr: false })` to avoid SSR issues.
- `AIWritingPanel` reads Monaco selection via `editorRef.getModel().getValueInRange(selection)` for context-aware suggestions.

---

## Migration Script (scripts/migrate.ts)

Source: `/Users/clinton/Projects/knowledgebase/src/articles/**/*.{md,mdx}` Also migrates: `src/files/ai-agents/**/*.md`

Run with: `npx tsx scripts/migrate.ts`

**Logic per file:**

1. Parse frontmatter with `gray-matter`
2. Derive `topicPath` from relative directory path
3. Derive `slug` from filename (or `fm.slug` if present)
4. Normalize frontmatter (fill in missing fields with defaults)
5. Check for existing slug in MongoDB (idempotent)
6. `Entry.create(...)` in MongoDB
7. `upsertVector(...)` to Pinecone with entry metadata
8. Update `pineconeId` on entry

**Frontmatter normalization defaults:**

| Source field | Target field                 | Default if missing    |
| ------------ | ---------------------------- | --------------------- |
| `title`      | `frontmatter.title`          | filename de-slugified |
| `topics`     | `frontmatter.topics`         | `[]`                  |
| `languages`  | `frontmatter.languages`      | `[]`                  |
| `skillLevel` | `frontmatter.skillLevel`     | `3`                   |
| `needsHelp`  | `frontmatter.needsHelp`      | `false`               |
| `isPrivate`  | `frontmatter.isPrivate`      | `false`               |
| `resources`  | `frontmatter.resources`      | `[]`                  |
| n/a (new)    | `frontmatter.tags`           | `[]`                  |
| n/a (new)    | `frontmatter.relatedEntries` | `[]`                  |

AI agent files (`src/files/ai-agents/`): title from first `# heading` or filename, `topics: ["ai-agents"]`, `languages: ["markdown"]`

---

## Theme / Dark Mode

Reuse pattern from `/Users/clinton/Projects/writing-samples-website`:

- Pre-paint inline `<script>` in `<head>` reads `localStorage.theme`, sets `dds-dark` or `dds-light`/`light` on `<html>` before paint (prevents FOUC)
- `ThemeProvider.tsx` — `useSyncExternalStore` + `MutationObserver` on `document.documentElement`
- CSS custom properties in `globals.css` for site colors
- `@roadlittledawn/docs-design-system-react/styles.css` imported in root layout

---

## DDS Component Map (src/lib/mdx/dds-components.ts)

Reuse component map from `/Users/clinton/Projects/writing-samples-website/app/samples/[...slug]/page.tsx`:

```
Callout, Card, CardGrid, Heading, CodeBlock, Link, List, ListItem,
Collapser, CollapserGroup, Grid, Column, Popover, Table, TableHead,
TableBody, TableRow, TableHeaderCell, TableCell, Tabs, TabList, Tab, TabPanel
```

---

## Environment Variables

```
AUTH_SECRET=          # Random 32+ char string for JWT signing
ADMIN_USERNAME=       # Single admin login
ADMIN_PASSWORD_HASH=  # bcryptjs hash
MONGODB_URI=          # mongodb+srv://...
PINECONE_API_KEY=
PINECONE_INDEX_NAME=knowledgebase
ANTHROPIC_API_KEY=
NEXT_PUBLIC_APP_URL=  # https://... (for absolute URLs if needed)
```

---

## Key Dependencies

```json
{
  "next": "^16",
  "mongoose": "^8",
  "@pinecone-database/pinecone": "^4",
  "@anthropic-ai/sdk": "latest",
  "next-mdx-remote": "^5",
  "@monaco-editor/react": "^4",
  "@roadlittledawn/docs-design-system-react": "latest",
  "jsonwebtoken": "^9",
  "bcryptjs": "^3",
  "gray-matter": "^4",
  "shiki": "^1",
  "slugify": "^1",
  "react-resizable-panels": "^2",
  "tailwindcss": "^4"
}
```

---

## Implementation Phases

### Phase 1 — Foundation

- Init Next.js 16 + TypeScript + Tailwind v4
- Install and configure DDS (styles import in root layout)
- ThemeProvider + pre-paint script + ThemeToggle
- MongoDB Atlas connection + Entry model
- Create Atlas Search index `entry_search`
- JWT auth: `lib/auth/jwt.ts`, `password.ts`, login/logout API routes
- `middleware.ts` route protection
- `AuthProvider` + `/login` page

**✓ Checkpoint:** App boots, dark mode works, DDS renders, login/logout functional

### Phase 2 — Migration + Browse

- Migration script: import all articles from flat-file repo into MongoDB + Pinecone
- `GET /api/entries` + `GET /api/tags`
- `TopicTree` component
- `/browse` layout + entry list
- `MdxRenderer` with DDS component map + Shiki
- `/browse/[...slug]` entry detail

**✓ Checkpoint:** All existing content browsable and readable

### Phase 3 — Search

- Atlas full-text search pipeline
- Pinecone semantic query
- Result merge/ranking
- `GET /api/search`
- `SearchBar` + `useSearch` + `TagFilter` + `SearchResults`

**✓ Checkpoint:** Hybrid search returns relevant results

### Phase 4 — MDX Editor

- Dynamic Monaco import + `MonacoPane`
- `POST /api/preview` (serialize MDX)
- `PreviewPane` with debounced calls
- `FrontmatterForm`
- `SplitLayout` (react-resizable-panels)
- `EntryEditor` orchestrator
- `POST /api/entries`, `GET/PUT/DELETE /api/entries/[id]`
- `/entries/new` + `/entries/[id]/edit` pages

**✓ Checkpoint:** Full CRUD via editor with live preview

### Phase 5 — AI Features

- Anthropic client singleton
- RAG chat flow + streaming (`lib/ai/chat.ts`)
- `POST /api/chat` SSE endpoint
- `useChatStream` hook + `ChatInterface` + `/chat` page
- Writing agent flow + `POST /api/ai/writing-agent` SSE
- `AIWritingPanel` in editor with Apply-to-Monaco

**✓ Checkpoint:** RAG chat + editor AI assist working

### Phase 6 — Admin + Polish

- `GET /api/admin/stats` (MongoDB aggregation)
- Admin dashboard with stats, recent entries, top tags
- `CodePlayground` iframe embed component
- Mobile responsiveness
- Error boundaries + loading states
- Vercel deployment (env vars, Atlas IP allowlist for Vercel)

**✓ Checkpoint:** Production deployment on Vercel

---

## Critical Files

| File | Why |
| --- | --- |
| `src/lib/db/models/Entry.ts` | Core schema — everything depends on it |
| `middleware.ts` | Auth gate for all protected routes |
| `src/app/api/entries/route.ts` | Primary CRUD + Pinecone sync side effects |
| `src/components/editor/EntryEditor.tsx` | Most complex component |
| `src/app/api/chat/route.ts` | RAG pipeline + streaming |
| `scripts/migrate.ts` | High-stakes one-time import |

## Reference Files

| Pattern | Source |
| --- | --- |
| Auth (middleware, login, JWT, bcrypt) | `/Users/clinton/Projects/portfolio-site/src/middleware.ts`, `netlify/functions/auth-login.js` |
| Theme / DDS setup | `/Users/clinton/Projects/writing-samples-website/app/layout.tsx`, `components/ThemeProvider.tsx` |
| MDX component map | `/Users/clinton/Projects/writing-samples-website/app/samples/[...slug]/page.tsx` |
| Existing content | `/Users/clinton/Projects/knowledgebase/src/articles/**` |
| AI agent files | `/Users/clinton/Projects/knowledgebase/src/files/ai-agents/**` |
