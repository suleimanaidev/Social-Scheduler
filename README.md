# Social Scheduler

A social media scheduling application. Users connect their social accounts,
compose posts (caption + media), schedule them on a calendar, and a background
worker publishes them to the connected platforms.

## Tech stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend / DB:** Supabase (Postgres + Auth + Storage)
- **Auth:** Supabase Auth (email/password)
- **Publishing:** Supabase Edge Function (`publish`) + database-backed queue
- **Time:** stored in UTC, displayed in `Asia/Karachi`

## Project structure

```
src/
  app/
    login/            # email/password auth
    dashboard/        # overview (KPIs, upcoming, activity, platform chart)
      calendar/       # month calendar with day selection + scheduling
      new/            # post composer (caption, media, platforms, draft/schedule)
      accounts/       # connected accounts management
      analytics/      # analytics (KPIs, charts, filters, empty states)
      published/      # published posts with media + status + links
      settings/       # profile + timezone + account info
    api/
      auth/connect/   # builds OAuth authorize URL, sets state cookie
      auth/callback/  # validates state, exchanges code, stores tokens
      posts/          # creates a draft/scheduled post (RPC)
  components/
    ui.tsx            # shared UI (PageHeader, StatCard, badges, EmptyState, …)
  lib/
    supabase/         # browser + server + admin clients
    platforms.ts      # platform definitions (scopes, colors, authorize URLs)
    oauth.ts          # server-side token exchange + identity resolution
    crypto.ts         # AES-256-GCM token encryption (Web Crypto)
    time.ts           # UTC <-> Asia/Karachi helpers
supabase/
  migrations/         # schema + RLS + RPC + storage policies + post_metrics
  functions/
    _shared/          # types, crypto, refresh, publishers
    publish/          # the publishing worker
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from your Supabase project)
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `ENCRYPTION_KEY` (32+ random characters; used to encrypt stored OAuth tokens)
- `CRON_SECRET` (random string; protects the `publish` worker)
- Platform credentials (Facebook, LinkedIn, TikTok, Pinterest)

### 3. Run Supabase locally

```bash
supabase start          # requires the Supabase CLI and Docker
supabase db reset       # applies the migrations
```

Or apply the migrations to a hosted project (via the SQL editor or
`supabase db push`):

- `supabase/migrations/20261026000000_init.sql` — core schema + RLS + RPC
- `supabase/migrations/20261027000001_drafts_and_metrics.sql` — drafts + `post_metrics`

> **Note:** the SDKs are pinned to support Supabase's new `sb_publishable_` /
> `sb_secret_` API keys (`@supabase/supabase-js@2.118.0`, `@supabase/ssr@0.12.7`).

### 4. Run the app

```bash
npm run dev
```

Open http://localhost:3000.

## Authentication & OAuth flow

1. User signs in with email/password (Supabase Auth).
2. On the Accounts page, clicking "Connect" hits `/api/auth/connect?platform=…`,
   which sets an http-only `oauth_state_<platform>` cookie and redirects to the
   platform's consent screen.
3. The platform redirects back to `/api/auth/callback?platform=…&code=…&state=…`.
   The route validates `state` (CSRF protection), exchanges the code for tokens,
   resolves the account identity (and a Facebook Page / Instagram Business
   account), encrypts the tokens, and stores them.

**Secrets are stored encrypted.** `connected_accounts` holds only public
metadata. `account_tokens` holds AES-256-GCM-encrypted tokens and has **no RLS
policy for clients** — only the service role (server / Edge Function) can read it.

## Publishing

The `publish` Edge Function processes due posts:

1. Claims each `post_platforms` row with a conditional `pending -> publishing`
   update (prevents duplicate concurrent publishing).
2. Loads and decrypts the account token; refreshes it if expiring and a refresh
   token is available.
3. Generates short-lived signed URLs for media, then calls the platform API.
4. On success marks the row `published`; on a temporary error it schedules a
   retry with exponential backoff (max 5 attempts); on a permanent error it
   marks `failed`.
5. Recomputes the post's overall status.

### Triggering the worker

The function requires an `Authorization: Bearer <CRON_SECRET>` header (or the
service-role key). Run it manually:

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/publish \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
```

For production, schedule it (every minute is typical) using **Supabase Cron** in
the dashboard, `pg_cron`, or an external scheduler (GitHub Actions, Vercel Cron,
etc.). Pass `{"post_id": "..."}` to publish a single post on demand.

## Platform notes

Each integration uses the platform's official API. **Publishing requires a
registered app and app-review approval**, and most platforms require a business
or creator account:

| Platform | API | Notes |
|---|---|---|
| Facebook | Graph API | Requires a Page; publishes text/photo/video to `/{page-id}` |
| Instagram | Graph API | Requires a linked Instagram Business/Creator account |
| LinkedIn | REST API (`/rest/posts`) | Text + image posts |
| TikTok | Content Posting API | Video-only; direct post requires approval |
| Pinterest | v5 API | Image Pins to the account's first board |

Facebook/Instagram use long-lived page tokens and do not expose a standard
refresh grant in this app; LinkedIn, Pinterest, and TikTok return refresh tokens
and are refreshed automatically by the worker.

## Deploy to Vercel

1. Push the repo to GitHub (`.env` is gitignored, so secrets are not committed).
2. Import the repo in Vercel (framework: **Next.js**).
3. Add environment variables in **Vercel → Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `CRON_SECRET`, `ADMIN_EMAILS`
   - `NEXT_PUBLIC_SITE_URL` = your production URL (e.g. `https://your-app.vercel.app`)
   - Platform secrets (`FACEBOOK_APP_ID/SECRET`, `LINKEDIN_*`, `TIKTOK_*`, `PINTEREST_*`)
4. **Update the OAuth redirect URIs** on each platform to the Vercel domain, e.g.
   `https://your-app.vercel.app/api/auth/callback?platform=facebook`.
5. Apply the Supabase migrations (SQL editor).
6. Node **22.x** is required (see `engines` in `package.json`).

### Automatic publishing (cron)

`vercel.json` defines a **daily** cron that calls `/api/publish`. Vercel sends
`Authorization: Bearer $CRON_SECRET` automatically. On the **Hobby** plan crons
can only run once per day; for minute-level publishing use **Pro** or an external
scheduler (cron-job.org / GitHub Actions) calling `POST /api/publish` with the
`CRON_SECRET` header. The manual **Publish Now** button always works.

> Vercel serverless functions have a max duration (set to 60s here). Instagram
> and TikTok publishing poll for media processing and may need **Pro** (300s)
> for large videos.

## Security

- Service-role key and client secrets live only on the server / Edge Function.
- OAuth tokens are encrypted at rest with AES-256-GCM.
- RLS policies ensure users only access their own posts, accounts, and media.
- Media is stored in a private bucket, folder-scoped to the user id.
- OAuth `state` is validated on callback.

## Scripts

```bash
npm run dev        # start dev server
npm run build      # production build
npm run typecheck  # tsc --noEmit
```
