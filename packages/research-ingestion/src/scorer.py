"""
Evidence Scoring Algorithm for CompoundAtlas.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class StudyInput:
    study_type: str
    sample_size: Optional[int]
    year: Optional[int]
    effect_direction: Optional[str]
    statistically_significant: Optional[bool]
    authors_institutions: list[str]


STUDY_TYPE_WEIGHTS = {
    "META_ANALYSIS": 5.0,
    "SYSTEMATIC_REVIEW": 4.5,
    "RCT": 4.0,
    "CONTROLLED_TRIAL": 3.5,
    "COHORT": 3.0,
    "CASE_CONTROL": 2.5,
    "CROSS_SECTIONAL": 2.0,
    "CASE_REPORT": 1.0,
    "REVIEW": 2.5,
    "ANIMAL": 1.0,
    "IN_VITRO": 0.5,
    "OTHER": 2.0,
}

FACTOR_WEIGHTS = {
    "study_count": 0.36,
    "study_quality": 0.30,
    "sample_size": 0.10,
    "consistency": 0.10,
    "replication": 0.05,
    "recency": 0.09,
}


def compute_evidence_score(
    studies: list[StudyInput],
    source_freshness: Optional[dict[str, float]] = None,
) -> dict:
    if not studies:
        return {
            "composite": 0.0,
            "factors": {k: 0.0 for k in FACTOR_WEIGHTS},
            "evidence_level": "D",
            "study_count": 0,
            "meta_analysis_count": 0,
        }

    factors = {
        "study_count": _score_study_count(studies),
        "study_quality": _score_study_quality(studies),
        "sample_size": _score_sample_size(studies),
        "consistency": _score_consistency(studies),
        "replication": _score_replication(studies),
        "recency": _score_recency(studies, source_freshness),
    }

    composite = sum(factors[k] * FACTOR_WEIGHTS[k] for k in FACTOR_WEIGHTS)
    meta_count = sum(1 for s in studies if s.study_type == "META_ANALYSIS")

    return {
        "composite": round(composite, 1),
        "factors": {k: round(v, 1) for k, v in factors.items()},
        "evidence_level": _determine_level(composite, studies),
        "study_count": len(studies),
        "meta_analysis_count": meta_count,
    }


def compute_stale_status(
    last_literature_sync: Optional[datetime],
    stale_after_days: int,
    now: Optional[datetime] = None,
) -> bool:
    if stale_after_days <= 0:
        return False
    if last_literature_sync is None:
        return True
    now = now or datetime.utcnow()
    age_days = (now - last_literature_sync).days
    return age_days >= stale_after_days


def _score_study_count(studies: list[StudyInput]) -> float:
    n = len(studies)
    if n == 0:
        return 0.0
    import math
    score = 25 * math.log(n + 1)
    return min(score, 100.0)


def _score_study_quality(studies: list[StudyInput]) -> float:
    if not studies:
        return 0.0

    weighted_sum = sum(STUDY_TYPE_WEIGHTS.get(s.study_type, 2.0) for s in studies)
    avg_quality = weighted_sum / len(studies)
    normalized = (avg_quality / 5.0) * 100.0

    meta_count = sum(1 for s in studies if s.study_type == "META_ANALYSIS")
    meta_bonus = min(15.0, meta_count * 3.0)

    return min(normalized + meta_bonus, 100.0)


def _score_sample_size(studies: list[StudyInput]) -> float:
    total = sum(s.sample_size for s in studies if s.sample_size)
    if total == 0:
        return 45.0

    import math
    score = 10 * math.log10(total + 1) * 2
    return min(score, 100.0)


def _score_consistency(studies: list[StudyInput]) -> float:
    directions = [s.effect_direction for s in studies if s.effect_direction and s.effect_direction != "MIXED"]
    if not directions:
        return 55.0

    from collections import Counter
    counts = Counter(directions)
    most_common_count = counts.most_common(1)[0][1]
    consistency_ratio = most_common_count / len(directions)

    sig_studies = [s for s in studies if s.statistically_significant is True]
    sig_ratio = len(sig_studies) / len(studies) if studies else 0

    score = (consistency_ratio * 70) + (sig_ratio * 30)
    return min(score, 100.0)


def _score_replication(studies: list[StudyInput]) -> float:
    all_institutions = set()
    for study in studies:
        for inst in study.authors_institutions:
            all_institutions.add(inst.lower().strip())

    n_groups = len(all_institutions)
    if n_groups == 0:
        return 40.0

    import math
    score = 20 * math.log(n_groups + 1) + 20
    return min(score, 100.0)


def _score_recency(
    studies: list[StudyInput],
    source_freshness: Optional[dict[str, float]] = None,
) -> float:
    current_year = datetime.now().year
    years = [s.year for s in studies if s.year]

    if not years:
        publication_recency = 45.0
    else:
        recent_count = sum(1 for y in years if current_year - y <= 5)
        very_recent = sum(1 for y in years if current_year - y <= 2)
        medium_recent = sum(1 for y in years if current_year - y <= 8)

        recent_ratio = recent_count / len(years)
        very_recent_ratio = very_recent / len(years)
        medium_recent_ratio = medium_recent / len(years)
        publication_recency = (very_recent_ratio * 45) + (recent_ratio * 35) + (medium_recent_ratio * 20)

    if not source_freshness:
        return min(publication_recency, 100.0)

    source_vals = [max(0.0, min(100.0, float(v))) for v in source_freshness.values()]
    source_score = sum(source_vals) / len(source_vals) if source_vals else 55.0

    blended = (publication_recency * 0.7) + (source_score * 0.3)
    return min(blended, 100.0)


def _determine_level(composite: float, studies: list[StudyInput]) -> str:
    has_meta = any(s.study_type == "META_ANALYSIS" for s in studies)
    has_rct = any(s.study_type == "RCT" for s in studies)
    rct_count = sum(1 for s in studies if s.study_type == "RCT")

    if composite >= 75 and has_meta and rct_count >= 3:
        return "A"
    elif composite >= 50 and (has_rct or has_meta):
        return "B"
    elif composite >= 25:
        return "C"
    else:
        return "D"
