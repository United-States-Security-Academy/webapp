# United States Security Academy (USSA)

Course delivery platform. Next.js App Router + Supabase (Postgres/Auth) +
Drizzle ORM + Cloudflare Stream + Stripe.

This is not a general LMS — no grading, transcripts, SCORM, or term-based
enrollment. See the implementation plan for full scope and rationale.

## Stack

- Next.js App Router, TypeScript strict mode
- Supabase Postgres via Drizzle ORM, over the **transaction pooler** connection
  string (serverless-safe — see `src/db/client.ts`, `prepare: false`)
- Supabase Auth (cookie for web/PWA, bearer token for the future mobile app)
- Tailwind CSS
- Cloudflare Stream for video (signed URLs only, direct-from-browser uploads)
- Stripe for payments

## Project structure

Code is organized by **feature**, not by technical layer — everything related
to one concern (courses, lessons, enrollments, PDFs...) lives in one folder
under `src/features/`, rather than being split across app-wide `controllers/`,
`services/`, `models/` folders. Within a feature folder, a file's *name*
tells you its role — no need to open it to know what it does:

| Suffix / pattern | Role | Example |
|---|---|---|
| `*-queries.ts` | Read-only DB reads (Drizzle `select`) | `course-queries.ts` |
| `*-actions.ts` | Server Actions — mutations (`'use server'`) | `course-actions.ts` |
| `require-*.ts` | Auth/ownership guards that throw `ApiError` | `require-course-ownership.ts` |
| `*-client.ts` | Thin wrapper over an external API/SDK | `cloudflare-stream-client.ts` |
| `*-form.tsx` / `*-button.tsx` / `*-uploader.tsx` | Client components (`'use client'`) tied to one action | `add-lesson-form.tsx` |
| `*-types.ts` | Feature-local TypeScript types | `course-types.ts` |

Top-level layout:

```
src/
├── app/                # Routes only — pages stay thin, delegate to features/
├── features/<domain>/  # Business logic, one folder per concern (see table above)
├── components/
│   ├── ui/              # Generic, feature-agnostic primitives (Button, Card, Badge...)
│   └── layout/          # Site-wide chrome (header, footer, page banner)
├── db/
│   ├── client.ts         # The one Drizzle instance — import this, never construct another
│   └── schema/            # One file per table, re-exported from schema/index.ts
├── supabase/             # The three Supabase client variants — pick by context:
│   ├── server-client.ts    #   Server Components / Server Actions (cookie-based)
│   ├── browser-client.ts   #   Client Components (anon key, browser-safe)
│   └── admin-client.ts     #   Server-only, service-role key — bypasses RLS, never import client-side
└── api-response/         # Shared ApiError class + SCREAMING_SNAKE_CASE error codes
```

A concrete example — everything about lesson PDFs lives in one place,
`src/features/pdf/`, each file named for exactly what it does:
`lesson-pdf-storage-client.ts` (signed Supabase Storage URLs) →
`lesson-pdf-actions.ts` (the upload Server Action, ownership-checked) →
`lesson-pdf-uploader.tsx` (the instructor's upload button) →
`lesson-pdf-viewer.tsx` / `lesson-pdf-viewer-lazy.tsx` (the learner-facing
canvas renderer and its client-only lazy wrapper).

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in every value (Next.js
   convention: `.env.local` is loaded automatically and gitignored). All
   variables are required — the app validates them at boot via `env.ts` and
   fails loudly if any are missing, rather than failing lazily at first use.
   For integrations you haven't built yet (Cloudflare before stage 4; Stripe
   is optional until stage 7's checkout flow exists), any non-empty
   placeholder value satisfies validation.

3. Point `DATABASE_URL` at your Supabase project's **transaction pooler**
   connection string (Project Settings → Database → Connection string →
   Transaction pooler mode), not the direct connection string.

4. Generate and run migrations:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. Seed sample data (an admin, an instructor, and one free + two paid
   courses). This also provisions the admin/instructor accounts in Supabase
   Auth via the service role key:

   ```bash
   npm run db:seed
   ```

6. Run the dev server:

   ```bash
   npm run dev
   ```

7. Sign in as the seeded instructor at `/sign-in` (`instructor@ussa-academy.com` /
   `ChangeMe123!`) to reach `/instructor/courses` and create/manage courses,
   modules, and lessons. Ownership is enforced in the server actions
   (`src/features/courses/require-course-ownership.ts`), not just hidden in
   the UI — an instructor who isn't the course owner gets a 403 even if they
   guess the URL.

## Testing

```bash
npm run test
```

Unit tests mock `src/db/client.ts` rather than requiring a live database, so
they run without Supabase credentials. `tests/require-course-ownership.test.ts`
proves an instructor can't mutate a course they don't own (and that admins
can mutate any course).

## Webhook tunnel (local development)

Payment and video-processing webhooks need a public URL during local dev.
Instructions for Stripe webhook tunneling will be added here once that
webhook handler is implemented (build stage 7).

### Cloudflare Stream

1. Expose your local dev server publicly, e.g. `cloudflared tunnel --url http://localhost:3000`.
2. Register the webhook once per Cloudflare account (not per request):

   ```bash
   curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/stream/webhook" \
     -H "Authorization: Bearer $CLOUDFLARE_STREAM_API_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"notificationUrl": "https://<your-tunnel-url>/api/webhooks/cloudflare-stream"}'
   ```

   The response includes a `secret` field — put that in `CLOUDFLARE_STREAM_WEBHOOK_SECRET`.
3. Cloudflare POSTs to that URL whenever a video's processing status changes.
   The handler (`src/app/api/webhooks/cloudflare-stream/route.ts`) verifies the
   `Webhook-Signature` header (HMAC-SHA256, time + raw body) before touching
   the database, and fills in `lessons.duration_seconds` once a video reaches
   the `ready` state.

## Environment variables

Note: there's no `SUPABASE_JWT_SECRET`. Supabase session tokens are signed
with a rotating asymmetric key, not a static shared secret — verification
fetches the public key from the project's JWKS endpoint instead (see
`src/features/auth/get-authenticated-user.ts`). Nothing to configure or keep
in sync.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Supabase transaction pooler connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account for Stream API calls |
| `CLOUDFLARE_STREAM_API_TOKEN` | Cloudflare Stream API token |
| `CLOUDFLARE_STREAM_SIGNING_KEY_ID` | Signing key ID for signed playback tokens |
| `CLOUDFLARE_STREAM_SIGNING_KEY_PEM` | Signing key PEM for signed playback tokens |
| `CLOUDFLARE_STREAM_WEBHOOK_SECRET` | Verifies Cloudflare Stream webhook signatures |
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Verifies Stripe webhook signatures |
| `NEXT_PUBLIC_APP_URL` | Base URL used in redirects and webhooks |

## API surface for the future mobile app

Every `/api/v1/` route works with either a Supabase session cookie (web/PWA)
or an `Authorization: Bearer <accessToken>` header (mobile), resolved through
a single `getAuthenticatedUser` function (`src/features/auth/get-authenticated-user.ts`).
No route parses cookies or headers itself.

`GET /api/v1/me` returns the caller's profile and is the simplest proof of
this. With no credentials at all:

```bash
curl -s http://localhost:3000/api/v1/me
# {"error":{"code":"UNAUTHENTICATED","message":"Sign in required."}}
```

With a bearer token (mobile-style call, no cookie sent):

```bash
curl -s -H "Authorization: Bearer <supabaseAccessToken>" http://localhost:3000/api/v1/me
# {"userId":"...","email":"...","displayName":"...","role":"..."}
```

Get a real `supabaseAccessToken` by signing in through `supabase.auth.signInWithPassword`
(e.g. from the browser console against your Supabase project) once seed data
exists. More `/api/v1/` routes and their curl examples land here as they're
built (stages 3–7).

## Build stages

This project is being built in the following order, per the approved plan
(`C:\Users\USER-PC\.claude\plans\jaunty-coalescing-hopper.md`):

1. Schema, migrations, seed script
2. Supabase Auth wiring, `getAuthenticatedUser`, role checks, JSON error helper
3. Course/module/lesson CRUD for instructors, ownership-scoped
4. Cloudflare Stream direct upload flow + ready-state webhook
5. Signed playback endpoint + `requireLessonAccess` ← current stage
6. Learner course pages and player with progress heartbeats
7. Free enrollment, then Stripe checkout
