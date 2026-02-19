"""
Evidence Scoring Algorithm for CompoundAtlas.

Computes a composite evidence score (0-100) for each compound based on:
- Number and quality of studies
- Consistency of findings
- Sample sizes
- Replication across labs
- Recency of research

Inspired by GRADE framework and Oxford Centre for Evidence-Based Medicine levels.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class StudyInput:
    """Minimal study data needed for scoring."""
    study_type: str          # META_ANALYSIS, RCT, COHORT, etc.
    sample_size: Optional[int]
    year: Optional[int]
    effect_direction: Optional[str]  # INCREASE, DECREASE, NO_CHANGE, MIXED
    statistically_significant: Optional[bool]
    authors_institutions: list[str]  # For replication check


# ─── WEIGHTS ─────────────────────────────────────────

# Study type quality weights (used in quality sub-score).
# "OTHER" is elevated to 2.0 because Semantic Scholar papers come in unclassified —
# they are mostly valid publications and should not be penalized like in-vitro data.
STUDY_TYPE_WEIGHTS = {
    "META_ANALYSIS": 5.0,
    "SYSTEMATIC_REVIEW": 4.5,
    "RCT": 4.0,
    "CONTROLLED_TRIAL": 3.5,
    "COHORT": 3.0,
    "CASE_CONTROL": 2.5,
    "CROSS_SECTIONAL": 2.0,
    "CASE_REPORT": 1.0,
    "REVIEW": 2.5,    # Narrative reviews are reasonable secondary evidence
    "ANIMAL": 1.0,
    "IN_VITRO": 0.5,
    "OTHER": 2.0,     # Unclassified (mostly S2) — neutral quality, not penalized
}

# Composite score factor weights (must sum to 1.0).
# study_count and study_quality dominate because we don't NLP-extract
# sample_size/consistency/replication from abstracts — defaults are generous.
FACTOR_WEIGHTS = {
    "study_count": 0.40,
    "study_quality": 0.30,
    "sample_size": 0.10,
    "consistency": 0.10,
    "replication": 0.05,
    "recency": 0.05,
}


def compute_evidence_score(studies: list[StudyInput]) -> dict:
    """
    Compute composite evidence score from a list of studies.

    Returns:
        {
            "composite": float (0-100),
            "factors": {
                "study_count": float (0-100),
                "study_quality": float (0-100),
                "sample_size": float (0-100),
                "consistency": float (0-100),
                "replication": float (0-100),
                "recency": float (0-100),
            },
            "evidence_level": str (A/B/C/D),
            "study_count": int,
            "meta_analysis_count": int,
        }
    """
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
        "recency": _score_recency(studies),
    }

    composite = sum(
        factors[k] * FACTOR_WEIGHTS[k] for k in FACTOR_WEIGHTS
    )

    meta_count = sum(1 for s in studies if s.study_type == "META_ANALYSIS")

    return {
        "composite": round(composite, 1),
        "factors": {k: round(v, 1) for k, v in factors.items()},
        "evidence_level": _determine_level(composite, studies),
        "study_count": len(studies),
        "meta_analysis_count": meta_count,
    }


# ─── SUB-SCORES ──────────────────────────────────────

def _score_study_count(studies: list[StudyInput]) -> float:
    """
    More studies = higher score, with diminishing returns.
    0 studies = 0, 5 = ~44, 10 = ~60, 20 = ~75, 50+ = ~98, 100+ = 100
    """
    n = len(studies)
    if n == 0:
        return 0.0
    import math
    score = 25 * math.log(n + 1)
    return min(score, 100.0)


def _score_study_quality(studies: list[StudyInput]) -> float:
    """
    Weighted average of study type quality scores, plus a meta-analysis bonus.
    Higher quality study types contribute more.
    Meta-analyses get an additional bonus (up to +15) because they represent
    the gold standard of evidence synthesis.
    """
    if not studies:
        return 0.0

    total_weight = 0.0
    weighted_sum = 0.0

    for study in studies:
        w = STUDY_TYPE_WEIGHTS.get(study.study_type, 2.0)
        weighted_sum += w
        total_weight += 1.0

    if total_weight == 0:
        return 0.0

    avg_quality = weighted_sum / total_weight  # 0.5 to 5.0
    normalized = (avg_quality / 5.0) * 100.0

    # Bonus for having meta-analyses (+3 per meta, max +15)
    meta_count = sum(1 for s in studies if s.study_type == "META_ANALYSIS")
    meta_bonus = min(15.0, meta_count * 3.0)

    return min(normalized + meta_bonus, 100.0)


def _score_sample_size(studies: list[StudyInput]) -> float:
    """
    Aggregate sample size across all studies.
    Larger total sample = more confidence.
    """
    total = sum(s.sample_size for s in studies if s.sample_size)
    if total == 0:
        return 45.0  # Generous default when sample data isn't extracted from abstracts

    import math
    # 100 participants = ~46, 1000 = ~69, 10000 = ~92
    score = 10 * math.log10(total + 1) * 2
    return min(score, 100.0)


def _score_consistency(studies: list[StudyInput]) -> float:
    """
    What percentage of studies agree on the direction of effect?
    Higher consistency = higher score.
    """
    directions = [
        s.effect_direction
        for s in studies
        if s.effect_direction and s.effect_direction != "MIXED"
    ]
    if not directions:
        return 55.0  # Neutral-optimistic default when direction data isn't available

    from collections import Counter
    counts = Counter(directions)
    if not counts:
        return 55.0

    most_common_count = counts.most_common(1)[0][1]
    consistency_ratio = most_common_count / len(directions)

    # Also factor in significance
    sig_studies = [s for s in studies if s.statistically_significant is True]
    sig_ratio = len(sig_studies) / len(studies) if studies else 0

    # Blend consistency and significance
    score = (consistency_ratio * 70) + (sig_ratio * 30)
    return min(score, 100.0)


def _score_replication(studies: list[StudyInput]) -> float:
    """
    How many independent research groups have studied this?
    More unique institutions = better replication.
    """
    all_institutions = set()
    for study in studies:
        for inst in study.authors_institutions:
            all_institutions.add(inst.lower().strip())

    n_groups = len(all_institutions)
    if n_groups == 0:
        return 40.0  # Default when institution data isn't extracted

    import math
    # 1 group = ~34, 5 = ~53, 10 = ~66, 20+ = ~79+
    score = 20 * math.log(n_groups + 1) + 20
    return min(score, 100.0)


def _score_recency(studies: list[StudyInput]) -> float:
    """
    Bonus for recent research (last 5 years).
    Active research areas score higher.
    """
    current_year = datetime.now().year
    years = [s.year for s in studies if s.year]

    if not years:
        return 45.0

    recent_count = sum(1 for y in years if current_year - y <= 5)
    very_recent = sum(1 for y in years if current_year - y <= 3)  # 3-year window

    recent_ratio = recent_count / len(years)
    very_recent_ratio = very_recent / len(years) if years else 0

    score = (recent_ratio * 50) + (very_recent_ratio * 40) + 10
    return min(score, 100.0)


# ─── EVIDENCE LEVEL ──────────────────────────────────

def _determine_level(
    composite: float, studies: list[StudyInput]
) -> str:
    """
    Assign A/B/C/D evidence level based on composite score
    and study type distribution.
    """
    has_meta = any(s.study_type == "META_ANALYSIS" for s in studies)
    has_rct = any(s.study_type == "RCT" for s in studies)
    rct_count = sum(1 for s in studies if s.study_type == "RCT")

    if composite >= 75 and has_meta and rct_count >= 3:
        return "A"  # Strong evidence
    elif composite >= 50 and (has_rct or has_meta):
        return "B"  # Moderate evidence
    elif composite >= 25:
        return "C"  # Weak evidence
    else:
        return "D"  # Very weak / preliminary
