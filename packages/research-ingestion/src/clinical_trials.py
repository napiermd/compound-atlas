"""
ClinicalTrials.gov v2 API wrapper for CompoundAtlas research ingestion.

Queries the public ClinicalTrials.gov API to find the highest clinical trial
phase for a given compound. Used to auto-update the clinicalPhase field.

Docs: https://clinicaltrials.gov/data-api/api
Rate limits: 10 requests/second (public, no auth needed)
"""

import time
from dataclasses import dataclass, field
from typing import Optional

import httpx

BASE_URL = "https://clinicaltrials.gov/api/v2/studies"

# Map API phase values to our display labels
PHASE_MAP = {
    "EARLY_PHASE1": "Phase I",
    "PHASE1": "Phase I",
    "PHASE2": "Phase II",
    "PHASE3": "Phase III",
    "PHASE4": "Approved",
    "NA": None,
}

# Hierarchy for comparison (higher index = more advanced)
PHASE_HIERARCHY = [
    "Preclinical",
    "Phase I",
    "Phase II",
    "Phase III",
    "Approved",
]

ACTIVE_STATUSES = {
    "RECRUITING",
    "ACTIVE_NOT_RECRUITING",
    "COMPLETED",
    "ENROLLING_BY_INVITATION",
}


@dataclass
class ClinicalTrial:
    nct_id: str
    title: str
    phases: list[str] = field(default_factory=list)
    highest_phase: Optional[str] = None
    status: str = ""
    url: str = ""


def phase_rank(phase: str) -> int:
    """Return numeric rank for a phase string. Higher = more advanced."""
    try:
        return PHASE_HIERARCHY.index(phase)
    except ValueError:
        return -1


class ClinicalTrialsClient:
    """Thin wrapper around ClinicalTrials.gov v2 API."""

    def __init__(self):
        self.client = httpx.Client(timeout=30.0)
        self._last_request_time = 0.0
        self._min_interval = 0.1  # 10 req/sec

    def _rate_limit(self):
        elapsed = time.time() - self._last_request_time
        if elapsed < self._min_interval:
            time.sleep(self._min_interval - elapsed)
        self._last_request_time = time.time()

    def search(
        self,
        compound_name: str,
        max_results: int = 50,
    ) -> list[ClinicalTrial]:
        """
        Search ClinicalTrials.gov for trials related to a compound.

        Args:
            compound_name: Name of the compound to search for
            max_results: Maximum number of trials to return

        Returns:
            List of ClinicalTrial objects for active/completed trials
        """
        self._rate_limit()

        params = {
            "query.cond": compound_name,
            "pageSize": min(max_results, 100),
            "format": "json",
            "fields": "NCTId,BriefTitle,OverallStatus,Phase",
        }

        response = self.client.get(BASE_URL, params=params)
        response.raise_for_status()

        data = response.json()
        studies = data.get("studies", [])
        trials = []

        for study in studies:
            protocol = study.get("protocolSection", {})
            id_module = protocol.get("identificationModule", {})
            status_module = protocol.get("statusModule", {})
            design_module = protocol.get("designModule", {})

            nct_id = id_module.get("nctId", "")
            title = id_module.get("briefTitle", "")
            status = status_module.get("overallStatus", "")

            # Only include active/completed trials
            if status not in ACTIVE_STATUSES:
                continue

            raw_phases = design_module.get("phases", [])
            mapped_phases = []
            for raw in raw_phases:
                mapped = PHASE_MAP.get(raw)
                if mapped:
                    mapped_phases.append(mapped)

            highest = None
            for phase in mapped_phases:
                if highest is None or phase_rank(phase) > phase_rank(highest):
                    highest = phase

            trials.append(
                ClinicalTrial(
                    nct_id=nct_id,
                    title=title,
                    phases=mapped_phases,
                    highest_phase=highest,
                    status=status,
                    url=f"https://clinicaltrials.gov/study/{nct_id}",
                )
            )

        return trials

    def get_highest_phase(self, compound_name: str) -> Optional[str]:
        """
        Get the highest clinical trial phase for a compound.

        Returns:
            Phase string (e.g., "Phase II") or None if no trials found
        """
        trials = self.search(compound_name)
        if not trials:
            return None

        highest = None
        for trial in trials:
            if trial.highest_phase and (
                highest is None
                or phase_rank(trial.highest_phase) > phase_rank(highest)
            ):
                highest = trial.highest_phase

        return highest

    def close(self):
        self.client.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
