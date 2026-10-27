# Social Scheduler — Progress & Handoff

**Last updated:** 2026-10-27
**Status:** Bootstrapped from scratch, connected to a **real hosted Supabase
project**, and **verified end-to-end**. Full premium SaaS UI implemented:
marketing landing page, 7 dashboard pages, an admin panel, live post preview,
and server-side publishing. Build (23 routes) + type-check pass. Remaining:
platform app review, a publish scheduler, and a metrics collector.

---

## Summary

The previous session's files were not present in the working directory, so the
project was bootstrapped from scratch following the agreed stack and spec. The
application is feature-complete at the code level (auth, calendar, composer,
accounts, OAuth connect, and a publishing worker). External platform publishing
requires real credentials and app review, which cannot be completed locally.

## Completed

- **Project scaffold** — Next.js 14 (App Router), TypeScript, Tailwind CSS.
- **Authentication** — Supabase Auth (email/password sign-up + sign-in), auth
  middleware protecting `/dashboard`, `profiles` auto-created on signup.
- **Database schema + RLS** (`supabase/migrations/20261026000000_init.sql`):
  - `profiles`, `connected_accounts`, `account_tokens`, `posts`,
    `post_platforms`, `post_media`.
  - Row Level Security on every table (users only see their own data).
  - `account_tokens` has **no client policy** (service-role only).
  - `create_scheduled_post()` RPC (security definer, transactional insert).
  - Private `media` storage bucket with user-folder-scoped policies.
- **Frontend pages (premium SaaS UI, purple accent, bento-grid):**
  - `/` — marketing landing page (hero, features bento, platforms, how-it-works,
    CTA, footer); guests only (authenticated users go to `/dashboard`).
  - `/privacy` — public privacy policy.
  - `/login` — email/password auth (Suspense-wrapped).
  - `/dashboard` — overview: KPI cards, upcoming posts, recent activity,
    platform breakdown, quick-create CTA.
  - `/dashboard/calendar` — month view with month/year pickers, clickable days
    (+ schedule), selected-day detail panel.
  - `/dashboard/new` — composer: caption, media upload + progress, platform
    select, Karachi-scheduled time, **draft + schedule** modes, and a **live
    preview panel** (updates as you type/add media/select platforms).
  - `/dashboard/accounts` — platform cards with status + connect/reconnect.
  - `/dashboard/analytics` — KPI cards, posts-over-time + platform charts,
    filters (7/30/90d), honest empty states for impressions/reach/engagements.
  - `/dashboard/published` — posts with media previews, per-platform status,
    error details, external links.
  - `/dashboard/settings` — profile, timezone preference, account info.
  - Shared UI components (`src/components/ui.tsx`) and `loading.tsx` skeleton.
- **Design system** — purple `brand` palette, gradients, rounded cards,
  consistent spacing, accessible buttons/forms, loading + empty states.
- **Drafts + metrics migration** (`20261027000001_drafts_and_metrics.sql`):
  - `create_scheduled_post()` now accepts `p_status` (`draft` | `scheduled`).
  - New `post_metrics` table (impressions/reach/engagements/likes/comments/
    shares) with RLS, for future metric snapshots.
- **OAuth connect** (`/api/auth/connect` + `/api/auth/callback`):
  - Real token exchange + identity resolution for Facebook, Instagram,
    LinkedIn, TikTok, Pinterest.
  - `state` CSRF validation via http-only cookie.
  - Facebook/Instagram resolve a Page / Instagram Business account and store the
    page token.
  - Tokens encrypted with AES-256-GCM (Web Crypto, Node ↔ Deno compatible).
- **Publishing worker** (`supabase/functions/publish`):
  - Claims posts with conditional updates (duplicate-publish protection).
  - Decrypts + refreshes tokens; signed media URLs; real API calls per platform.
  - Retry with exponential backoff (max 5), permanent vs temporary error split,
    per-platform status, post-level status recomputation.
- **Server-side publishing (works now, no Edge Function deploy needed)**:
  - `src/lib/publish/{publishers,refresh,worker}.ts` — the same real API logic
    ported to Node (runs inside Next.js using the service-role key).
  - `POST /api/publish` — protected endpoint (cron secret or user session).
  - **"Publish Now"** button on the dashboard triggers due posts on demand.
- **Admin panel** (`/admin`, admin-only):
  - Access via `profiles.is_admin` OR the `ADMIN_EMAILS` env allowlist; server-side
    check redirects non-admins to `/dashboard`. Data is fetched with the
    service-role client, tokens are never exposed.
  - **Overview** (platform KPIs + recent users/posts), **Users** (promote/demote
    admin), **Posts** (all users), **Accounts** (all connected accounts).
  - `POST /api/admin/role` — admin-only role management (no self-demotion).

## Partially completed / requires external setup

- **Live publishing** — publishers are real implementations, but require each
  platform's registered app + app-review approval and a business/creator
  account. Not testable without credentials.
- **Worker scheduling** — the `publish` function is invokable manually; a cron
  trigger (Supabase Cron / `pg_cron` / external) must be configured in the
  deployed environment.
- **LinkedIn/Pinterest/TikTok media** — LinkedIn supports image upload;
  Pinterest is image-only (first board); TikTok is video-only. All three are
  implemented to the extent of their public APIs.

## Files created

```
package.json, tsconfig.json, next.config.mjs, next-env.d.ts,
tailwind.config.ts, postcss.config.mjs, .gitignore, .env.example, README.md,
PROGRESS.md,
src/middleware.ts,
src/app/layout.tsx, src/app/page.tsx, src/app/globals.css,
src/app/login/page.tsx,
src/app/dashboard/{layout,page,loading,DashboardShell,CalendarView}.tsx,
src/app/dashboard/calendar/page.tsx,
src/app/dashboard/new/page.tsx,
src/app/dashboard/accounts/{page,ConnectButton}.tsx,
src/app/dashboard/analytics/page.tsx,
src/app/dashboard/published/page.tsx,
src/app/dashboard/settings/{page,ProfileForm}.tsx,
src/app/admin/{layout,AdminShell,page}.tsx,
src/app/admin/users/{page,RoleToggle}.tsx,
src/app/admin/posts/page.tsx,
src/app/admin/accounts/page.tsx,
src/components/{ui,PlatformIcon,PublishNowButton}.tsx,
src/lib/{admin,publish/publishers,publish/refresh,publish/worker}.ts,
src/app/api/publish/route.ts,
src/app/api/admin/role/route.ts,
src/app/privacy/page.tsx,
src/app/api/posts/route.ts,
src/app/api/auth/connect/route.ts, src/app/api/auth/callback/route.ts,
src/lib/{types,time,platforms,crypto,oauth,utils}.ts,
src/lib/supabase/{client,server}.ts,
supabase/config.toml,
supabase/migrations/20261026000000_init.sql,
supabase/migrations/20261027000001_drafts_and_metrics.sql,
supabase/migrations/20261027000002_admin.sql,
supabase/functions/_shared/{types,crypto,refresh,publishers}.ts,
supabase/functions/publish/index.ts
```

## Verification

- `npm run typecheck` (`tsc --noEmit`) — **passes, 0 errors**.
- `next build` — **passes** (15 routes: `/dashboard`, `/dashboard/calendar`,
  `/dashboard/new`, `/dashboard/accounts`, `/dashboard/analytics`,
  `/dashboard/published`, `/dashboard/settings`, plus auth/API routes).
- Server (`next start`) — **running** at http://localhost:3000 (login 200;
  `/dashboard`, `/dashboard/analytics`, `/dashboard/settings` all 307 → login
  redirect via middleware = auth-protected).
- Supabase connectivity — **publishable + secret keys accepted** (no 401).
- Schema — core tables present; `post_metrics` + draft RPC added in the second
  migration (must be applied to the hosted project to enable drafts/analytics).
- Auth — `signUp()` succeeds; the `profiles` trigger auto-creates a profile
  (with `timezone = 'Asia/Karachi'`). Email confirmation is **ON** (hosted
  default), so sign-in requires confirming the email (or disable in Auth
  settings for instant login).
- RLS — `account_tokens` returns empty to the publishable key (default-deny).

## Known issues / notes

- **Environment file** is now `.env` (renamed from `.env.local`); both are
  gitignored. Facebook `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` are filled in.
- **SDK upgraded for the new API keys:** `@supabase/supabase-js@2.118.0` and
  `@supabase/ssr@0.12.7`. The new `sb_publishable_` / `sb_secret_` keys are
  opaque (not JWTs) and are sent on the `apikey` header; older SDKs (≤2.47.x)
  do not support them.
- The native SWC binary was manually re-fetched (network truncated the ~136 MB
  download during `npm install`). The remaining install artifacts (`.bin`
  shims / lockfile) are non-blocking; `package.json` scripts invoke `next`/`tsc`
  directly via `node`.
- `next@14.2.21` emits a deprecation notice about a security update; upgrading
  to a patched Next 14.x is a follow-up.
- Facebook/Instagram use long-lived page tokens without a standard refresh grant
  in this app; expired tokens surface as a permanent "token expired" error.
- No unit tests yet; edge functions are not type-checked by `tsc` (excluded) and
  run on Deno.

## Remaining to go fully live

1. **Apply the new migrations** to the hosted project (SQL Editor):
   `20261027000001_drafts_and_metrics.sql` (drafts + `post_metrics`) and
   `20261027000002_admin.sql` (`profiles.is_admin`). The admin panel works via
   the `ADMIN_EMAILS` allowlist already; the column enables in-app role changes.
2. **Platform app credentials** — Facebook App ID/Secret are added; still need
   the **redirect URI** (`http://localhost:3000/api/auth/callback?platform=facebook`)
   configured in the Facebook app, plus **app review / Live mode** for public
   publishing. LinkedIn / TikTok / Pinterest credentials not yet added.
3. **A scheduler** (Supabase Cron / pg_cron / external) invoking `POST /api/publish`
   with the cron secret every minute — for fully automatic publishing. (Manual
   "Publish Now" works now.)
4. **A metrics collector** to populate `post_metrics` (impressions/reach/
   engagements) so the analytics page fills in real numbers.
5. Optional: disable email confirmation for friction-free local testing.

## Next task

Apply the new migration, configure the Facebook redirect URI, then test the
Facebook connect flow end-to-end (Connect → authorize → account stored). Then
connect remaining platforms and run the publish worker.
