# Knowledgebase App — Spec-Driven Development Plan

## Context

Building a personal knowledgebase app to write, store, and browse technical how-tos, concepts on software engineering and technical writing/documentation. The app replaces a flat-file MDX repo at `/Users/clinton/Projects/knowledgebase` with a full-featured web app backed by MongoDB Atlas, with AI-powered chat (RAG), AI writing assistance, hybrid search, and an MDX editor with live preview.

This plan covers the complete architecture spec, including the writing agent system design. The agent configuration is admin-managed at runtime — no redeploys needed to tune prompts, style guides, or skills.

---

## Tech Stack

| Concern          | Choice                                              |
| ---------------- | --------------------------------------------------- |
| Framework        | Next.js 16, App Router, TypeScript                  |
| Database         | MongoDB Atlas (required for Atlas full-text search) |
| ODM              | Mongoose                                            |
| Vector DB        | Pinecone                                            |
| AI               | Anthropic SDK (claude-opus-4-6)                     |
| Content renderer | @roadlittledawn/docs-design-system-react (MDX content only — not site UI) |
| Site styling     | Tailwind CSS v4 + custom CSS design tokens          |
| MDX              | next-mdx-remote                                     |
| Editor           | @monaco-editor/react (dynamic import, SSR: false)   |
| Syntax highlight | Shiki                                               |
| Auth             | jsonwebtoken + bcryptjs, HTTP-only cookie           |
| Deployment       | Vercel (Fluid Compute enabled)                      |

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
    │       ├── admin/stats/route.ts
│       └── admin/writing-config/route.ts  # GET + PUT WritingConfig
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
    │   │   ├── TopTagsChart.tsx
    │   │   └── writing-config/
    │   │       ├── WritingConfigEditor.tsx    # Tabs: Prompts | Style Guide | Skills | Templates
    │   │       ├── AgentPersonaForm.tsx       # Per-role system prompt editor (Monaco)
    │   │       ├── SkillsManager.tsx          # Add/edit/reorder WritingSkill list
    │   │       └── TemplatesManager.tsx       # Add/edit WritingTemplate list
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
│   │   ├── models/WritingConfig.ts # Singleton config document
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
    │   │   └── writing-agent.ts        # Persona dispatch + config/RAG injection + streaming
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
        ├── writing-config.ts
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
  status: 'draft' | 'published'; // publication lifecycle state
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
- `status` — for draft/published filtering
- `frontmatter.isPrivate` — for efficient public-only filtering

**Atlas Search index** (`entry_search`):

- Fields: `frontmatter.title` (lucene.standard, boosted 2×), `body` (lucene.standard), `frontmatter.topics/tags/languages` (lucene.keyword)

**No other collections** except `WritingConfig` (see below). Tags are aggregated from entries. Auth is env-var only (single user).

---

### WritingConfig (MongoDB/Mongoose)

A single document (upserted, never more than one) that stores all admin-managed writing agent guidance. Edited via the admin UI — no redeploy needed to change agent behavior.

```typescript
// src/types/writing-config.ts

interface WritingSkill {
  id: string;
  name: string;           // shown in editor panel button
  description: string;    // tooltip / admin label
  prompt: string;         // injected into agent context when this skill is invoked
}

interface WritingTemplate {
  id: string;
  name: string;
  description: string;
  body: string;                           // MDX template body
  frontmatter: Partial<EntryFrontmatter>; // pre-fills FrontmatterForm
}

interface AgentPersona {
  role: 'researcher' | 'writer' | 'reviewer';
  systemPrompt: string;  // role-specific system prompt
  enabled: boolean;
}

interface WritingConfig {
  _id: string;
  baseSystemPrompt: string;  // injected for all writing agent calls
  styleGuide: string;        // markdown — audience, tone, formatting rules, etc.
  skills: WritingSkill[];    // e.g. "Improve clarity", "Add code example", "Simplify"
  templates: WritingTemplate[];
  agents: AgentPersona[];    // researcher / writer / reviewer personas
  updatedAt: Date;
}
```

**RAG examples:** At invocation time, the writing agent queries Pinecone (topK=3) for entries similar to the current entry's topic/content and injects them as reference examples. No separate index needed — same Pinecone index as search.

---

## API Contracts

All write operations (`POST /api/entries`, `PUT`, `DELETE`) and protected pages require valid `auth_token` HTTP-only cookie. Reads are public, with the following visibility rules applied automatically based on auth state:

| Condition | Public (unauthenticated) | Authenticated (admin) |
| --- | --- | --- |
| `status: 'draft'` | Hidden (404 on direct fetch) | Visible, searchable |
| `status: 'published'` + `isPrivate: false` | Visible | Visible |
| `status: 'published'` + `isPrivate: true` | Hidden (404 on direct fetch) | Visible |

### Auth

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | /api/auth/login | `{username, password}` | Sets cookie. `{ok: true}` or 401 |
| POST | /api/auth/logout | — | Clears cookie. `{ok: true}` |

### Entries

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | /api/entries | No | `?topicPath&tag&language&page&limit&sort&status` → `{entries[], total, page, pages}` (body excluded). Unauthenticated: always filters to `status: 'published'` + `isPrivate: false`. Authenticated: returns all statuses by default; `?status=draft\|published` to filter. |
| POST | /api/entries | Yes | `{slug?, topicPath, status?, frontmatter, body}` → `{entry: IEntry}`. Defaults to `status: 'draft'`. Side effect: Pinecone upsert only if `status: 'published'`. |
| GET | /api/entries/[id] | No | `{entry: IEntry}`. Returns 404 for drafts or private entries when unauthenticated. |
| PUT | /api/entries/[id] | Yes | Partial update → `{entry: IEntry}`. Re-embeds in Pinecone if body/title changed and `status: 'published'`. Removes from Pinecone if changed to `status: 'draft'`. |
| DELETE | /api/entries/[id] | Yes | `{ok: true}`. Deletes Pinecone vector |

### Search

`GET /api/search?q&mode=hybrid&tags&topics&languages&limit` → `{results: [{entry (no body), score, source: "atlas"|"pinecone"|"both", excerpt?}], total}`

- **Unauthenticated:** Atlas query constrained to `{ status: 'published', 'frontmatter.isPrivate': { $ne: true } }`; Pinecone results post-filtered to same.
- **Authenticated:** No status/privacy filter applied — drafts and private entries are fully searchable (enables admin workflow of finding and iterating on drafts).

### Preview

`POST /api/preview` body: `{mdx: string}` → `{serialized: MDXRemoteSerializeResult}` Used by live preview (no auth required — content is not persisted).

### Chat

`POST /api/chat` (auth required) body: `{messages: [{role, content}][]}` → SSE stream: `data: {delta: string}` … `data: {done: true, sources: [{id, title, slug, topicPath}]}`

### AI Writing Agent

`POST /api/ai/writing-agent` (auth required) body: `{action: "review"|"improve"|"expand"|"suggest-title"|"suggest-tags"|"research"|"draft"|"qa-review", persona?: "researcher"|"writer"|"reviewer", body, frontmatter, selection?, context?}` → SSE stream: `data: {delta: string}` … `data: {done: true, artifactType?: "research-report"|"draft"|"qa-findings"}`

The route loads `WritingConfig` from DB on each request, selects the matching `AgentPersona` system prompt (falling back to `baseSystemPrompt`), fetches RAG examples from Pinecone, then streams the response.

### Admin

`GET /api/admin/stats` (auth required) → `{totalEntries, totalTopics, totalTags, needsHelpCount, recentlyCreated[], recentlyUpdated[], topTags[], topTopics[], skillLevelDistribution}`

`GET /api/admin/writing-config` (auth required) → `{config: WritingConfig}`

`PUT /api/admin/writing-config` (auth required) body: `{config: Partial<WritingConfig>}` → `{config: WritingConfig}` (upsert)

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
| `/admin` | Yes | StatsPanel + RecentEntries + TopTagsChart + WritingConfigEditor (tabbed) |

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
2. Fetch matching entry bodies from MongoDB by IDs (no status/privacy filter — chat is auth-gated, so drafts and private entries are available as context)
3. Build context string (each entry truncated to ~1500 tokens, max 5 entries)
4. Assemble Anthropic messages: system prompt + RAG context + conversation history (last 10 turns) + user message
5. `anthropic.messages.stream(...)` → pipe SSE deltas to client
6. On stream end, emit `{done: true, sources: [...]}` from Pinecone metadata

Model: `claude-opus-4-6`

---

## MDX Editor Architecture

```
EntryEditor (full viewport)
├── TopBar: slug | topicPath | Status toggle (Draft / Published) | Save | AI toggle
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

- **Status is a top-level `IEntry` field**, not in frontmatter, so DB queries stay simple. The TopBar status toggle calls `PUT /api/entries/[id]` with `{status}`. Changing to `published` triggers Pinecone upsert; changing to `draft` removes the vector. New entries always start as `draft`.
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
| n/a (new)    | `status`                     | `'published'`         |

AI agent files (`src/files/ai-agents/`): title from first `# heading` or filename, `topics: ["ai-agents"]`, `languages: ["markdown"]`

---

## Theme / Dark Mode

### Separation of concerns

- **DDS (`@roadlittledawn/docs-design-system-react`)** — used exclusively to render authored MDX content (`MdxRenderer`). Its component styles (Callout, CodeBlock, Table, etc.) are scoped to the content area.
- **Site UI** (nav, sidebar, editor shell, admin, browse layout, cards, forms) — styled entirely with Tailwind CSS v4 + custom CSS design tokens defined in `globals.css`. No DDS components outside of `MdxRenderer`.

### Dark mode defaults

**Dark mode is the default.** The pre-paint script falls back to dark if no `localStorage.theme` is set, preventing any flash of light mode on first load.

```html
<!-- inline in <head>, before any CSS -->
<script>
  const t = localStorage.getItem('theme');
  document.documentElement.classList.add(t === 'light' ? 'light' : 'dark');
</script>
```

The `ThemeToggle` component is present from Phase 1 and accessible from `TopNav`. The toggle persists preference to `localStorage`.

### Implementation

- Pre-paint inline `<script>` in `<head>` — sets `dark` or `light` class on `<html>` before paint (prevents FOUC). Defaults to `dark`.
- `ThemeProvider.tsx` — `useSyncExternalStore` + `MutationObserver` on `document.documentElement`; exposes `useTheme()` hook
- `globals.css` — CSS custom properties for site palette (backgrounds, surfaces, borders, text, accents) in both `:root` (dark) and `.light` overrides. Tailwind v4 references these tokens.
- `@roadlittledawn/docs-design-system-react/styles.css` imported in root layout (for DDS content components only)

### Frontend polish

The site UI should be visually distinctive and well-crafted — not a generic Tailwind layout. However, polish is deferred to **Phase 6**. What must be true from Phase 1 onward:

- Dark mode is the default and toggle works correctly
- CSS token structure in `globals.css` is set up properly so Phase 6 polish doesn't require restructuring
- No hardcoded colors anywhere in site UI — always reference tokens

Phase 6 polish scope: typography hierarchy, spacing rhythm, sidebar design, card layout, hover/focus states, transitions, responsive breakpoints.

---

## DDS Component Map (src/lib/mdx/dds-components.ts) — content rendering only

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

## Deployment (Vercel)

Vercel runs API routes as serverless functions (AWS Lambda-backed, Vercel-managed — no manual Lambda setup required). All three external service clients (Mongoose, Pinecone, Anthropic SDK) run inside these route handlers.

### Fluid Compute

Enable **Fluid Compute** in the Vercel project dashboard. This is the default for new projects and significantly increases timeout limits:

| Plan | Default | Max (`maxDuration`) |
| --- | --- | --- |
| Hobby | 300s | 300s |
| Pro | 300s | 800s |
| Enterprise | 300s | 800s |

This eliminates the Netlify 30s timeout problem. Even the free Hobby plan allows 5 minutes by default.

### Streaming routes

Vercel supports SSE streaming natively. For `/api/chat` and `/api/ai/writing-agent`, the client receives token deltas as they arrive — the function stays open until the stream ends. Set `maxDuration` explicitly on long-running routes:

```typescript
// src/app/api/chat/route.ts
// src/app/api/ai/writing-agent/route.ts
export const maxDuration = 300; // seconds — increase to 800 on Pro if needed
```

### Billing note

Vercel bills on **active CPU time** only. Waiting on I/O (Anthropic API calls, MongoDB queries, Pinecone queries) does **not** count as active CPU time, so slow LLM responses won't inflate costs.

### Pre-deployment checklist

- Enable Fluid Compute in project settings
- Add all env vars (see Environment Variables section)
- Add Vercel's static IP ranges to MongoDB Atlas network access allowlist (or use `0.0.0.0/0` for dev)
- Set `maxDuration` on `/api/chat` and `/api/ai/writing-agent` routes

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

## Writing Agent System

### Design philosophy

The agent system is intentionally minimal at launch and designed to grow. Rather than hard-coding agent behavior, all guidance lives in a `WritingConfig` document editable from the admin UI — meaning behavior can be tuned without a redeploy. Agents access the same RAG index as the chat feature, so past entries naturally serve as style/structure examples.

### Agent context assembly (src/lib/ai/writing-agent.ts)

Every writing agent call assembles its context in this order:

1. Load `WritingConfig` from MongoDB
2. Select `AgentPersona` matching the requested role (fallback: `baseSystemPrompt`)
3. Query Pinecone (topK=3) for entries similar to current topic/content → inject as "Reference examples" block
4. Inject `styleGuide` as a "Style guide" block
5. If a skill is specified, inject `skill.prompt` as an "Active skill" block
6. Append the action-specific user message (the entry body, selection, or prior artifact)
7. Stream response via `anthropic.messages.stream(...)`

### Agent roles (MVP — manual, sequential)

Three named personas, each with its own system prompt configurable in the admin UI:

| Role | Purpose | Input | Output |
| --- | --- | --- | --- |
| `researcher` | Investigates a topic, finds angles, surfaces questions to answer | Topic/title + optional notes | Research report (markdown) |
| `writer` | Drafts the article | Research report or direct prompt + frontmatter | Draft MDX body |
| `reviewer` | Evaluates the draft against stated audience and quality standards | Draft + frontmatter + style guide | QA findings (structured markdown) |

**MVP interaction model:** The author runs these manually and in sequence from `AIWritingPanel`. Each agent's output appears in the panel as a named artifact. The author can apply, edit, or discard each artifact before invoking the next agent. No automated orchestration — the author stays in control of each handoff.

```
[Research] → author reviews report → [Draft] → author edits → [QA Review] → author applies fixes
```

Artifacts are held in `AIWritingPanel` component state (not persisted to DB). The panel can display multiple artifacts in a tabbed view so the author can reference research while reviewing a draft.

### Content strategy brief (optional, future)

Not in MVP. Future: a pre-writing step where the author fills in (or the researcher generates) a structured brief — audience, goal, scope, key questions — that gets injected as context for both the writer and reviewer. This would be a separate form/modal accessible from the editor top bar.

### Admin writing config UI (/admin → Writing Config tab)

The `WritingConfigEditor` component provides:

- **Prompts tab:** `baseSystemPrompt` (fallback) + per-role system prompt editors (Monaco, markdown mode)
- **Style Guide tab:** Monaco editor for the style guide document (audience definition, tone, formatting rules, what to avoid)
- **Skills tab:** List of `WritingSkill` entries — each has a name, description, and the prompt snippet injected when that skill is active. Displayed as action buttons in `AIWritingPanel`.
- **Templates tab:** List of `WritingTemplate` entries — pre-fills Monaco body and `FrontmatterForm` when author starts a new entry from a template.

### Future extensions (not in MVP)

- **Orchestrated pipeline:** Auto-pipe researcher output → writer context → reviewer context in a single triggered workflow, with progress shown step-by-step in the panel
- **Content strategy brief:** Structured pre-writing form/modal, injected as context for writer + reviewer
- **Feedback loop:** Reviewer findings auto-highlighted as inline Monaco annotations
- **Per-topic style guidance:** Associate different style guides with different `topicPath` prefixes

---

## Implementation Phases

### Phase 1 — Foundation

- Init Next.js 16 + TypeScript + Tailwind v4
- Install and configure DDS (styles import in root layout — content rendering only)
- `globals.css` CSS token structure (dark default palette + `.light` overrides)
- ThemeProvider + dark-first pre-paint script + ThemeToggle in TopNav
- MongoDB Atlas connection + Entry model
- Create Atlas Search index `entry_search`
- JWT auth: `lib/auth/jwt.ts`, `password.ts`, login/logout API routes
- `middleware.ts` route protection
- `AuthProvider` + `/login` page

**✓ Checkpoint:** App boots in dark mode by default, toggle persists preference, DDS renders in content area, login/logout functional

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
- `WritingConfig` Mongoose model + seed default config
- `GET/PUT /api/admin/writing-config`
- `WritingConfigEditor` on admin page (Prompts + Style Guide tabs first; Skills + Templates can follow)
- Writing agent context assembly: config load + RAG examples + persona dispatch
- `POST /api/ai/writing-agent` SSE — researcher / writer / reviewer personas
- `AIWritingPanel`: action buttons mapped to skills, artifact tabs for multi-agent output, Apply-to-Monaco

**✓ Checkpoint:** RAG chat working; writing agent responds with persona-aware, RAG-augmented output; admin can edit prompts + style guide without redeploy

### Phase 6 — Admin + Polish

- `GET /api/admin/stats` (MongoDB aggregation)
- Admin dashboard with stats, recent entries, top tags
- `CodePlayground` iframe embed component
- **Frontend polish:** typography hierarchy, spacing rhythm, sidebar + card design, hover/focus/transition states, responsive breakpoints — all via Tailwind tokens already in place
- Mobile responsiveness
- Error boundaries + loading states
- Vercel deployment (env vars, Atlas IP allowlist, Fluid Compute enabled, `maxDuration` set on streaming routes)

**✓ Checkpoint:** Production deployment on Vercel

---

## Critical Files

| File | Why |
| --- | --- |
| `src/lib/db/models/Entry.ts` | Core schema — everything depends on it |
| `src/lib/db/models/WritingConfig.ts` | Singleton agent config — drives all writing agent behavior |
| `src/lib/ai/writing-agent.ts` | Config/RAG assembly + persona dispatch + streaming |
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
