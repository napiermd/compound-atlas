"""
Semantic Scholar API wrapper for CompoundAtlas research ingestion.

Docs: https://api.semanticscholar.org/api-docs/
Rate limits:
  - Unauthenticated: 1000 req/sec (shared pool)
  - Authenticated: 1 RPS per key (dedicated)
  - Free API key: https://www.semanticscholar.org/product/api
"""

import os
import time
from dataclasses import dataclass, field
from typing import Optional

import httpx

S2_BASE = "https://api.semanticscholar.org/graph/v1"
API_KEY = os.getenv("SEMANTIC_SCHOLAR_API_KEY", "")


@dataclass
class S2Paper:
    paper_id: str
    title: str
    abstract: str = ""
    authors: list[str] = field(default_factory=list)
    year: Optional[int] = None
    venue: str = ""
    doi: Optional[str] = None
    external_ids: dict = field(default_factory=dict)  # includes PMID if available
    citation_count: int = 0
    reference_count: int = 0
    is_open_access: bool = False
    open_access_url: Optional[str] = None
    tldr: Optional[str] = None
    fields_of_study: list[str] = field(default_factory=list)


class SemanticScholarClient:
    """Wrapper for the Semantic Scholar Academic Graph API."""

    PAPER_FIELDS = (
        "paperId,title,abstract,authors,year,venue,externalIds,"
        "citationCount,referenceCount,isOpenAccess,openAccessPdf,"
        "tldr,s2FieldsOfStudy"
    )

    def __init__(self, api_key: str = API_KEY):
        self.api_key = api_key
        headers = {}
        if api_key:
            headers["x-api-key"] = api_key
        self.client = httpx.Client(
            base_url=S2_BASE,
            headers=headers,
            timeout=30.0,
        )
        self._last_request = 0.0
        self._min_interval = 1.1 if api_key else 0.01  # 1 RPS auth, shared unauth

    def _rate_limit(self):
        elapsed = time.time() - self._last_request
        if elapsed < self._min_interval:
            time.sleep(self._min_interval - elapsed)
        self._last_request = time.time()

    def search(
        self,
        query: str,
        limit: int = 50,
        offset: int = 0,
        year_range: Optional[str] = None,  # e.g., "2020-2025"
        fields_of_study: Optional[list[str]] = None,
    ) -> list[S2Paper]:
        """
        Search for papers by keyword query.

        Args:
            query: Search query string
            limit: Max results (max 100)
            offset: Pagination offset
            year_range: Filter by year range "YYYY-YYYY"
            fields_of_study: Filter by field (e.g., ["Medicine", "Biology"])

        Returns:
            List of S2Paper objects
        """
        self._rate_limit()

        params = {
            "query": query,
            "limit": min(limit, 100),
            "offset": offset,
            "fields": self.PAPER_FIELDS,
        }
        if year_range:
            params["year"] = year_range
        if fields_of_study:
            params["fieldsOfStudy"] = ",".join(fields_of_study)

        response = self.client.get("/paper/search", params=params)
        response.raise_for_status()

        data = response.json()
        papers = data.get("data", [])
        return [self._parse_paper(p) for p in papers]

    def get_paper(self, paper_id: str) -> Optional[S2Paper]:
        """
        Get a single paper by S2 ID, DOI, PMID, etc.

        Accepts:
            - S2 paper ID
            - DOI: "DOI:10.1234/..."
            - PMID: "PMID:12345678"
            - ArXiv: "ArXiv:2106.12345"
        """
        self._rate_limit()

        response = self.client.get(
            f"/paper/{paper_id}",
            params={"fields": self.PAPER_FIELDS},
        )
        if response.status_code == 404:
            return None
        response.raise_for_status()

        return self._parse_paper(response.json())

    def get_paper_citations(
        self, paper_id: str, limit: int = 50
    ) -> list[S2Paper]:
        """Get papers that cite the given paper."""
        self._rate_limit()

        response = self.client.get(
            f"/paper/{paper_id}/citations",
            params={"fields": self.PAPER_FIELDS, "limit": min(limit, 100)},
        )
        response.raise_for_status()

        data = response.json().get("data", [])
        return [
            self._parse_paper(item["citingPaper"])
            for item in data
            if "citingPaper" in item
        ]

    def get_paper_references(
        self, paper_id: str, limit: int = 50
    ) -> list[S2Paper]:
        """Get papers referenced by the given paper."""
        self._rate_limit()

        response = self.client.get(
            f"/paper/{paper_id}/references",
            params={"fields": self.PAPER_FIELDS, "limit": min(limit, 100)},
        )
        response.raise_for_status()

        data = response.json().get("data", [])
        return [
            self._parse_paper(item["citedPaper"])
            for item in data
            if "citedPaper" in item
        ]

    def batch_get_papers(self, paper_ids: list[str]) -> list[S2Paper]:
        """
        Batch fetch up to 500 papers by ID.
        Uses POST /paper/batch endpoint.
        """
        papers = []
        for i in range(0, len(paper_ids), 500):
            batch = paper_ids[i : i + 500]
            self._rate_limit()

            response = self.client.post(
                "/paper/batch",
                params={"fields": self.PAPER_FIELDS},
                json={"ids": batch},
            )
            response.raise_for_status()

            for p in response.json():
                if p:  # null entries for not-found papers
                    papers.append(self._parse_paper(p))

        return papers

    def _parse_paper(self, data: dict) -> S2Paper:
        """Parse API response dict into S2Paper."""
        authors = []
        for author in data.get("authors", []):
            name = author.get("name", "")
            if name:
                authors.append(name)

        external_ids = data.get("externalIds") or {}

        oa_pdf = data.get("openAccessPdf") or {}
        oa_url = oa_pdf.get("url")

        tldr_obj = data.get("tldr") or {}
        tldr = tldr_obj.get("text")

        fields = [
            f.get("category", "")
            for f in (data.get("s2FieldsOfStudy") or [])
        ]

        return S2Paper(
            paper_id=data.get("paperId", ""),
            title=data.get("title", ""),
            abstract=data.get("abstract") or "",
            authors=authors,
            year=data.get("year"),
            venue=data.get("venue") or "",
            doi=external_ids.get("DOI"),
            external_ids=external_ids,
            citation_count=data.get("citationCount", 0),
            reference_count=data.get("referenceCount", 0),
            is_open_access=data.get("isOpenAccess", False),
            open_access_url=oa_url,
            tldr=tldr,
            fields_of_study=fields,
        )

    def close(self):
        self.client.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
