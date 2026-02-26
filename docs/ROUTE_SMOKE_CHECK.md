# Route Smoke Check

Lightweight smoke test for key web routes:

- `/`
- `/compounds`
- `/compounds/<seed-slug>`
- `/stacks`
- `/research`
- `/login`

## Commands

From repo root:

```bash
npm run smoke:routes
```

CI-safe (non-blocking wrapper):

```bash
npm run smoke:routes:ci
```

## Environment

The script validates app routes by starting Next.js locally. It expects:

- `DATABASE_URL`
- `AUTH_SECRET` (or `NEXTAUTH_SECRET`)

If these are missing, the check exits with a **skip** message.

## Notes

- Script file: `apps/web/scripts/smoke-routes.mjs`
- Uses production server when a build is available.
- If a production build is unavailable, it attempts `npm run build`; if build fails, it falls back to `next dev` smoke mode.
- Dynamic compound route uses the first slug in `packages/compound-data/compounds/*.yaml` (or `SMOKE_SEED_SLUG` override).
