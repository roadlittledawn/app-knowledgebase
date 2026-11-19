# Plan: migrate Knowledgebase auth to clang-auth

Branch: `feat/clang-auth-migration` (from `develop`). The PR targets `develop`. After that, a release PR from `develop` to `main` deploys to production.

## Goal

Replace the single-admin login (username and bcrypt hash in env vars, plus a 7-day HS256 JWT in an `auth_token` cookie) with the shared clang-auth service at `https://auth.clintonlangosch.com`. Afterwards:

- You sign in once at `auth.clintonlangosch.com` and are signed in to the Knowledgebase and every other `*.clintonlangosch.com` app you have a grant for.
- The app stores no password hash and no signing secret. It verifies a 15-minute ES256 token (`ca_access`) against clang-auth's public JWKS, with no call to the auth service per request.
- "Authenticated" in this app means `apps.kb` contains `"admin"`. That gives the same powers as today's single admin: private and draft entries, editing, chat, the writing agent, images and files.
- Public browsing behaves exactly as it does now for anonymous visitors.

The reference docs are in the clang-auth repo: `docs/integration-guide.md` and `docs/migrating-apps.md`. Lexicon (`web-wtq`, PR #30) was migrated the same way on 2026-11-15. This plan reuses its patterns: the token helper, `authFetch`, the session hint, and the CSRF origin check.

## Decisions

| # | Decision | Proposal | Why |
|---|---|---|---|
| D1 | Subdomain and slug | `kb.clintonlangosch.com`, slug `kb` | Short. The migration guide's convention is subdomain = slug. **Confirm before step P2; it's hard to change later.** |
| D2 | `AUTH_MODE=legacy\|clang-auth` switch | **No switch.** Cut over directly, as Lexicon did. | Single user, no user table. Vercel *Instant Rollback* returns to the previous deployment (old code, old env) in seconds, which covers what the switch is for. |
| D3 | Who counts as authenticated | Valid token **and** `apps.kb` contains `admin` | Matches today's single-admin model. A signed-in user with no `kb` grant is anonymous on public pages and gets `403` on protected ones. A future read-only role (for example `reader`, which sees private entries but can't edit) only needs a change in `getSession()`. |
| D4 | Preview deployments (`*.vercel.app`) | Public view only. Admin is tested locally. | The cookie is on `.clintonlangosch.com`, so `*.vercel.app` previews never receive it ([migrating-apps §5](../../service-clang-auth-claude/docs/migrating-apps.md#previews-and-staging)). A fixed staging subdomain is possible later but not needed now. |
| D5 | How the browser learns `AUTH_BASE_URL` | The root layout (a server component) passes it as a prop to `AuthProvider` | Keeps the "no `NEXT_PUBLIC_` vars" convention from `CLAUDE.md`. There's no build-time baking, so changing the value doesn't need a rebuild. |
| D7 | CSRF origin source | Compare `Origin` (or `Referer`) with the request's own origin (Host / `x-forwarded-host`). There's no `APP_ORIGIN` env var. | One less env var. It works unchanged locally, on previews and in prod. A cross-site browser request can't forge the `Host` header. |
| D6 | Tests | One `tsx` script, `scripts/test/auth-session.test.ts`, using `node:assert` and added to `package.json` like `test:mdx` | `CLAUDE.md` says not to add a test framework. A plain script follows the existing `scripts/test/` pattern. |

## How it works after the change

```
browser (kb.clintonlangosch.com)
  │  cookie ca_access (Domain=.clintonlangosch.com, HttpOnly, Secure, 15 min)
  ├─► page / API request ──► proxy.ts
  │       public route                 → pass through (handler may call getSession() for private content)
  │       protected page, no token     → 302 https://auth.clintonlangosch.com/login?redirect_uri=<url>
  │       protected API, no token      → 401 JSON          (authFetch refreshes and retries)
  │       token but no kb:admin grant  → 403               (never a redirect: it would loop)
  │       POST/PUT/PATCH/DELETE /api/* → Origin must equal this request's origin, else 403 (CSRF)
  ├─► GET /api/auth/me                 → { email, name, roles, exp } or 401 (drives UI state)
  └─► auth.clintonlangosch.com
        /login?redirect_uri=…          sign in, or bounce straight back if a session exists
        POST /api/session/refresh      new ca_access (credentials: "include")
        POST /logout                   signs out of every app on the domain
```

**Why a CSRF check is new:** today the cookie is host-only on `app-knowledgebase.vercel.app`. After the move, every `*.clintonlangosch.com` app is the same *site*, so `SameSite=Lax` no longer blocks a sibling subdomain from submitting a request that carries the cookie.

## Current state (what changes)

- `src/lib/auth/jwt.ts`, `password.ts`: HS256 sign and verify with `AUTH_SECRET`, and bcrypt. Both get removed.
- `proxy.ts` (at the repo root, **so Next never ran it**; see the finding below): guards `/admin`, `/entries`, `/chat` (pages), `/api/admin`, `/api/chat`, `/api/ai`, and `POST/PUT/DELETE /api/entries`. Unauthenticated page requests redirect to `/login?redirect=`.
- **About 25 route handlers and pages each copy a local `isAuthenticated()` / `verifyAuth()`** that reads `auth_token` and calls `verifyToken`. This plan replaces them all with one shared helper:
  - Optional auth (public, with more content when authenticated): `api/entries` GET, `api/entries/[id]` GET, `api/search`, `api/tags`, `api/categories/tree-with-entries`, `browse/[...slug]/page.tsx`.
  - Required auth: `api/entries` (writes), `api/entries/[id]` (writes), `api/entries/[id]/pinecone`, `api/entries/[id]/markdown`, `api/images/**`, `api/files/**`, `api/categories` (writes), `api/categories/[id]`, `api/categories/reorder`, `api/admin/stats`, `api/admin/writing-config`, `api/chat`, `api/ai/writing-agent`, `chat/page.tsx`, `admin/layout.tsx`, `entries/layout.tsx`.
- `src/app/login/page.tsx` plus `api/auth/login` and `api/auth/logout`: the in-app login form. There's no sign-out button in the UI today.
- `TopNav` decides whether to show admin links by calling `/api/admin/stats`, which runs a DB stats query on every navigation.
- Five admin pages call `router.push('/login')` on a `401`.
- About 40 client `fetch()` calls across 27 files. Those that hit protected APIs need refresh-on-401.
- Client storage: only the theme preference in `localStorage`. It doesn't carry over to the new origin, so you pick the theme once more. Nothing else is lost.
- There are no users to migrate and no user table. Nothing stores a user ID, so there's no `sub` linking step ([migrating-apps §4](../../service-clang-auth-claude/docs/migrating-apps.md#4-apps-that-already-have-users) doesn't apply).

## Prerequisites (outside this repo, before the release PR to `main`)

| Step | Action |
|---|---|
| P1 | Confirm D1 (subdomain and slug). |
| P2 | **Done 2026-11-18:** CNAME `kb → 58bf3f7efe249b33.vercel-dns-017.com` (Netlify DNS record `6afe4e37547f9351ebff7f5f`), TLS issued, `/browse` returns `200`. **Custom domain.** Vercel project → Settings → Domains → add `kb.clintonlangosch.com` *alongside* `app-knowledgebase.vercel.app`. DNS for `clintonlangosch.com` is Netlify DNS: add the `CNAME kb → <target Vercel shows>` there (`netlify api createDnsRecord`, zone `66351697a93f241eb3cbe686`). Wait for Vercel to issue TLS, then check that `https://kb.clintonlangosch.com/browse` serves the current app. Old login still works there, since its cookie is host-only on the new host. This is Vercel's "external DNS" setup, and nameservers stay on Netlify. Vercel only needs its own nameservers for an apex or wildcard domain. Checked 2026-11-18: `kb` is unused and there are no CAA records, so Let's Encrypt can issue. If Vercel asks for ownership verification (the domain was used by another Vercel account or team), add the `TXT _vercel` record it shows. |
| P3 | **Done 2026-11-18:** app `kb` (origin `https://kb.clintonlangosch.com`) registered, with you granted `kb → admin`. **Register with prod clang-auth.** Run this from outside the clang-auth repo, so the CLI uses the prod config: `clang-auth app create kb --name Knowledgebase --origin https://kb.clintonlangosch.com`, then `clang-auth grant set <your email> kb --role admin`. |
| P4 | **Done 2026-11-18** (dashboard). **Vercel env vars, Production and Preview:** `AUTH_BASE_URL=https://auth.clintonlangosch.com` and `AUTH_APP_SLUG=kb` (D7: no `APP_ORIGIN`). Keep `AUTH_SECRET`, `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` until cleanup (C2). |

## Part 1: server side

| Step | Change |
|---|---|
| 1.1 | **`src/lib/auth/clang-auth.ts`** (new), ported from `web-wtq/lib/clang-auth.ts`. `ACCESS_COOKIE = "ca_access"`. `authSettings()` reads `AUTH_BASE_URL` and `AUTH_APP_SLUG`, and throws if either is missing. `verifyAccessToken(token)` uses a module-scoped `createRemoteJWKSet`, `algorithms: ["ES256"]`, `issuer: AUTH_BASE_URL` and `clockTolerance: 30`, and checks that `sub` and `apps` are present. It also exports `setJwksForTesting()` and `loginUrl(returnTo)`. `jose` is already a dependency. |
| 1.2 | **`src/lib/auth/session.ts`** (new). `getSession(): Promise<Session \| null>` reads `ca_access` with `cookies()`, verifies it, and returns `{ sub, email, name, roles, exp }` only if `apps[slug]` includes `"admin"` (D3). Wrapped in React `cache()` so a layout and a page in one request verify only once. Also `getAuthState()`, returning `'ok' \| 'anonymous' \| 'forbidden'`, for the places that must tell 401 from 403, and `isAuthenticated() = (await getSession()) !== null`. |
| 1.3 | **Replace all the local `isAuthenticated()` / `verifyAuth()` copies** (listed above) with imports from `@/lib/auth`. Optional-auth routes keep their logic: authenticated callers see drafts and private entries, everyone else gets published public content. Required-auth handlers return `401` for anonymous and `403` for forbidden. `admin/layout.tsx`, `entries/layout.tsx` and `chat/page.tsx` call `redirect(loginUrl(...))` instead of `redirect('/login')`. The proxy already guards them, so these checks are defense in depth. |
| 1.4 | **Rewrite `proxy.ts` and move it to `src/proxy.ts`.** Keep the route tables. Add `/api/images`, `/api/files` and the category write methods so that the proxy matches what the handlers enforce. When there's no valid session: pages redirect to `loginUrl(origin + pathname + search)`, and APIs return `401 {"error":"Unauthorized"}`, the shape the client already expects. A valid token without the grant gets `403`. **CSRF:** for any `POST/PUT/PATCH/DELETE` under `/api/`, `Origin` (or the origin of `Referer`, if `Origin` is missing) must equal the request's own origin (D7), else `403`. This includes public POSTs such as search and preview: their legitimate callers are same-origin. |
| 1.5 | **`GET /api/auth/me`** (new): `{ email, name, roles, exp }` or `401`. There's no DB call. `TopNav` and `AuthProvider` use it instead of `/api/admin/stats`. |
| 1.6 | **Delete** `src/lib/auth/jwt.ts`, `src/lib/auth/password.ts`, `api/auth/login`, `api/auth/logout` and `scripts/hash-password.ts`. Update `src/lib/auth/index.ts` and `src/lib/index.ts`. Remove `bcryptjs` and `@types/bcryptjs`. |
| 1.7 | **Old-domain redirect** in `next.config.ts` `redirects()`: `source: '/:path*'`, `has: [{ type: 'host', value: 'app-knowledgebase.vercel.app' }]`, `destination: 'https://kb.clintonlangosch.com/:path*'`, `permanent: true`. The query string is preserved automatically. It only matches the production alias; preview hosts are different, so previews keep working. |
| 1.8 | **Streaming routes** (`api/chat`, `api/ai/writing-agent`): the token is checked once before the stream starts. A stream that outlives the 15-minute token isn't cut off, which is intended. No change beyond 1.3. |

## Part 2: client side

| Step | Change |
|---|---|
| 2.1 | **`src/lib/auth/client.ts`** (new, browser-only), ported from `web-wtq/lib/auth-client.ts`. It provides `refreshSession()` (`POST {authBase}/api/session/refresh`, `credentials: "include"`), `authFetch(url, init)` (on a `401`, refresh and retry once; if that fails, redirect to login), `redirectToLogin()`, `logout()` (`POST {authBase}/logout` with `Accept: application/json`, then `router.refresh()`), and a session hint in `localStorage` (`kb_had_session`). |
| 2.2 | **`AuthProvider` + `useAuth()`** (`src/components/AuthProvider.tsx`), mounted in the root layout with `authBaseUrl` passed in from the server (D5). One `/api/auth/me` per page load provides `{ status, user, isAdmin }`. On a `401` it refreshes only when the hint is set or the page is protected. Anonymous readers never call the auth service, which is throttled to 5 rps across all apps. After a successful refresh it calls `router.refresh()`, so server components re-render with private content. **While signed in, it refreshes about 60 s before `exp`**, and on `visibilitychange` if the token has expired. That keeps the sidebar and browse pages from silently dropping to the public view after 15 minutes, and saves after long editing sessions skip the retry path. |
| 2.3 | **`TopNav`**: replace the `/api/admin/stats` probe with `useAuth()`. Add **Sign in** (anonymous) and **Sign out** (authenticated) to the desktop nav and the mobile dropdown. Label it "Sign out" and give it a tooltip saying it signs out of all clintonlangosch.com apps. |
| 2.4 | **Swap `fetch` for `authFetch`** wherever the target API is protected: `EntryEditor`, `entries/new`, `entries/[id]/edit`, `EntryManagementTable`, `admin/*` pages, `categories` page, `Image*` and `File*` components, `FileUploader`, `ImageUploader`, `AIWritingPanel`, `ChatInterface`, and `PreviewPane` if `/api/preview` becomes protected. Public fetches (`GlobalSearch`, `search/page`, `browse/page`, `CopyMarkdownButton`) stay as plain `fetch`. The cookie is still sent, and `AuthProvider` keeps it fresh. Uploads use `FormData`, which can be re-sent on retry. |
| 2.5 | **Remove `router.push('/login')`** from the five admin pages. `authFetch` handles the `401`. A `403` shows a "No access to Knowledgebase" message instead of redirecting. |
| 2.6 | **`/login` page** becomes a tiny client component that calls `redirectToLogin(origin + (searchParams.get('redirect') ?? '/browse'))`, so old bookmarks and the home page's sign-in link keep working. |

## Part 3: local development

| Step | Change |
|---|---|
| 3.1 | Run local clang-auth (`auth.localtest.me:4000`). Its README has the steps. Check what's listening on :4000 first, because the sibling `service-clang-auth-opencode` and `app-fitness-tracker` projects also use that port. Register: `clang-auth app create kb --name Knowledgebase --origin http://kb.localtest.me:3003`, then `clang-auth grant set dev@localtest.me kb --role admin`. |
| 3.2 | Run `next dev -p 3003` and open **`http://kb.localtest.me:3003`**, not `localhost`: the `Domain=.localtest.me` cookie is never sent to `localhost`. Port 3003 avoids the demo apps that often hold :3000. |
| 3.3 | `next.config.ts`: `allowedDevOrigins: ['kb.localtest.me']`. Without it, the Next 16 dev server blocks HMR and dev-resource requests from a non-`localhost` host. |
| 3.4 | `.env.example` / `.env.local`: remove `AUTH_SECRET`, `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH`. Add `AUTH_BASE_URL=http://auth.localtest.me:4000` and `AUTH_APP_SLUG=kb`, with a comment pointing here. |
| 3.5 | `scripts/test/auth-session.test.ts` (D6), run by `npm run test:auth`. It generates a throwaway ES256 keypair, injects it with `setJwksForTesting`, and signs tokens. It asserts that verification passes for valid admin claims and fails for: a missing token, an expired token, the wrong `iss`, an HS256 or forged signature, an unknown `kid`, no `kb` grant, and a `kb` grant without `admin`. Cookie and proxy behavior is covered by the manual checks in V1. |

## Part 4: docs

- `CLAUDE.md`: rewrite the Auth row of the stack table, the Authentication section, and the env var list. Note that `/api/auth/me` and `getSession()` are the only supported auth checks, and that local dev uses `kb.localtest.me`.
- `README.md`: point the deploy badge link at `https://kb.clintonlangosch.com/browse` and add a short "Auth" section linking here.
- Delete `docs/env-bcrypt-hash.md`. It's obsolete without a bcrypt hash.
- `docs/planning/architecture.md`: add a one-line note that auth moved to clang-auth (see this doc).

## Finding: the old proxy never ran

With a `src/` directory, Next.js only loads `src/proxy.ts` (or `src/middleware.ts`). The root-level `proxy.ts` added in `f34b874` was silently ignored: the build output had no `ƒ Proxy (Middleware)` line. Until this branch, only the per-route checks protected anything. Every protected API route had one, so nothing was exposed, but the "redirect to login" and the method-based rules in `proxy.ts` never took effect. The file now lives at `src/proxy.ts`, and the build lists the proxy.

## Commit sequence on this branch

1. Add the clang-auth token and session helpers, plus the test script and its CI step (1.1, 1.2, 3.5).
2. Switch sign-in to clang-auth in one commit, covering the server, the proxy, the browser, and removal of the legacy login (1.3–1.6, 1.8, 2.1–2.6, 3.4). This was planned as three commits, but each half alone leaves a broken app: the server half deletes `/api/auth/login` while the login form still posts to it.
3. Redirect the old Vercel domain and allow the local dev origin (1.7, 3.3).
4. Document the clang-auth migration (Part 4).

Each commit must pass `npm run lint`, `npm run type-check` and `npm run build`, which is what PR Validation runs.

## Verification

**V1: locally** (Part 3 setup).

Checked 2026-11-18 with curl against `next start` and a local clang-auth: the anonymous redirect (path and query kept), the `401`s on protected APIs, the public `/browse` and entry list, `403` for a cross-origin or `Origin`-less POST, `403` and the "No access" page for a user without a `kb` grant, and private or draft entries visible only to the admin (6 vs 0). Also the silent sign-in bounce back to `kb`, refresh and logout CORS for the `kb` origin, and `401` after logout. **Still to check in a browser:** the boxes below that involve the UI (Sign in / Sign out in the nav, refresh-and-retry, the 15-minute proactive refresh) and the authenticated write paths, which use the real Atlas, Pinecone and S3.


- [ ] Signed out: `/browse` shows only published public entries, and there are no calls to `auth.localtest.me` in the network tab.
- [ ] Signed out: `/admin` → redirects to `auth.localtest.me:4000/login?redirect_uri=…` → sign in → back on `/admin`.
- [ ] Signed in: private and draft entries appear in the sidebar and in search. Admin links show in `TopNav`.
- [ ] Create, edit, delete and publish an entry (Pinecone sync), upload an image and a file, reorder categories, run a chat, and use the writing agent.
- [ ] Delete `ca_access` in devtools: the next admin action still succeeds through refresh and retry. Reload `/browse`: private entries come back without a sign-in form.
- [ ] Leave the tab open for more than 15 minutes: private entries are still visible (proactive refresh).
- [ ] A user without a `kb` grant: `/admin` shows the 403 message, with no redirect loop. `/browse` shows the public view.
- [ ] `curl -X POST http://kb.localtest.me:3003/api/entries -H 'Origin: http://evil.localtest.me:3003' -H "Cookie: ca_access=$(clang-auth token mint dev@localtest.me)"` → `403`.
- [ ] Sign out → signed out here and on `auth.localtest.me`.
- [ ] `npm run test:auth` passes.

**V2: production** (after the release PR merges and deploys):

- [ ] Every V1 browser check against `https://kb.clintonlangosch.com`.
- [ ] `curl -sI 'https://app-knowledgebase.vercel.app/browse/some-slug?x=1'` → `308` to `https://kb.clintonlangosch.com/browse/some-slug?x=1`. Next.js uses `308` for permanent redirects.
- [ ] `/browse/<slug>.md` (the S3 rewrite) still serves markdown.
- [ ] Devtools → Cookies: `ca_access` on `.clintonlangosch.com`, `HttpOnly`, `Secure`.
- [ ] Signing out of the Knowledgebase also signs you out of Lexicon.

## Rollout

1. Prerequisites P1–P4. The current app keeps working on both hostnames throughout.
2. Open a PR from this branch to `develop` and merge it once PR Validation is green.
3. Open a release PR from `develop` to `main`. Smoke-test its Vercel preview: the public view only (D4).
4. Merge to deploy, then run V2.
5. **Rollback, if needed:** Vercel → Deployments → previous production deployment → *Instant Rollback*. That restores the old code, the old login, and no redirect, while the old env vars are still present. The `kb` registration in clang-auth can stay; it's harmless.

## Cleanup (about 2 weeks after release)

| Step | Action |
|---|---|
| C1 | Confirm nothing still lands on `app-knowledgebase.vercel.app` other than the redirect (Vercel logs). |
| C2 | Delete the `AUTH_SECRET`, `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` env vars in Vercel. Instant Rollback past this point would bring back a deployment whose login no longer works, which is fine once you're confident. |
| C3 | Keep the `app-knowledgebase.vercel.app` redirect indefinitely. It costs nothing and keeps old links working. |
| C4 | Fill in the Knowledgebase row of the tracking sheet ([migrating-apps §8](../../service-clang-auth-claude/docs/migrating-apps.md#8-tracking-sheet)). |

## Risks and notes

- **Auth service availability.** While the auth service is down, already-issued tokens keep working for up to 15 minutes, and public browsing is unaffected. After that, admin features are unavailable until it recovers. The JWKS is cached per function instance.
- **Cold JWKS fetch.** The first verification on a new Vercel instance fetches the JWKS: about 0.2 s warm, up to about 1.1 s when the Lambda is cold. Only signed-in requests pay this cost.
- **No `NEXT_PUBLIC_` vars** are introduced (D5).
- **Shared-domain rules** ([migrating-apps §7](../../service-clang-auth-claude/docs/migrating-apps.md#7-security-rules-for-a-shared-domain)): the Knowledgebase renders MDX that only you author, with `blockDangerousJS` on. That's acceptable on the shared domain. Never accept MDX from other people while it lives under `clintonlangosch.com`.
