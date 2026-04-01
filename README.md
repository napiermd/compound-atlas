# CompoundAtlas

Evidence-based compound research, stack planning, and cycle tracking in a single open-source application.

Live app: https://compound-atlas.vercel.app

## What It Does

CompoundAtlas is a research-first interface for exploring compounds and protocols with more structure than forum posts and more transparency than black-box recommendation apps.

The current product focuses on:

- Browsing compounds with evidence and safety scores
- Surfacing underlying studies and research summaries
- Building multi-compound stacks
- Tracking cycles and related health data over time
- Making the scoring model legible instead of hiding it behind a proprietary claim

## Why It Exists

Most products in this category are either:

- thin affiliate-content sites dressed up as education
- fragmented spreadsheets and Reddit threads
- closed tools that give confident recommendations without showing the evidence basis

CompoundAtlas takes the opposite approach: transparent scoring, visible source material, and an interface built around research review rather than hype.

## Product Direction

The repository includes a Next.js web app backed by Prisma and PostgreSQL, with infrastructure for ingesting and scoring literature-backed compound data.

Current emphasis:

- Compound explorer and detail views
- Study indexing and scoring
- Stack construction workflows
- Cycle tracking
- Research ingestion pipelines

This is an active build, not a finished knowledge base.

## Tech Stack

- Next.js 14
- TypeScript
- Prisma
- PostgreSQL
- Tailwind CSS
- tRPC

## Local Development

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run build
npm run lint
npm run type-check
npm run test
```

Database helpers:

```bash
npm run db:migrate
npm run db:seed
npm run db:studio
```

## Notes

- The project is open source, but some data pipelines and environments may require API keys or local services to run fully.
- Content in the app is intended to present research and evidence structure, not individualized medical advice.

## License

MIT
