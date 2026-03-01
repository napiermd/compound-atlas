"""Community signal ingestion (Reddit-first).

Collects posts from configured subreddits, maps mentions to compounds by name/alias,
assigns goal-context labels, and rolls up 7/30/90 day aggregates.
"""

from __future__ import annotations

import os
import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Iterable, Literal
from xml.etree import ElementTree as ET

import httpx
import psycopg2
import typer
import yaml
from rich.console import Console

console = Console()

DEFAULT_WINDOW_DAYS = (7, 30, 90)
DEFAULT_GOAL_LABELS = [
    "focus",
    "memory",
    "mood",
    "sleep",
    "stress",
    "productivity",
    "energy",
    "motivation",
    "anxiety",
    "clarity",
]

GOAL_KEYWORDS = {
    "focus": ["focus", "concentration", "attention", "adhd"],
    "memory": ["memory", "recall", "memor", "learning"],
    "mood": ["mood", "depression", "anhedonia", "wellbeing"],
    "sleep": ["sleep", "insomnia", "deep sleep", "rem"],
    "stress": ["stress", "cortisol", "burnout", "calm"],
    "productivity": ["productivity", "workflow", "output", "procrast"],
    "energy": ["energy", "fatigue", "tired", "stimulant"],
    "motivation": ["motivation", "drive", "discipline"],
    "anxiety": ["anxiety", "anxious", "panic", "nervous"],
    "clarity": ["clarity", "brain fog", "mental clarity", "fog"],
}


@dataclass
class SourceConfig:
    platform: Literal["REDDIT", "TWITTER", "YOUTUBE", "FORUM"]
    identifier: str
    enabled: bool = True


def _config_path() -> Path:
    return Path(__file__).parent.parent / "config" / "community_sources.yaml"


def load_sources() -> list[SourceConfig]:
    env_sources = os.environ.get("REDDIT_NOOTROPICS_SUBREDDITS", "").strip()
    if env_sources:
        return [
            SourceConfig(platform="REDDIT", identifier=s.strip())
            for s in env_sources.split(",")
            if s.strip()
        ]

    path = _config_path()
    if not path.exists():
        return []

    with open(path) as f:
        raw = yaml.safe_load(f) or {}

    out: list[SourceConfig] = []
    reddit_items = raw.get("reddit", {}).get("subreddits", [])
    out.extend(
        SourceConfig(
            platform="REDDIT",
            identifier=i.get("name", "").strip(),
            enabled=bool(i.get("enabled", True)),
        )
        for i in reddit_items
        if i.get("name")
    )

    twitter_items = raw.get("twitter", {}).get("queries", [])
    out.extend(
        SourceConfig(
            platform="TWITTER",
            identifier=i.get("q", "").strip(),
            enabled=bool(i.get("enabled", True)),
        )
        for i in twitter_items
        if i.get("q")
    )

    youtube_items = raw.get("youtube", {}).get("queries", [])
    out.extend(
        SourceConfig(
            platform="YOUTUBE",
            identifier=i.get("q", "").strip(),
            enabled=bool(i.get("enabled", True)),
        )
        for i in youtube_items
        if i.get("q")
    )

    forum_items = raw.get("forums", {}).get("feeds", [])
    out.extend(
        SourceConfig(
            platform="FORUM",
            identifier=i.get("url", "").strip(),
            enabled=bool(i.get("enabled", True)),
        )
        for i in forum_items
        if i.get("url")
    )

    return out


def load_compound_terms(compound_data_dir: Path) -> dict[str, str]:
    terms: dict[str, str] = {}
    for yaml_file in sorted(compound_data_dir.glob("*.yaml")):
        with open(yaml_file) as f:
            comp = yaml.safe_load(f)
        slug = comp.get("slug")
        if not slug:
            continue
        names = [comp.get("name", ""), *comp.get("aliases", [])]
        for n in names:
            token = str(n).strip().lower()
            if token and len(token) >= 3:
                terms[token] = slug
    return terms


def _unix_to_dt(ts: float) -> datetime:
    return datetime.fromtimestamp(ts, tz=timezone.utc)


def load_stack_alias_map(conn) -> dict[str, set[str]]:
    cur = conn.cursor()
    out: dict[str, set[str]] = {}
    try:
        cur.execute(
            '''
            SELECT s.name, c.slug
            FROM "Stack" s
            JOIN "StackCompound" sc ON sc."stackId" = s.id
            JOIN "Compound" c ON c.id = sc."compoundId"
            WHERE s."isPublic" = true
            '''
        )
        for stack_name, compound_slug in cur.fetchall():
            raw_name = (stack_name or "").strip().lower()
            if len(raw_name) < 4:
                continue
            aliases = {raw_name}
            aliases.add(raw_name.replace("—", "-").replace("  ", " "))
            aliases.add(raw_name.replace(" stack", ""))
            for alias in aliases:
                key = alias.strip()
                if len(key) < 4:
                    continue
                out.setdefault(key, set()).add(compound_slug)
    finally:
        cur.close()
    return out


def find_mentioned_compounds(
    text: str,
    term_to_slug: dict[str, str],
    stack_alias_to_compounds: dict[str, set[str]] | None = None,
) -> set[str]:
    normalized = f" {text.lower()} "
    matched: set[str] = set()
    for term, slug in term_to_slug.items():
        escaped = re.escape(term)
        if re.search(rf"(?<![a-z0-9]){escaped}(?![a-z0-9])", normalized):
            matched.add(slug)

    if stack_alias_to_compounds:
        for alias, slugs in stack_alias_to_compounds.items():
            escaped = re.escape(alias)
            if re.search(rf"(?<![a-z0-9]){escaped}(?![a-z0-9])", normalized):
                matched.update(slugs)

    return matched


def extract_goal_labels(text: str, labels: Iterable[str] | None = None) -> list[str]:
    allowed = list(labels or DEFAULT_GOAL_LABELS)
    normalized = text.lower()
    out: list[str] = []
    for label in allowed:
        kws = GOAL_KEYWORDS.get(label, [label])
        if any(k in normalized for k in kws):
            out.append(label)
    return out


def ensure_sources(conn, sources: list[SourceConfig]):
    cur = conn.cursor()
    try:
        for source in sources:
            cur.execute(
                '''
                INSERT INTO "CommunitySource" (id, platform, identifier, enabled, "createdAt", "updatedAt")
                VALUES (%s, %s::"CommunityPlatform", %s, %s, NOW(), NOW())
                ON CONFLICT (platform, identifier)
                DO UPDATE SET enabled = EXCLUDED.enabled, "updatedAt" = NOW()
                ''',
                [str(uuid.uuid4()), source.platform, source.identifier, source.enabled],
            )
        conn.commit()
    finally:
        cur.close()


def ingest_reddit(
    conn,
    source: SourceConfig,
    term_to_slug: dict[str, str],
    stack_alias_to_compounds: dict[str, set[str]],
    since_days: int,
    dry_run: bool,
) -> int:
    if not source.enabled:
        return 0

    cutoff = datetime.now(timezone.utc) - timedelta(days=since_days)
    headers = {"User-Agent": os.environ.get("REDDIT_USER_AGENT", "compound-atlas/1.0")}
    subreddit = source.identifier
    url = f"https://www.reddit.com/r/{subreddit}/new.json"

    with httpx.Client(timeout=20.0, headers=headers) as client:
        resp = client.get(url, params={"limit": 100, "raw_json": 1})
        resp.raise_for_status()
        payload = resp.json()

    rows = payload.get("data", {}).get("children", [])
    inserted = 0

    cur = conn.cursor()
    try:
        cur.execute(
            'SELECT id FROM "CommunitySource" WHERE platform = %s::"CommunityPlatform" AND identifier = %s',
            ["REDDIT", subreddit],
        )
        source_row = cur.fetchone()
        if not source_row:
            return 0
        source_id = source_row[0]

        for child in rows:
            data = child.get("data", {})
            created = _unix_to_dt(data.get("created_utc", 0))
            if created < cutoff:
                continue

            title = data.get("title", "")
            body = data.get("selftext", "")
            text = f"{title}\n{body}".strip()
            mention_slugs = find_mentioned_compounds(text, term_to_slug, stack_alias_to_compounds)
            if not mention_slugs:
                continue

            labels = extract_goal_labels(text)
            ext_id = data.get("name") or data.get("id")
            permalink = data.get("permalink", "")
            post_url = f"https://reddit.com{permalink}" if permalink else data.get("url")

            for slug in mention_slugs:
                cur.execute('SELECT id FROM "Compound" WHERE slug = %s', [slug])
                row = cur.fetchone()
                if not row:
                    continue
                compound_id = row[0]

                if dry_run:
                    inserted += 1
                    continue

                mention_id = str(uuid.uuid4())
                cur.execute(
                    '''
                    INSERT INTO "CommunityMention" (
                      id, "sourceId", "compoundId", "externalId", title, body, url,
                      score, "commentCount", "occurredAt", "createdAt", "updatedAt"
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                    ON CONFLICT ("externalId", "compoundId") DO NOTHING
                    ''',
                    [
                        mention_id,
                        source_id,
                        compound_id,
                        ext_id,
                        title[:500],
                        body,
                        post_url,
                        int(data.get("score") or 0),
                        int(data.get("num_comments") or 0),
                        created,
                    ],
                )

                if cur.rowcount <= 0:
                    continue

                for label in labels:
                    cur.execute(
                        '''
                        INSERT INTO "CommunityMentionGoal" (id, "mentionId", label)
                        VALUES (%s, %s, %s)
                        ON CONFLICT ("mentionId", label) DO NOTHING
                        ''',
                        [str(uuid.uuid4()), mention_id, label],
                    )
                inserted += 1

        if not dry_run:
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()

    return inserted


def ingest_twitter(
    conn,
    source: SourceConfig,
    term_to_slug: dict[str, str],
    stack_alias_to_compounds: dict[str, set[str]],
    since_days: int,
    dry_run: bool,
) -> int:
    if not source.enabled:
        return 0

    bearer = os.environ.get("TWITTER_BEARER_TOKEN", "").strip()
    if not bearer:
        console.print("[yellow]Skipping Twitter ingest: TWITTER_BEARER_TOKEN not set[/yellow]")
        return 0

    cutoff = datetime.now(timezone.utc) - timedelta(days=since_days)
    query = source.identifier
    url = "https://api.twitter.com/2/tweets/search/recent"

    with httpx.Client(timeout=20.0, headers={"Authorization": f"Bearer {bearer}"}) as client:
        resp = client.get(
            url,
            params={
                "query": query,
                "max_results": 100,
                "tweet.fields": "created_at,public_metrics,text",
            },
        )
        resp.raise_for_status()
        payload = resp.json()

    rows = payload.get("data", [])
    inserted = 0
    cur = conn.cursor()
    try:
        cur.execute(
            'SELECT id FROM "CommunitySource" WHERE platform = %s::"CommunityPlatform" AND identifier = %s',
            ["TWITTER", query],
        )
        source_row = cur.fetchone()
        if not source_row:
            return 0
        source_id = source_row[0]

        for item in rows:
            text = (item.get("text") or "").strip()
            if not text:
                continue
            created_raw = item.get("created_at")
            if not created_raw:
                continue
            created = datetime.fromisoformat(created_raw.replace("Z", "+00:00"))
            if created < cutoff:
                continue

            mention_slugs = find_mentioned_compounds(text, term_to_slug, stack_alias_to_compounds)
            if not mention_slugs:
                continue

            labels = extract_goal_labels(text)
            ext_id = item.get("id")
            metrics = item.get("public_metrics") or {}
            like_count = int(metrics.get("like_count") or 0)
            reply_count = int(metrics.get("reply_count") or 0)
            repost_count = int(metrics.get("retweet_count") or 0)
            quote_count = int(metrics.get("quote_count") or 0)
            weighted_score = like_count + (reply_count * 3) + (repost_count * 2) + (quote_count * 2)
            tweet_url = f"https://x.com/i/web/status/{ext_id}" if ext_id else None

            for slug in mention_slugs:
                cur.execute('SELECT id FROM "Compound" WHERE slug = %s', [slug])
                row = cur.fetchone()
                if not row:
                    continue
                compound_id = row[0]

                if dry_run:
                    inserted += 1
                    continue

                mention_id = str(uuid.uuid4())
                cur.execute(
                    '''
                    INSERT INTO "CommunityMention" (
                      id, "sourceId", "compoundId", "externalId", title, body, url,
                      score, "commentCount", "occurredAt", "createdAt", "updatedAt"
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                    ON CONFLICT ("externalId", "compoundId") DO NOTHING
                    ''',
                    [
                        mention_id,
                        source_id,
                        compound_id,
                        ext_id,
                        text[:500],
                        text,
                        tweet_url,
                        weighted_score,
                        reply_count,
                        created,
                    ],
                )
                if cur.rowcount <= 0:
                    continue

                for label in labels:
                    cur.execute(
                        '''
                        INSERT INTO "CommunityMentionGoal" (id, "mentionId", label)
                        VALUES (%s, %s, %s)
                        ON CONFLICT ("mentionId", label) DO NOTHING
                        ''',
                        [str(uuid.uuid4()), mention_id, label],
                    )
                inserted += 1

        if not dry_run:
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()

    return inserted


def ingest_youtube(
    conn,
    source: SourceConfig,
    term_to_slug: dict[str, str],
    stack_alias_to_compounds: dict[str, set[str]],
    since_days: int,
    dry_run: bool,
) -> int:
    if not source.enabled:
        return 0

    api_key = os.environ.get("YOUTUBE_API_KEY", "").strip()
    if not api_key:
        console.print("[yellow]Skipping YouTube ingest: YOUTUBE_API_KEY not set[/yellow]")
        return 0

    cutoff = datetime.now(timezone.utc) - timedelta(days=since_days)
    query = source.identifier
    url = "https://www.googleapis.com/youtube/v3/search"

    with httpx.Client(timeout=20.0) as client:
        resp = client.get(
            url,
            params={
                "key": api_key,
                "part": "snippet",
                "q": query,
                "type": "video",
                "maxResults": 25,
                "order": "date",
            },
        )
        resp.raise_for_status()
        payload = resp.json()

    inserted = 0
    cur = conn.cursor()
    try:
        cur.execute(
            'SELECT id FROM "CommunitySource" WHERE platform = %s::"CommunityPlatform" AND identifier = %s',
            ["YOUTUBE", query],
        )
        source_row = cur.fetchone()
        if not source_row:
            return 0
        source_id = source_row[0]

        for item in payload.get("items", []):
            snippet = item.get("snippet") or {}
            title = (snippet.get("title") or "").strip()
            desc = (snippet.get("description") or "").strip()
            text = f"{title}\n{desc}".strip()
            if not text:
                continue

            published = snippet.get("publishedAt")
            if not published:
                continue
            created = datetime.fromisoformat(published.replace("Z", "+00:00"))
            if created < cutoff:
                continue

            mention_slugs = find_mentioned_compounds(text, term_to_slug, stack_alias_to_compounds)
            if not mention_slugs:
                continue

            labels = extract_goal_labels(text)
            video_id = (item.get("id") or {}).get("videoId")
            ext_id = f"youtube:{video_id}" if video_id else None
            video_url = f"https://www.youtube.com/watch?v={video_id}" if video_id else None

            for slug in mention_slugs:
                cur.execute('SELECT id FROM "Compound" WHERE slug = %s', [slug])
                row = cur.fetchone()
                if not row:
                    continue
                compound_id = row[0]

                if dry_run:
                    inserted += 1
                    continue

                mention_id = str(uuid.uuid4())
                cur.execute(
                    '''
                    INSERT INTO "CommunityMention" (
                      id, "sourceId", "compoundId", "externalId", title, body, url,
                      score, "commentCount", "occurredAt", "createdAt", "updatedAt"
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                    ON CONFLICT ("externalId", "compoundId") DO NOTHING
                    ''',
                    [
                        mention_id,
                        source_id,
                        compound_id,
                        ext_id,
                        title[:500],
                        desc,
                        video_url,
                        0,
                        0,
                        created,
                    ],
                )
                if cur.rowcount <= 0:
                    continue

                for label in labels:
                    cur.execute(
                        '''
                        INSERT INTO "CommunityMentionGoal" (id, "mentionId", label)
                        VALUES (%s, %s, %s)
                        ON CONFLICT ("mentionId", label) DO NOTHING
                        ''',
                        [str(uuid.uuid4()), mention_id, label],
                    )
                inserted += 1

        if not dry_run:
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()

    return inserted


def ingest_forum_feed(
    conn,
    source: SourceConfig,
    term_to_slug: dict[str, str],
    stack_alias_to_compounds: dict[str, set[str]],
    since_days: int,
    dry_run: bool,
) -> int:
    if not source.enabled:
        return 0

    cutoff = datetime.now(timezone.utc) - timedelta(days=since_days)
    feed_url = source.identifier

    with httpx.Client(timeout=20.0, headers={"User-Agent": "compound-atlas/1.0"}) as client:
        resp = client.get(feed_url)
        resp.raise_for_status()
        payload = resp.text

    root = ET.fromstring(payload)
    inserted = 0

    cur = conn.cursor()
    try:
        cur.execute(
            'SELECT id FROM "CommunitySource" WHERE platform = %s::"CommunityPlatform" AND identifier = %s',
            ["FORUM", feed_url],
        )
        source_row = cur.fetchone()
        if not source_row:
            return 0
        source_id = source_row[0]

        for item in root.findall(".//item"):
            title = (item.findtext("title") or "").strip()
            body = (item.findtext("description") or "").strip()
            link = (item.findtext("link") or "").strip() or None
            pub_date = (item.findtext("pubDate") or "").strip()

            if not title and not body:
                continue

            if pub_date:
                try:
                    created = parsedate_to_datetime(pub_date)
                    if created.tzinfo is None:
                        created = created.replace(tzinfo=timezone.utc)
                except Exception:
                    created = datetime.now(timezone.utc)
            else:
                created = datetime.now(timezone.utc)

            if created < cutoff:
                continue

            text = f"{title}\n{body}".strip()
            mention_slugs = find_mentioned_compounds(text, term_to_slug, stack_alias_to_compounds)
            if not mention_slugs:
                continue

            labels = extract_goal_labels(text)
            ext_id = link or f"forum:{uuid.uuid4()}"

            for slug in mention_slugs:
                cur.execute('SELECT id FROM "Compound" WHERE slug = %s', [slug])
                row = cur.fetchone()
                if not row:
                    continue
                compound_id = row[0]

                if dry_run:
                    inserted += 1
                    continue

                mention_id = str(uuid.uuid4())
                cur.execute(
                    '''
                    INSERT INTO "CommunityMention" (
                      id, "sourceId", "compoundId", "externalId", title, body, url,
                      score, "commentCount", "occurredAt", "createdAt", "updatedAt"
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                    ON CONFLICT ("externalId", "compoundId") DO NOTHING
                    ''',
                    [
                        mention_id,
                        source_id,
                        compound_id,
                        ext_id,
                        title[:500],
                        body,
                        link,
                        0,
                        0,
                        created,
                    ],
                )
                if cur.rowcount <= 0:
                    continue

                for label in labels:
                    cur.execute(
                        '''
                        INSERT INTO "CommunityMentionGoal" (id, "mentionId", label)
                        VALUES (%s, %s, %s)
                        ON CONFLICT ("mentionId", label) DO NOTHING
                        ''',
                        [str(uuid.uuid4()), mention_id, label],
                    )
                inserted += 1

        if not dry_run:
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()

    return inserted


def rollup_windows(conn, windows: Iterable[int] = DEFAULT_WINDOW_DAYS, dry_run: bool = False):
    if dry_run:
        return

    cur = conn.cursor()
    try:
        for days in windows:
            window_end = datetime.now(timezone.utc)
            window_start = window_end - timedelta(days=days)

            cur.execute(
                '''
                DELETE FROM "CommunitySignalAggregate"
                WHERE "windowDays" = %s
                  AND "windowEnd" >= NOW() - INTERVAL '2 days'
                ''',
                [days],
            )

            cur.execute(
                '''
                INSERT INTO "CommunitySignalAggregate" (
                  id, "compoundId", "goalLabel", platform,
                  "windowDays", "windowStart", "windowEnd",
                  "mentionCount", "scoreSum", "commentSum",
                  "createdAt", "updatedAt"
                )
                SELECT
                  gen_random_uuid()::text,
                  cm."compoundId",
                  COALESCE(cmg.label, 'general') as "goalLabel",
                  cs.platform as platform,
                  %s,
                  %s,
                  %s,
                  COUNT(*)::int as "mentionCount",
                  COALESCE(SUM(cm.score),0)::int as "scoreSum",
                  COALESCE(SUM(cm."commentCount"),0)::int as "commentSum",
                  NOW(),
                  NOW()
                FROM "CommunityMention" cm
                JOIN "CommunitySource" cs ON cs.id = cm."sourceId"
                LEFT JOIN "CommunityMentionGoal" cmg ON cmg."mentionId" = cm.id
                WHERE cm."occurredAt" >= %s AND cm."occurredAt" < %s
                GROUP BY cm."compoundId", COALESCE(cmg.label, 'general'), cs.platform
                ''',
                [days, window_start, window_end, window_start, window_end],
            )

        conn.commit()
    finally:
        cur.close()


def run_community_ingest(
    conn,
    compound_data_dir: Path,
    since_days: int = 90,
    dry_run: bool = False,
) -> dict:
    sources = [s for s in load_sources() if s.enabled]
    ensure_sources(conn, sources)

    terms = load_compound_terms(compound_data_dir)
    stack_alias_to_compounds = load_stack_alias_map(conn)

    inserted = 0
    for src in sources:
        try:
            if src.platform == "REDDIT":
                inserted += ingest_reddit(
                    conn,
                    src,
                    terms,
                    stack_alias_to_compounds,
                    since_days=since_days,
                    dry_run=dry_run,
                )
            elif src.platform == "TWITTER":
                inserted += ingest_twitter(
                    conn,
                    src,
                    terms,
                    stack_alias_to_compounds,
                    since_days=since_days,
                    dry_run=dry_run,
                )
            elif src.platform == "YOUTUBE":
                inserted += ingest_youtube(
                    conn,
                    src,
                    terms,
                    stack_alias_to_compounds,
                    since_days=since_days,
                    dry_run=dry_run,
                )
            elif src.platform == "FORUM":
                inserted += ingest_forum_feed(
                    conn,
                    src,
                    terms,
                    stack_alias_to_compounds,
                    since_days=since_days,
                    dry_run=dry_run,
                )
        except Exception as e:
            console.print(f"[red]{src.platform} ingestion failed for {src.identifier}: {e}[/red]")

    rollup_windows(conn, dry_run=dry_run)
    return {"sources": [f"{s.platform}:{s.identifier}" for s in sources], "mentions": inserted}


def register_command(app: typer.Typer, get_db_connection, compound_data_dir: Path):
    @app.command("community-signals")
    def community_signals(
        since: str = typer.Option("90d", help="Ingest lookback (e.g. 30d, 90d)"),
        dry_run: bool = typer.Option(False, "--dry-run", help="Run without writing"),
    ):
        since_days = 90
        if since.endswith("d"):
            since_days = int(since[:-1])

        conn = get_db_connection()
        try:
            result = run_community_ingest(
                conn,
                compound_data_dir=compound_data_dir,
                since_days=since_days,
                dry_run=dry_run,
            )
            console.print(
                f"[green]Community ingest complete[/green] | sources={len(result['sources'])} mentions={result['mentions']}"
            )
            console.print(", ".join(result["sources"]))
        finally:
            conn.close()
