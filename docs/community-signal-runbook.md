# Community Signal Ingestion Runbook (Reddit + Nootropics)

This runbook covers the nootropics-focused Reddit ingestion pipeline used for
community prevalence and trend analytics.

## Scope
- Source: Reddit public subreddit feeds
- Output: `CommunityMention`, `CommunityMentionGoal`, `CommunitySignalAggregate`
- Aggregation windows: 7 / 30 / 90 days
- Explicitly excludes dosing/protocol recommendations

## Source configuration
Configure subreddit sources in:

`packages/research-ingestion/config/community_sources.yaml`

Current default source list:
- r/nootropics
- r/NootropicsDepot
- r/stackadvice
- r/biohackers
- r/supplements
- r/memory
- r/sleep

Override via env var:

```bash
export REDDIT_NOOTROPICS_SUBREDDITS="nootropics,NootropicsDepot,biohackers"
```

## Goal context labels
Supported labels (new nootropics labels while preserving existing free-text compatibility):
- focus
- memory
- mood
- sleep
- stress
- productivity
- energy
- motivation
- anxiety
- clarity

Mentions without a matched label are aggregated under `general`.

## Run commands

```bash
cd packages/research-ingestion
pip install -r requirements.txt

# Community ingest + rollups (default 90d)
python -m src.ingest community-signals

# Dry run
python -m src.ingest community-signals --dry-run

# Custom lookback
python -m src.ingest community-signals --since 30d
```

## Cron recommendation
Run every 12h or daily:

```bash
python -m src.ingest community-signals --since 90d
```

This keeps rolling 7/30/90 aggregates fresh in `CommunitySignalAggregate`.
