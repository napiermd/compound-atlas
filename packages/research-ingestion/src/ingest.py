"""
CompoundAtlas Research Ingestion Pipeline

Main orchestrator that:
1. Reads compound definitions from YAML seed files
2. Searches PubMed and Semantic Scholar for studies
3. Deduplicates by DOI/PMID
4. Classifies study types
5. Computes evidence scores
6. Writes results to PostgreSQL

Usage:
    python -m src.ingest --full                    # Full re-ingestion
    python -m src.ingest --incremental --since 7d  # Last 7 days
    python -m src.ingest --compound creatine        # Single compound
    python -m src.ingest --compound creatine --dry-run
"""

import os
import sys
import uuid
import time
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional
import re

import yaml
import psycopg2
import psycopg2.extras
import typer
from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table

from .pubmed import PubMedClient, classify_study_type
from .semantic_scholar import SemanticScholarClient
from .scorer import compute_evidence_score, StudyInput
from .clinical_trials import ClinicalTrialsClient, phase_rank

load_dotenv()
console = Console()
app = typer.Typer()

COMPOUND_DATA_DIR = Path(__file__).parent.parent.parent / "compound-data" / "compounds"

# Map study type to per-study evidence level
STUDY_TYPE_TO_EVIDENCE_LEVEL = {
    "META_ANALYSIS": "A",
    "SYSTEMATIC_REVIEW": "A",
    "RCT": "B",
    "CONTROLLED_TRIAL": "B",
    "COHORT": "C",
    "CASE_CONTROL": "C",
    "CROSS_SECTIONAL": "C",
    "CASE_REPORT": "D",
    "REVIEW": "C",
    "ANIMAL": "D",
    "IN_VITRO": "D",
    "OTHER": "D",
}


def get_stale_threshold_days() -> int:
    raw = os.environ.get("COMPOUND_STALE_DAYS", "180")
    try:
        days = int(raw)
        return days if days > 0 else 180
    except Exception:
        return 180


def normalize_doi(doi: Optional[str]) -> Optional[str]:
    if not doi:
        return None
    normalized = doi.strip().lower()
    normalized = re.sub(r"^https?://(dx\.)?doi\.org/", "", normalized)
    return normalized or None


def normalize_title(title: Optional[str]) -> str:
    if not title:
        return ""
    value = re.sub(r"\s+", " ", title.strip().lower())
    value = re.sub(r"[^a-z0-9 ]", "", value)
    return value


def make_study_dedup_key(study: dict) -> str:
    doi = normalize_doi(study.get("doi"))
    if doi:
        return f"doi:{doi}"

    pmid = (study.get("pmid") or "").strip()
    if pmid:
        return f"pmid:{pmid}"

    s2_id = (study.get("s2_id") or "").strip()
    if s2_id:
        return f"s2:{s2_id}"

    title = normalize_title(study.get("title"))
    year = str(study.get("year") or "")
    if title:
        return f"title:{title}|year:{year}"

    return f"fallback:{uuid.uuid4()}"


def get_db_connection():
    """Connect to PostgreSQL using DATABASE_URL from environment."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL not set in environment")
    return psycopg2.connect(db_url)


def load_compound_configs() -> list[dict]:
    """Load all compound YAML files from seed data directory."""
    configs = []
    if not COMPOUND_DATA_DIR.exists():
        console.print(f"[red]Compound data directory not found: {COMPOUND_DATA_DIR}")
        return configs

    for yaml_file in sorted(COMPOUND_DATA_DIR.glob("*.yaml")):
        with open(yaml_file) as f:
            config = yaml.safe_load(f)
            config["_source_file"] = yaml_file.name
            configs.append(config)

    return configs


def upsert_studies(
    compound_db_id: str,
    studies: list[dict],
    dry_run: bool,
    conn,
) -> dict:
    """
    Upsert Study records and create CompoundStudy join rows.
    Returns counts of studies inserted, updated, and linked.
    """
    inserted = 0
    updated = 0
    linked = 0

    for study in studies:
        pmid = study.get("pmid")
        doi = normalize_doi(study.get("doi"))
        s2_id = study.get("s2_id")
        study_type = study.get("study_type", "OTHER")
        evidence_level = STUDY_TYPE_TO_EVIDENCE_LEVEL.get(study_type, "D")
        title = (study.get("title") or "")[:1000]
        abstract = study.get("abstract") or ""
        authors = study.get("authors") or []
        journal = study.get("journal") or None
        year = study.get("year")
        is_open_access = bool(study.get("is_open_access", False))
        full_text_url = study.get("open_access_url") or None
        tldr = study.get("tldr") or None

        if dry_run:
            key = pmid or doi or s2_id or title[:50]
            console.print(f"    [dim][DRY RUN] Would upsert study: {key}[/dim]")
            continue

        cur = conn.cursor()
        try:
            # Find existing by any unique identifier
            normalized_title = normalize_title(title)
            cur.execute(
                """
                SELECT id FROM "Study"
                WHERE (pmid IS NOT NULL AND pmid = %s)
                   OR (doi IS NOT NULL AND lower(doi) = %s)
                   OR ("semanticScholarId" IS NOT NULL AND "semanticScholarId" = %s)
                   OR (
                     year IS NOT NULL AND year = %s
                     AND lower(regexp_replace(title, '[^a-zA-Z0-9 ]', '', 'g')) = %s
                   )
                LIMIT 1
                """,
                [pmid, doi, s2_id, year, normalized_title],
            )
            existing = cur.fetchone()
            now = datetime.utcnow()

            if existing:
                study_id = existing[0]
                cur.execute(
                    """
                    UPDATE "Study" SET
                        pmid                = COALESCE(pmid, %s),
                        doi                 = COALESCE(doi, %s),
                        "semanticScholarId" = COALESCE("semanticScholarId", %s),
                        title               = %s,
                        abstract            = %s,
                        authors             = %s,
                        journal             = COALESCE(%s::text, journal),
                        year                = COALESCE(%s::int, year),
                        "studyType"         = %s::"StudyType",
                        "evidenceLevel"     = %s::"EvidenceLevel",
                        "isOpenAccess"      = %s,
                        "fullTextUrl"       = COALESCE(%s::text, "fullTextUrl"),
                        tldr                = COALESCE(%s::text, tldr),
                        "updatedAt"         = %s
                    WHERE id = %s
                    """,
                    [
                        pmid, doi, s2_id,
                        title, abstract, authors,
                        journal, year,
                        study_type, evidence_level,
                        is_open_access, full_text_url, tldr,
                        now, study_id,
                    ],
                )
                updated += 1
            else:
                study_id = str(uuid.uuid4())
                cur.execute(
                    """
                    INSERT INTO "Study" (
                        id, pmid, doi, "semanticScholarId",
                        title, abstract, authors,
                        journal, year,
                        "studyType", "evidenceLevel",
                        "isOpenAccess", "fullTextUrl", tldr,
                        "createdAt", "updatedAt"
                    ) VALUES (
                        %s, %s, %s, %s,
                        %s, %s, %s,
                        %s, %s,
                        %s::"StudyType", %s::"EvidenceLevel",
                        %s, %s, %s,
                        %s, %s
                    )
                    """,
                    [
                        study_id, pmid, doi, s2_id,
                        title, abstract, authors,
                        journal, year,
                        study_type, evidence_level,
                        is_open_access, full_text_url, tldr,
                        now, now,
                    ],
                )
                inserted += 1

            # Link study to compound (ignore if already linked)
            cur.execute(
                """
                INSERT INTO "CompoundStudy" (id, "compoundId", "studyId")
                VALUES (%s, %s, %s)
                ON CONFLICT ("compoundId", "studyId") DO NOTHING
                """,
                [str(uuid.uuid4()), compound_db_id, study_id],
            )
            if cur.rowcount > 0:
                linked += 1

            conn.commit()
        except Exception as e:
            conn.rollback()
            key = pmid or doi or s2_id or title[:40]
            console.print(f"    [red]Error upserting study '{key}': {e}[/red]")
        finally:
            cur.close()

    return {"inserted": inserted, "updated": updated, "linked": linked}


def update_compound_scores(
    slug: str,
    score_result: dict,
    dry_run: bool,
    conn,
) -> Optional[str]:
    """
    Update compound evidence scores and sync timestamp.
    Returns the compound's database ID, or None if not found.
    """
    evidence_score = score_result["composite"]
    study_count = score_result["study_count"]
    meta_count = score_result["meta_analysis_count"]

    # Always need the compound ID (even in dry run, for study linking)
    cur = conn.cursor()
    cur.execute('SELECT id FROM "Compound" WHERE slug = %s', [slug])
    row = cur.fetchone()
    cur.close()

    if not row:
        return None

    compound_id = row[0]

    if dry_run:
        console.print(
            f"  [dim][DRY RUN] Would update '{slug}': "
            f"score={evidence_score}, studies={study_count}, metas={meta_count}[/dim]"
        )
        return compound_id

    cur = conn.cursor()
    try:
        import json as _json
        score_breakdown_json = _json.dumps(score_result.get("factors", {}))
        cur.execute(
            """
            UPDATE "Compound"
            SET "evidenceScore"     = %s,
                "studyCount"        = %s,
                "metaAnalysisCount" = %s,
                "scoreBreakdown"    = %s::jsonb,
                "lastResearchSync"  = %s,
                "lastReviewedAt"    = %s,
                "updatedAt"         = %s
            WHERE id = %s
            """,
            [
                evidence_score,
                study_count,
                meta_count,
                score_breakdown_json,
                datetime.utcnow(),
                datetime.utcnow(),
                datetime.utcnow(),
                compound_id,
            ],
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        console.print(f"  [red]Error updating compound scores for '{slug}': {e}[/red]")
        return None
    finally:
        cur.close()

    return compound_id


def ingest_compound(
    compound: dict,
    pubmed: PubMedClient,
    s2: SemanticScholarClient,
    since_days: Optional[int] = None,
    dry_run: bool = False,
) -> dict:
    """
    Run the full ingestion pipeline for a single compound.
    Opens a fresh DB connection for the write phase and closes it when done.
    Returns a summary dict with counts and scores.
    """
    name = compound["name"]
    slug = compound["slug"]
    search_terms = compound.get("searchTerms", {})

    console.print(f"\n[bold blue]▶ Ingesting: {name}[/bold blue]")

    all_studies = []
    seen_ids: set[str] = set()

    # ─── PubMed Search ───────────────────────────────
    specific_queries = search_terms.get("pubmed", [])
    # Always include a broad name-only query to catch studies that don't match
    # narrow MeSH terms — deduplication by DOI/PMID prevents double-counting
    broad_query = f"{name}"
    pubmed_queries = specific_queries + [broad_query] if specific_queries else [f"{name} AND human", broad_query]
    min_date = None
    if since_days:
        min_date = (datetime.now() - timedelta(days=since_days)).strftime("%Y/%m/%d")

    for query in pubmed_queries:
        console.print(f"  [dim]PubMed: {query}[/dim]")
        try:
            articles = pubmed.search_and_fetch(query, max_results=100, min_date=min_date)
            for article in articles:
                candidate = {
                    "source": "pubmed",
                    "pmid": article.pmid,
                    "doi": article.doi,
                    "title": article.title,
                    "abstract": article.abstract,
                    "authors": article.authors,
                    "journal": article.journal,
                    "year": article.year,
                    "study_type": classify_study_type(article),
                }
                dedup_key = make_study_dedup_key(candidate)
                if dedup_key not in seen_ids:
                    seen_ids.add(dedup_key)
                    all_studies.append(candidate)
        except Exception as e:
            console.print(f"  [red]PubMed error: {e}[/red]")

    # ─── Semantic Scholar Search ─────────────────────
    s2_queries = search_terms.get("semanticScholar", [f"{name} supplementation effects"])

    for query in s2_queries:
        console.print(f"  [dim]S2: {query}[/dim]")
        try:
            year_range = None
            if since_days and since_days <= 365:
                year_range = f"{datetime.now().year - 1}-{datetime.now().year}"

            # Retry once on 429 rate-limit with 3s back-off
            for attempt in range(2):
                try:
                    papers = s2.search(query, limit=100, year_range=year_range)
                    break
                except Exception as e:
                    if attempt == 0 and "429" in str(e):
                        console.print(f"  [yellow]S2 rate-limited, retrying in 3s…[/yellow]")
                        time.sleep(3)
                    else:
                        raise

            for paper in papers:
                candidate = {
                    "source": "semantic_scholar",
                    "s2_id": paper.paper_id,
                    "doi": paper.doi,
                    "pmid": paper.external_ids.get("PubMed"),
                    "title": paper.title,
                    "abstract": paper.abstract,
                    "authors": paper.authors,
                    "journal": paper.venue,
                    "year": paper.year,
                    "is_open_access": paper.is_open_access,
                    "open_access_url": paper.open_access_url,
                    "tldr": paper.tldr,
                    "study_type": "OTHER",
                }
                dedup_key = make_study_dedup_key(candidate)
                if dedup_key not in seen_ids:
                    seen_ids.add(dedup_key)
                    all_studies.append(candidate)
        except Exception as e:
            console.print(f"  [red]S2 error: {e}[/red]")

    # ─── Compute Evidence Score ──────────────────────
    study_inputs = [
        StudyInput(
            study_type=s.get("study_type", "OTHER"),
            sample_size=s.get("sample_size"),
            year=s.get("year"),
            effect_direction=None,
            statistically_significant=None,
            authors_institutions=[],
        )
        for s in all_studies
    ]
    score_result = compute_evidence_score(study_inputs)

    console.print(
        f"  [green]✓ {score_result['study_count']} studies | "
        f"Score: {score_result['composite']}/100 | "
        f"Level: {score_result['evidence_level']}[/green]"
    )

    # ─── Write to DB ─────────────────────────────────
    db_result = {"inserted": 0, "updated": 0, "linked": 0}
    conn = None
    try:
        conn = get_db_connection()
        compound_db_id = update_compound_scores(slug, score_result, dry_run, conn)
        if compound_db_id:
            db_result = upsert_studies(compound_db_id, all_studies, dry_run, conn)
        else:
            console.print(
                f"  [yellow]Warning: '{slug}' not found in DB — "
                "run prisma db seed first[/yellow]"
            )
    except Exception as e:
        console.print(f"  [red]DB error for '{slug}': {e}[/red]")
    finally:
        if conn:
            conn.close()

    return {
        "slug": slug,
        "name": name,
        "total_studies": score_result["study_count"],
        "pubmed_studies": sum(1 for s in all_studies if s["source"] == "pubmed"),
        "s2_studies": sum(1 for s in all_studies if s["source"] == "semantic_scholar"),
        "evidence_score": score_result["composite"],
        "evidence_level": score_result["evidence_level"],
        "meta_analyses": score_result["meta_analysis_count"],
        "db_inserted": db_result["inserted"],
        "db_updated": db_result["updated"],
        "db_linked": db_result["linked"],
        "error": None,
    }


@app.command()
def main(
    full: bool = typer.Option(False, help="Full re-ingestion of all compounds"),
    incremental: bool = typer.Option(False, help="Only fetch studies since --since"),
    since: str = typer.Option("7d", help="Time window for incremental (7d, 2w, 1m)"),
    compound: Optional[str] = typer.Option(None, help="Single compound slug to process"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Show what would be written without writing"),
    delay: float = typer.Option(2.0, "--delay", help="Seconds to sleep between compounds"),
):
    """CompoundAtlas research ingestion pipeline."""
    console.print("[bold]CompoundAtlas Research Ingestion Pipeline[/bold]")
    if dry_run:
        console.print("[yellow bold]DRY RUN — no changes will be written to the database[/yellow bold]")
    console.print()

    # Parse since duration
    since_days = None
    if incremental and since:
        if since.endswith("d"):
            since_days = int(since[:-1])
        elif since.endswith("w"):
            since_days = int(since[:-1]) * 7
        elif since.endswith("m"):
            since_days = int(since[:-1]) * 30

    # Load compound configs
    compounds = load_compound_configs()
    if not compounds:
        console.print("[red]No compound configs found in packages/compound-data/compounds/[/red]")
        raise typer.Exit(1)

    if compound:
        compounds = [c for c in compounds if c["slug"] == compound]
        if not compounds:
            console.print(f"[red]Compound '{compound}' not found in seed data[/red]")
            raise typer.Exit(1)

    console.print(f"Processing [bold]{len(compounds)}[/bold] compound(s)")
    if since_days:
        console.print(f"Searching last {since_days} days")

    # Verify DB is reachable before starting (fail fast)
    try:
        _test = get_db_connection()
        _test.close()
        console.print("[green]✓ PostgreSQL reachable[/green]")
    except Exception as e:
        console.print(f"[red]DB connection failed: {e}[/red]")
        if not dry_run:
            raise typer.Exit(1)
        console.print("[yellow]Continuing dry run without DB access[/yellow]")

    # Initialize API clients
    pubmed = PubMedClient()
    s2 = SemanticScholarClient()

    summaries = []
    try:
        for i, comp in enumerate(compounds):
            try:
                # Each compound gets its own fresh connection during the write phase
                summary = ingest_compound(comp, pubmed, s2, since_days, dry_run)
                summaries.append(summary)
            except Exception as e:
                console.print(f"\n[red]✗ Failed: {comp['slug']} — {e}[/red]")
                summaries.append({
                    "slug": comp["slug"],
                    "name": comp["name"],
                    "total_studies": 0,
                    "pubmed_studies": 0,
                    "s2_studies": 0,
                    "evidence_score": 0.0,
                    "evidence_level": "D",
                    "meta_analyses": 0,
                    "db_inserted": 0,
                    "db_updated": 0,
                    "db_linked": 0,
                    "error": str(e),
                })
            if delay > 0 and i < len(compounds) - 1:
                time.sleep(delay)
    finally:
        pubmed.close()
        s2.close()

    # ─── Summary Table ────────────────────────────────
    console.print("\n")
    title = "Ingestion Summary" + (" (DRY RUN)" if dry_run else "")
    table = Table(title=title)
    table.add_column("Compound", style="bold")
    table.add_column("Studies", justify="right")
    table.add_column("PubMed", justify="right")
    table.add_column("S2", justify="right")
    table.add_column("Score", justify="right")
    table.add_column("Level", justify="center")
    table.add_column("New", justify="right")
    table.add_column("Updated", justify="right")
    table.add_column("Status", justify="center")

    for s in summaries:
        score_style = (
            "green" if s["evidence_score"] >= 70
            else "yellow" if s["evidence_score"] >= 40
            else "red"
        )
        if s.get("error"):
            status = "[red]FAILED[/red]"
        elif dry_run:
            status = "[yellow]DRY RUN[/yellow]"
        else:
            status = "[green]OK[/green]"

        table.add_row(
            s["name"],
            str(s["total_studies"]),
            str(s["pubmed_studies"]),
            str(s["s2_studies"]),
            f"[{score_style}]{s['evidence_score']}[/{score_style}]",
            s["evidence_level"],
            str(s["db_inserted"]),
            str(s["db_updated"]),
            status,
        )

    console.print(table)


@app.command("update-phases")
def update_phases(
    compound: Optional[str] = typer.Option(None, help="Single compound slug to process"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Show what would be updated without writing"),
    delay: float = typer.Option(0.5, "--delay", help="Seconds to sleep between compounds"),
):
    """Update clinical trial phases from ClinicalTrials.gov."""
    console.print("[bold]ClinicalTrials.gov Phase Updater[/bold]")
    if dry_run:
        console.print("[yellow bold]DRY RUN — no changes will be written[/yellow bold]")
    console.print()

    compounds = load_compound_configs()
    if not compounds:
        console.print("[red]No compound configs found[/red]")
        raise typer.Exit(1)

    if compound:
        compounds = [c for c in compounds if c["slug"] == compound]
        if not compounds:
            console.print(f"[red]Compound '{compound}' not found in seed data[/red]")
            raise typer.Exit(1)

    console.print(f"Checking [bold]{len(compounds)}[/bold] compound(s)")

    # Verify DB is reachable
    conn = None
    try:
        conn = get_db_connection()
        console.print("[green]PostgreSQL reachable[/green]")
    except Exception as e:
        console.print(f"[red]DB connection failed: {e}[/red]")
        if not dry_run:
            raise typer.Exit(1)
        console.print("[yellow]Continuing dry run without DB access[/yellow]")

    ct_client = ClinicalTrialsClient()
    results = []

    try:
        for i, comp in enumerate(compounds):
            slug = comp["slug"]
            name = comp["name"]
            search_names = [name] + comp.get("aliases", [])

            # Get current phase from DB
            current_phase = None
            if conn:
                cur = conn.cursor()
                cur.execute('SELECT "clinicalPhase" FROM "Compound" WHERE slug = %s', [slug])
                row = cur.fetchone()
                cur.close()
                if row:
                    current_phase = row[0]

            console.print(f"\n[bold blue]{name}[/bold blue] (current: {current_phase or 'None'})")

            # Search ClinicalTrials.gov with compound name and aliases
            best_phase = None
            best_trial_title = None
            for search_name in search_names:
                try:
                    trials = ct_client.search(search_name)
                    for trial in trials:
                        if trial.highest_phase and (
                            best_phase is None
                            or phase_rank(trial.highest_phase) > phase_rank(best_phase)
                        ):
                            best_phase = trial.highest_phase
                            best_trial_title = trial.title
                except Exception as e:
                    console.print(f"  [red]Error searching '{search_name}': {e}[/red]")

            if best_phase:
                console.print(f"  Found: {best_phase} — {best_trial_title}")
            else:
                console.print("  [dim]No active trials found[/dim]")

            # Only upgrade phases, never downgrade
            should_update = False
            if best_phase and (
                current_phase is None
                or phase_rank(best_phase) > phase_rank(current_phase)
            ):
                should_update = True

            action = "no change"
            if should_update:
                if dry_run:
                    action = f"would update {current_phase} -> {best_phase}"
                    console.print(f"  [yellow][DRY RUN] {action}[/yellow]")
                elif conn:
                    cur = conn.cursor()
                    try:
                        cur.execute(
                            '''UPDATE "Compound" SET "clinicalPhase" = %s, "updatedAt" = %s WHERE slug = %s''',
                            [best_phase, datetime.utcnow(), slug],
                        )
                        conn.commit()
                        action = f"updated {current_phase} -> {best_phase}"
                        console.print(f"  [green]{action}[/green]")
                    except Exception as e:
                        conn.rollback()
                        action = f"error: {e}"
                        console.print(f"  [red]{action}[/red]")
                    finally:
                        cur.close()

            results.append({
                "name": name,
                "current": current_phase or "None",
                "found": best_phase or "None",
                "action": action,
            })

            if delay > 0 and i < len(compounds) - 1:
                time.sleep(delay)
    finally:
        ct_client.close()
        if conn:
            conn.close()

    # Summary table
    console.print("\n")
    title = "Phase Update Summary" + (" (DRY RUN)" if dry_run else "")
    table = Table(title=title)
    table.add_column("Compound", style="bold")
    table.add_column("Current Phase")
    table.add_column("CT.gov Phase")
    table.add_column("Action")

    for r in results:
        action_style = (
            "green" if "updated" in r["action"]
            else "yellow" if "would" in r["action"]
            else "dim"
        )
        table.add_row(
            r["name"],
            r["current"],
            r["found"],
            f"[{action_style}]{r['action']}[/{action_style}]",
        )

    console.print(table)


@app.command("stale-report")
def stale_report(
    threshold_days: int = typer.Option(get_stale_threshold_days(), "--threshold-days", help="Days since last sync to classify stale"),
    limit: int = typer.Option(100, "--limit", help="Max compounds to display"),
):
    """List compounds with stale or missing research sync timestamps."""
    console.print("[bold]Compound Freshness Report[/bold]")
    cutoff = datetime.utcnow() - timedelta(days=threshold_days)

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cur.execute(
            '''
            SELECT slug, name, "lastResearchSync", "lastReviewedAt", "studyCount", "evidenceScore"
            FROM "Compound"
            WHERE "lastResearchSync" IS NULL OR "lastResearchSync" < %s
            ORDER BY "lastResearchSync" ASC NULLS FIRST
            LIMIT %s
            ''',
            [cutoff, limit],
        )
        rows = cur.fetchall()
    finally:
        cur.close()
        conn.close()

    table = Table(title=f"Stale compounds (>{threshold_days}d without sync)")
    table.add_column("Slug")
    table.add_column("Name")
    table.add_column("Last Sync")
    table.add_column("Last Reviewed")
    table.add_column("Studies", justify="right")
    table.add_column("Score", justify="right")

    for r in rows:
        last_sync = r["lastResearchSync"].strftime("%Y-%m-%d") if r["lastResearchSync"] else "never"
        last_reviewed = r["lastReviewedAt"].strftime("%Y-%m-%d") if r["lastReviewedAt"] else "never"
        table.add_row(
            r["slug"],
            r["name"],
            last_sync,
            last_reviewed,
            str(r["studyCount"] or 0),
            str(round(r["evidenceScore"] or 0, 1)),
        )

    console.print(table)


if __name__ == "__main__":
    app()
