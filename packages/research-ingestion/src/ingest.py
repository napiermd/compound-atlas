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
"""

import os
import sys
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional

import yaml
from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn

from .pubmed import PubMedClient, classify_study_type
from .semantic_scholar import SemanticScholarClient
from .scorer import compute_evidence_score, StudyInput

load_dotenv()
console = Console()

COMPOUND_DATA_DIR = Path(__file__).parent.parent.parent / "compound-data" / "compounds"


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


def ingest_compound(
    compound: dict,
    pubmed: PubMedClient,
    s2: SemanticScholarClient,
    since_days: Optional[int] = None,
) -> dict:
    """
    Run ingestion pipeline for a single compound.

    Returns summary dict with counts and scores.
    """
    name = compound["name"]
    slug = compound["slug"]
    search_terms = compound.get("searchTerms", {})

    console.print(f"\n[bold blue]▶ Ingesting: {name}[/bold blue]")

    all_studies = []
    seen_ids = set()  # DOI + PMID dedup

    # ─── PubMed Search ───────────────────────────────
    pubmed_queries = search_terms.get("pubmed", [f"{name} AND human"])
    min_date = None
    if since_days:
        min_date = (datetime.now() - timedelta(days=since_days)).strftime("%Y/%m/%d")

    for query in pubmed_queries:
        console.print(f"  [dim]PubMed: {query}[/dim]")
        try:
            articles = pubmed.search_and_fetch(
                query, max_results=50, min_date=min_date
            )
            for article in articles:
                dedup_key = article.doi or f"pmid:{article.pmid}"
                if dedup_key not in seen_ids:
                    seen_ids.add(dedup_key)
                    study_type = classify_study_type(article)
                    all_studies.append({
                        "source": "pubmed",
                        "pmid": article.pmid,
                        "doi": article.doi,
                        "title": article.title,
                        "abstract": article.abstract,
                        "authors": article.authors,
                        "journal": article.journal,
                        "year": article.year,
                        "study_type": study_type,
                        "publication_types": article.publication_types,
                    })
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

            papers = s2.search(query, limit=50, year_range=year_range)
            for paper in papers:
                dedup_key = paper.doi or f"s2:{paper.paper_id}"
                if dedup_key not in seen_ids:
                    seen_ids.add(dedup_key)
                    all_studies.append({
                        "source": "semantic_scholar",
                        "s2_id": paper.paper_id,
                        "doi": paper.doi,
                        "pmid": paper.external_ids.get("PubMed"),
                        "title": paper.title,
                        "abstract": paper.abstract,
                        "authors": paper.authors,
                        "journal": paper.venue,
                        "year": paper.year,
                        "citation_count": paper.citation_count,
                        "is_open_access": paper.is_open_access,
                        "open_access_url": paper.open_access_url,
                        "tldr": paper.tldr,
                        "study_type": "OTHER",  # Will be classified
                    })
        except Exception as e:
            console.print(f"  [red]S2 error: {e}[/red]")

    # ─── Compute Evidence Score ──────────────────────
    study_inputs = []
    for s in all_studies:
        study_inputs.append(StudyInput(
            study_type=s.get("study_type", "OTHER"),
            sample_size=s.get("sample_size"),
            year=s.get("year"),
            effect_direction=None,  # Would need abstract parsing
            statistically_significant=None,
            authors_institutions=[],  # Would need affiliation data
        ))

    score_result = compute_evidence_score(study_inputs)

    summary = {
        "slug": slug,
        "name": name,
        "total_studies": len(all_studies),
        "pubmed_studies": sum(1 for s in all_studies if s["source"] == "pubmed"),
        "s2_studies": sum(1 for s in all_studies if s["source"] == "semantic_scholar"),
        "evidence_score": score_result["composite"],
        "evidence_level": score_result["evidence_level"],
        "meta_analyses": score_result["meta_analysis_count"],
        "factors": score_result["factors"],
    }

    console.print(
        f"  [green]✓ {summary['total_studies']} studies | "
        f"Score: {summary['evidence_score']}/100 | "
        f"Level: {summary['evidence_level']}[/green]"
    )

    return summary


def main(
    full: bool = False,
    incremental: bool = False,
    since: str = "7d",
    compound: Optional[str] = None,
):
    """Main entry point for the ingestion pipeline."""
    console.print("[bold]CompoundAtlas Research Ingestion Pipeline[/bold]\n")

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
        console.print("[red]No compound configs found. Add YAML files to packages/compound-data/compounds/[/red]")
        sys.exit(1)

    if compound:
        compounds = [c for c in compounds if c["slug"] == compound]
        if not compounds:
            console.print(f"[red]Compound '{compound}' not found in seed data[/red]")
            sys.exit(1)

    console.print(f"Found {len(compounds)} compound(s) to process")
    if since_days:
        console.print(f"Searching for studies from the last {since_days} days")

    # Initialize API clients
    pubmed = PubMedClient()
    s2 = SemanticScholarClient()

    summaries = []
    try:
        for comp in compounds:
            summary = ingest_compound(comp, pubmed, s2, since_days)
            summaries.append(summary)
    finally:
        pubmed.close()
        s2.close()

    # ─── Print Summary Table ─────────────────────────
    console.print("\n")
    table = Table(title="Ingestion Summary")
    table.add_column("Compound", style="bold")
    table.add_column("Studies", justify="right")
    table.add_column("PubMed", justify="right")
    table.add_column("S2", justify="right")
    table.add_column("Score", justify="right")
    table.add_column("Level", justify="center")

    for s in summaries:
        score_style = "green" if s["evidence_score"] >= 70 else "yellow" if s["evidence_score"] >= 40 else "red"
        table.add_row(
            s["name"],
            str(s["total_studies"]),
            str(s["pubmed_studies"]),
            str(s["s2_studies"]),
            f"[{score_style}]{s['evidence_score']}[/{score_style}]",
            s["evidence_level"],
        )

    console.print(table)


if __name__ == "__main__":
    import typer
    app = typer.Typer()

    @app.command()
    def run(
        full: bool = typer.Option(False, help="Full re-ingestion of all compounds"),
        incremental: bool = typer.Option(False, help="Only fetch recent studies"),
        since: str = typer.Option("7d", help="Time window for incremental (7d, 2w, 1m)"),
        compound: Optional[str] = typer.Option(None, help="Single compound slug to process"),
    ):
        main(full=full, incremental=incremental, since=since, compound=compound)

    app()
