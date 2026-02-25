from datetime import datetime, timedelta
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.scorer import StudyInput, compute_evidence_score, compute_stale_status


def test_recency_penalized_by_stale_sources():
    studies = [
        StudyInput("RCT", 120, datetime.now().year, "INCREASE", True, ["A"]),
        StudyInput("RCT", 90, datetime.now().year - 1, "INCREASE", True, ["B"]),
        StudyInput("COHORT", 220, datetime.now().year - 2, "INCREASE", True, ["C"]),
    ]

    fresh = compute_evidence_score(
        studies,
        source_freshness={"pubmed": 100, "semantic_scholar": 100, "openalex": 100},
    )
    stale = compute_evidence_score(
        studies,
        source_freshness={"pubmed": 20, "semantic_scholar": 20, "openalex": 20},
    )

    assert fresh["factors"]["recency"] > stale["factors"]["recency"]
    assert fresh["composite"] > stale["composite"]


def test_stale_status_thresholds():
    now = datetime.utcnow()
    assert compute_stale_status(None, stale_after_days=45, now=now) is True
    assert compute_stale_status(now - timedelta(days=46), stale_after_days=45, now=now) is True
    assert compute_stale_status(now - timedelta(days=44), stale_after_days=45, now=now) is False
    assert compute_stale_status(now - timedelta(days=400), stale_after_days=0, now=now) is False
