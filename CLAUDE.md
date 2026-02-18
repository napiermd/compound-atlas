# CLAUDE.md — Instructions for Claude Code

## Project: CompoundAtlas
An open-source, evidence-based compound and stack planning platform.

## Quick Start Commands

```bash
# Install and set up
npm install
docker-compose up -d
cp .env.example .env
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

## Architecture
- **Monorepo**: Turborepo with `apps/web` (Next.js) and `packages/*`
- **Database**: PostgreSQL via Prisma ORM (schema in `apps/web/prisma/schema.prisma`)
- **Research Pipeline**: Python in `packages/research-ingestion/`
- **Seed Data**: YAML compound files in `packages/compound-data/compounds/`

## Key Patterns
- Use tRPC for all API endpoints (type-safe end-to-end)
- Use shadcn/ui for all UI components
- Evidence scores are computed by `packages/research-ingestion/src/scorer.py`
- PubMed and Semantic Scholar data is cached in Redis with 7-day TTL
- All compound data starts from YAML seed files, enriched by the research pipeline

## Code Style
- TypeScript strict mode
- Functional React components with hooks
- Prisma for all database access (no raw SQL)
- Python: type hints, dataclasses, httpx for HTTP

## Testing
- Vitest for TypeScript
- Pytest for Python
- E2E: Playwright (when ready)

## Common Tasks

### Add a new compound
1. Create YAML file in `packages/compound-data/compounds/{slug}.yaml`
2. Run seed: `npx prisma db seed`
3. Run ingestion: `cd packages/research-ingestion && python -m src.ingest --compound {slug}`

### Update evidence scores
```bash
cd packages/research-ingestion
python -m src.ingest --incremental --since 7d
```

### Generate Prisma client after schema changes
```bash
npx prisma generate
npx prisma migrate dev --name describe_change
```
