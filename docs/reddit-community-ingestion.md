# Reddit Community-Signal Ingestion (Safety-Scoped)

This pipeline ingests **public Reddit discussion prevalence** and stores aggregate trend signals for CompoundAtlas.

## Safety scope

- ✅ Tracks only mention prevalence/trend context
- ✅ Aggregates by windows: **7 / 30 / 90 days**
- ✅ Labels goal context (bulk/cut/recomp/side-effects/recovery/etc)
- ❌ Does **not** produce dosing guidance
- ❌ Does **not** produce cycle/protocol optimization

## Data model added

- `CommunitySignalRun`
  - Run metadata (source, subreddits, scanned post/comment counts, total mention-events)
- `CommunitySignalMention`
  - Aggregate rows keyed by `(source, windowDays, compoundId, goalLabel)`
  - Counts: `mentionCount`, `uniqueThreads`, `uniqueAuthors`
  - Includes `subredditBreakdown` JSON and freshness markers (`firstSeenAt`, `lastSeenAt`)

Enums:
- `CommunitySignalSource` (`REDDIT`)
- `CommunityGoalLabel` (`BULK`, `CUT`, `RECOMP`, `SIDE_EFFECTS`, `RECOVERY`, `PERFORMANCE`, `LIBIDO`, `SLEEP`, `MOOD`, `GENERAL`)

## Source defaults

Default subreddits:
- `r/steroids`
- `r/bodybuilding`
- `r/testosterone`

Configurable with `--subreddits`.

## Run commands

From repo root:

```bash
# 1) Install Python deps for ingestion package
pip install -r packages/research-ingestion/requirements.txt

# 2) Apply Prisma migration
cd apps/web
npx prisma migrate deploy
cd ../..

# 3) Dry-run ingestion (no DB writes)
cd packages/research-ingestion
python -m src.community_reddit_ingest run --dry-run

# 4) Persist aggregates to DB
python -m src.community_reddit_ingest run

# 5) Custom subreddits / limits
python -m src.community_reddit_ingest run \
  --subreddits "steroids,bodybuilding,testosterone,peds" \
  --max-posts 120 \
  --max-comments 150
```

## Reproducibility notes

- Uses deterministic regex matching against compound names/aliases from `packages/compound-data/compounds/*.yaml`
- Rebuilds Reddit aggregates per run by replacing existing `source=REDDIT` rows
- Uses UTC timestamps and explicit 7/30/90d windows
- Includes `--dry-run` mode for safe verification in CI/local checks
