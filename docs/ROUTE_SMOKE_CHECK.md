# Route + Link Smoke Checks

Lightweight smoke checks for key web routes and internal links.

## Route smoke check

Checks these routes:

- `/`
- `/compounds`
- `/compounds/<seed-slug>`
- `/stacks`
- `/research`
- `/login`

From repo root:

```bash
npm run smoke:routes
```

CI-safe (non-blocking wrapper):

```bash
npm run smoke:routes:ci
```

## Link smoke check

Starts from these seed routes:

- `/`
- `/compounds`
- `/stacks`
- `/research`
- `/cycles`
- `/login`

Then crawls and validates up to the top **30 dynamic internal links** discovered in rendered HTML.

Checks performed:

1. Internal link target responds without 4xx/5xx
2. Internal path matches a real App Router route pattern (including dynamic segments)

Run locally:

```bash
npm run smoke:links
```

CI-safe (non-blocking wrapper):

```bash
npm run smoke:links:ci
```

## Environment

Both scripts start Next.js locally and expect:

- `DATABASE_URL`
- `AUTH_SECRET` (or `NEXTAUTH_SECRET`)

If these are missing, checks exit with a **skip** message.

## Files

- `apps/web/scripts/smoke-routes.mjs`
- `apps/web/scripts/smoke-links.mjs`

## Notes

- Uses production server when a build is available.
- If production build is unavailable, attempts `npm run build`; if build fails, falls back to `next dev` smoke mode.
- Route smoke dynamic compound route uses first slug in `packages/compound-data/compounds/*.yaml` (or `SMOKE_SEED_SLUG` override).
- Link smoke limits can be tuned with env vars:
  - `SMOKE_DYNAMIC_LIMIT` (default `30`)
  - `SMOKE_PAGE_LIMIT` (default `80`)
