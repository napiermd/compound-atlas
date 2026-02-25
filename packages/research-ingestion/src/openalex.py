"""
OpenAlex API wrapper for literature enrichment/freshness checks.
Docs: https://docs.openalex.org/
"""

from dataclasses import dataclass, field
from typing import Optional

import httpx

OPENALEX_BASE = "https://api.openalex.org"


@dataclass
class OAWork:
    openalex_id: str
    title: str
    doi: Optional[str] = None
    pmid: Optional[str] = None
    year: Optional[int] = None
    publication_date: Optional[str] = None
    venue: str = ""
    authors: list[str] = field(default_factory=list)
    abstract: str = ""
    is_open_access: bool = False
    open_access_url: Optional[str] = None


class OpenAlexClient:
    def __init__(self, email: Optional[str] = None):
        headers = {}
        if email:
            headers["User-Agent"] = f"CompoundAtlas/1.0 ({email})"
        self.client = httpx.Client(base_url=OPENALEX_BASE, headers=headers, timeout=30.0)

    def search(self, query: str, limit: int = 50, from_year: Optional[int] = None) -> list[OAWork]:
        filters = ["has_abstract:true"]
        if from_year:
            filters.append(f"from_publication_date:{from_year}-01-01")

        params = {
            "search": query,
            "filter": ",".join(filters),
            "per-page": min(limit, 200),
            "sort": "publication_date:desc",
        }

        resp = self.client.get("/works", params=params)
        resp.raise_for_status()
        results = resp.json().get("results", [])
        return [self._parse_work(r) for r in results]

    def _parse_work(self, item: dict) -> OAWork:
        ids = item.get("ids") or {}
        doi = ids.get("doi")
        if doi:
            doi = doi.replace("https://doi.org/", "")
        pmid = ids.get("pmid")
        if pmid:
            pmid = pmid.replace("https://pubmed.ncbi.nlm.nih.gov/", "").strip("/")

        authors = []
        for aa in item.get("authorships") or []:
            name = (aa.get("author") or {}).get("display_name")
            if name:
                authors.append(name)

        abstract = ""
        abstract_idx = item.get("abstract_inverted_index")
        if abstract_idx:
            tokens = []
            for token, positions in abstract_idx.items():
                for p in positions:
                    tokens.append((p, token))
            tokens.sort(key=lambda x: x[0])
            abstract = " ".join(t for _, t in tokens)

        oa = item.get("open_access") or {}
        return OAWork(
            openalex_id=item.get("id", ""),
            title=item.get("display_name", ""),
            doi=doi,
            pmid=pmid,
            year=item.get("publication_year"),
            publication_date=item.get("publication_date"),
            venue=(item.get("primary_location") or {}).get("source", {}).get("display_name", "") or "",
            authors=authors,
            abstract=abstract,
            is_open_access=bool(oa.get("is_oa", False)),
            open_access_url=(item.get("primary_location") or {}).get("landing_page_url"),
        )

    def close(self):
        self.client.close()
