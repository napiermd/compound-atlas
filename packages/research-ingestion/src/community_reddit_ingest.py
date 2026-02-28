"""
Reddit community-signal ingestion for CompoundAtlas.

Safety scope: prevalence/trend aggregation only. No protocol or dosing guidance.

Usage:
  python -m src.community_reddit_ingest run
  python -m src.community_reddit_ingest run --subreddits steroids,bodybuilding,testosterone
  python -m src.community_reddit_ingest run --max-posts 60 --include-comments
"""

from __future__ import annotations

import json
import os
import re
import uuid
from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Iterable

import httpx
import psycopg2
import typer
import yaml
from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table

load_dotenv()
app = typer.Typer(help="Reddit community-signal ingestion")
console = Console()

COMPOUND_DATA_DIR = Path(__file__).parent.parent.parent / "compound-data" / "compounds"
DEFAULT_SUBREDDITS = ["steroids", "bodybuilding", "testosterone"]
WINDOWS_DAYS = [7, 30, 90]

GOAL_KEYWORDS: dict[str, tuple[str, ...]] = {
    "BULK": ("bulk", "bulking", "mass gain", "size gain", "offseason"),
    "CUT": ("cut", "cutting", "fat loss", "lean out", "shred"),
    "RECOMP": ("recomp", "body recomposition", "recomposition"),
    "SIDE_EFFECTS": (
        "side effect",
        "adverse",
        "acne",
        "hair loss",
        "gyno",
        "gynecomastia",
        "blood pressure",
        "liver",
        "cholesterol",
        "anxiety",
        "insomnia",
    ),
    "RECOVERY": ("recovery", "post cycle", "pct", "off-cycle", "rehab"),
    "PERFORMANCE": ("strength", "endurance", "performance", "pr", "power"),
    "LIBIDO": ("libido", "sex drive", "erection", "ed"),
    "SLEEP": ("sleep", "insomnia", "restless", "wake up"),
    "MOOD": ("mood", "irritable", "depression", "anxiety", "motivation"),
}


@dataclass(frozen=True)
class MentionEvent:
    compound_slug: str
    goal_label: str
    subreddit: str
    thread_id: str
    author: str
    created_at: datetime


def get_db_connection():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL not set in environment")
    return psycopg2.connect(db_url)


def load_compound_alias_patterns() -> list[tuple[str, re.Pattern[str]]]:
    patterns: list[tuple[str, re.Pattern[str]]] = []

    for yaml_file in sorted(COMPOUND_DATA_DIR.glob("*.yaml")):
        with open(yaml_file, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}

        slug = data.get("slug")
        if not slug:
            continue

        names = {str(data.get("name", "")).strip()}
        names.update(str(a).strip() for a in data.get("aliases", []) if a)

        for name in names:
            if not name:
                continue
            # Very short aliases generate extreme false positives in Reddit slang.
            if len(name) < 4:
                continue
            escaped = re.escape(name)
            pattern = re.compile(rf"(?<!\w){escaped}(?!\w)", re.IGNORECASE)
            patterns.append((slug, pattern))

    # Longest aliases first to avoid partial overshadowing.
    patterns.sort(key=lambda x: len(x[1].pattern), reverse=True)
    return patterns


def detect_goal_labels(text: str) -> set[str]:
    text_lower = text.lower()
    labels: set[str] = set()
    for label, keywords in GOAL_KEYWORDS.items():
        if any(keyword in text_lower for keyword in keywords):
            labels.add(label)

    if not labels:
        labels.add("GENERAL")

    return labels


def extract_compound_slugs(text: str, compound_patterns: list[tuple[str, re.Pattern[str]]]) -> set[str]:
    found: set[str] = set()
    for slug, pattern in compound_patterns:
        if pattern.search(text):
            found.add(slug)
    return found


def parse_reddit_ts(raw: float | int | None) -> datetime:
    if not raw:
        return datetime.now(UTC)
    return datetime.fromtimestamp(float(raw), tz=UTC)


def fetch_listing(
    client: httpx.Client,
    subreddit: str,
    max_posts: int,
    sort: str,
    t_window: str,
) -> list[dict]:
    url = f"https://www.reddit.com/r/{subreddit}/{sort}.json"
    params = {"limit": min(max_posts, 100), "raw_json": 1}
    if sort == "top":
        params["t"] = t_window

    resp = client.get(url, params=params)
    resp.raise_for_status()

    payload = resp.json()
    children = payload.get("data", {}).get("children", [])
    return [c.get("data", {}) for c in children if c.get("kind") == "t3"]


def fetch_comments(client: httpx.Client, subreddit: str, post_id: str, max_comments: int) -> list[dict]:
    url = f"https://www.reddit.com/r/{subreddit}/comments/{post_id}.json"
    resp = client.get(url, params={"limit": max_comments, "raw_json": 1, "depth": 2})
    resp.raise_for_status()

    payload = resp.json()
    if not isinstance(payload, list) or len(payload) < 2:
        return []

    listing = payload[1].get("data", {}).get("children", [])
    out: list[dict] = []

    def walk(nodes: Iterable[dict]):
        for node in nodes:
            if node.get("kind") != "t1":
                continue
            data = node.get("data", {})
            out.append(data)
            replies = data.get("replies")
            if isinstance(replies, dict):
                walk(replies.get("data", {}).get("children", []))

    walk(listing)
    return out[:max_comments]


def collect_events(
    subreddits: list[str],
    max_posts: int,
    include_comments: bool,
    max_comments: int,
    sort: str,
    t_window: str,
    compound_patterns: list[tuple[str, re.Pattern[str]]],
) -> tuple[list[MentionEvent], int, int]:
    events: list[MentionEvent] = []
    posts_scanned = 0
    comments_scanned = 0

    headers = {
        "User-Agent": "CompoundAtlasCommunitySignals/1.0 (+https://compoundatlas.com)",
    }
    timeout = httpx.Timeout(20.0)

    with httpx.Client(headers=headers, timeout=timeout, follow_redirects=True) as client:
        for subreddit in subreddits:
            try:
                posts = fetch_listing(client, subreddit, max_posts=max_posts, sort=sort, t_window=t_window)
            except Exception as e:
                console.print(f"[yellow]Skipping r/{subreddit}: {e}[/yellow]")
                continue

            for post in posts:
                posts_scanned += 1
                post_text = f"{post.get('title', '')}\n{post.get('selftext', '')}".strip()
                post_compounds = extract_compound_slugs(post_text, compound_patterns)
                post_labels = detect_goal_labels(post_text)
                created_at = parse_reddit_ts(post.get("created_utc"))
                author = str(post.get("author") or "unknown")
                thread_id = str(post.get("id") or "")

                for compound_slug in post_compounds:
                    for label in post_labels:
                        events.append(
                            MentionEvent(
                                compound_slug=compound_slug,
                                goal_label=label,
                                subreddit=subreddit,
                                thread_id=thread_id,
                                author=author,
                                created_at=created_at,
                            )
                        )

                if not include_comments or not thread_id:
                    continue

                try:
                    comments = fetch_comments(client, subreddit, thread_id, max_comments=max_comments)
                except Exception:
                    continue

                for comment in comments:
                    comments_scanned += 1
                    body = str(comment.get("body") or "")
                    compounds = extract_compound_slugs(body, compound_patterns)
                    if not compounds:
                        continue
                    labels = detect_goal_labels(body)

                    event_ts = parse_reddit_ts(comment.get("created_utc"))
                    event_author = str(comment.get("author") or "unknown")
                    for compound_slug in compounds:
                        for label in labels:
                            events.append(
                                MentionEvent(
                                    compound_slug=compound_slug,
                                    goal_label=label,
                                    subreddit=subreddit,
                                    thread_id=thread_id,
                                    author=event_author,
                                    created_at=event_ts,
                                )
                            )

    return events, posts_scanned, comments_scanned


def aggregate_events(events: list[MentionEvent]) -> dict[tuple[int, str, str], dict]:
    now = datetime.now(UTC)
    agg: dict[tuple[int, str, str], dict] = {}

    for event in events:
        for window_days in WINDOWS_DAYS:
            if event.created_at < (now - timedelta(days=window_days)):
                continue

            key = (window_days, event.compound_slug, event.goal_label)
            record = agg.setdefault(
                key,
                {
                    "mention_count": 0,
                    "thread_ids": set(),
                    "authors": set(),
                    "subreddit_counts": defaultdict(int),
                    "first_seen": event.created_at,
                    "last_seen": event.created_at,
                },
            )
            record["mention_count"] += 1
            record["thread_ids"].add(event.thread_id)
            record["authors"].add(event.author)
            record["subreddit_counts"][event.subreddit] += 1
            if event.created_at < record["first_seen"]:
                record["first_seen"] = event.created_at
            if event.created_at > record["last_seen"]:
                record["last_seen"] = event.created_at

    return agg


def resolve_compound_ids(conn) -> dict[str, str]:
    cur = conn.cursor()
    cur.execute('SELECT id, slug FROM "Compound"')
    rows = cur.fetchall()
    cur.close()
    return {slug: cid for cid, slug in rows}


def write_aggregates(
    conn,
    subreddits: list[str],
    posts_scanned: int,
    comments_scanned: int,
    events: list[MentionEvent],
    aggregates: dict[tuple[int, str, str], dict],
    dry_run: bool,
):
    if dry_run:
        return

    run_id = str(uuid.uuid4())
    now = datetime.now(UTC)

    cur = conn.cursor()
    try:
        cur.execute(
            '''
            INSERT INTO "CommunitySignalRun" (
              id, source, status, subreddits, "postsScanned", "commentsScanned", "mentionCount", "startedAt", "completedAt", "createdAt"
            ) VALUES (%s, 'REDDIT'::"CommunitySignalSource", 'COMPLETED', %s, %s, %s, %s, %s, %s, %s)
            ''',
            [run_id, subreddits, posts_scanned, comments_scanned, len(events), now, now, now],
        )

        cur.execute('DELETE FROM "CommunitySignalMention" WHERE source = %s::"CommunitySignalSource"', ["REDDIT"])

        compound_ids = resolve_compound_ids(conn)

        for (window_days, compound_slug, goal_label), row in aggregates.items():
            compound_id = compound_ids.get(compound_slug)
            if not compound_id:
                continue

            cur.execute(
                '''
                INSERT INTO "CommunitySignalMention" (
                  id, source, "windowDays", "goalLabel", "mentionCount", "uniqueThreads", "uniqueAuthors",
                  "subredditBreakdown", "firstSeenAt", "lastSeenAt", "compoundId", "runId", "createdAt", "updatedAt"
                ) VALUES (
                  %s, 'REDDIT'::"CommunitySignalSource", %s, %s::"CommunityGoalLabel", %s, %s, %s,
                  %s::jsonb, %s, %s, %s, %s, %s, %s
                )
                ''',
                [
                    str(uuid.uuid4()),
                    window_days,
                    goal_label,
                    row["mention_count"],
                    len(row["thread_ids"]),
                    len(row["authors"]),
                    json.dumps(dict(row["subreddit_counts"])),
                    row["first_seen"],
                    row["last_seen"],
                    compound_id,
                    run_id,
                    now,
                    now,
                ],
            )

        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()


@app.command("run")
def run(
    subreddits: str = typer.Option(
        ",".join(DEFAULT_SUBREDDITS),
        help="Comma-separated subreddit list",
    ),
    max_posts: int = typer.Option(80, help="Max posts fetched per subreddit"),
    include_comments: bool = typer.Option(True, help="Parse comments for mentions"),
    max_comments: int = typer.Option(120, help="Max comments parsed per thread"),
    sort: str = typer.Option("new", help="Listing sort: new|hot|top"),
    t_window: str = typer.Option("month", help="When sort=top, Reddit time window"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Compute aggregates without DB writes"),
):
    subreddit_list = [s.strip() for s in subreddits.split(",") if s.strip()]
    if not subreddit_list:
        subreddit_list = list(DEFAULT_SUBREDDITS)

    compound_patterns = load_compound_alias_patterns()
    console.print(f"[bold]Reddit Community Signal Ingestion[/bold] | Subreddits: {', '.join(subreddit_list)}")

    events, posts_scanned, comments_scanned = collect_events(
        subreddits=subreddit_list,
        max_posts=max_posts,
        include_comments=include_comments,
        max_comments=max_comments,
        sort=sort,
        t_window=t_window,
        compound_patterns=compound_patterns,
    )
    aggregates = aggregate_events(events)

    table = Table(title="Community Signal Summary")
    table.add_column("Window", justify="right")
    table.add_column("Rows", justify="right")
    table.add_column("Mentions", justify="right")

    for window_days in WINDOWS_DAYS:
        window_rows = [v for (w, _, _), v in aggregates.items() if w == window_days]
        table.add_row(
            f"{window_days}d",
            str(len(window_rows)),
            str(sum(v["mention_count"] for v in window_rows)),
        )

    console.print(table)
    console.print(
        f"Scanned posts={posts_scanned}, comments={comments_scanned}, mention-events={len(events)}"
    )

    if dry_run:
        console.print("[yellow]Dry run complete — no database writes.[/yellow]")
        return

    conn = get_db_connection()
    try:
        write_aggregates(
            conn=conn,
            subreddits=subreddit_list,
            posts_scanned=posts_scanned,
            comments_scanned=comments_scanned,
            events=events,
            aggregates=aggregates,
            dry_run=dry_run,
        )
    finally:
        conn.close()

    console.print("[green]Saved Reddit community signal aggregates.[/green]")


if __name__ == "__main__":
    app()
