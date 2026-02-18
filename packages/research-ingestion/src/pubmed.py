"""
PubMed E-Utilities wrapper for CompoundAtlas research ingestion pipeline.

Uses NCBI E-Utilities to search and fetch study data.
Docs: https://www.ncbi.nlm.nih.gov/books/NBK25497/

Rate limits:
  - Without API key: 3 requests/second
  - With API key: 10 requests/second
  - Register for free key: https://www.ncbi.nlm.nih.gov/account/
"""

import os
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import urlencode

import httpx

EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
API_KEY = os.getenv("NCBI_API_KEY", "")
EMAIL = os.getenv("NCBI_EMAIL", "")


@dataclass
class PubMedArticle:
    pmid: str
    title: str
    abstract: str = ""
    authors: list[str] = field(default_factory=list)
    journal: str = ""
    year: Optional[int] = None
    publication_date: Optional[str] = None
    doi: Optional[str] = None
    mesh_terms: list[str] = field(default_factory=list)
    publication_types: list[str] = field(default_factory=list)
    is_open_access: bool = False


class PubMedClient:
    """Thin wrapper around NCBI E-Utilities."""

    def __init__(self, api_key: str = API_KEY, email: str = EMAIL):
        self.api_key = api_key
        self.email = email
        self.client = httpx.Client(timeout=30.0)
        self._last_request_time = 0.0
        self._min_interval = 0.1 if api_key else 0.34  # 10/sec or 3/sec

    def _rate_limit(self):
        elapsed = time.time() - self._last_request_time
        if elapsed < self._min_interval:
            time.sleep(self._min_interval - elapsed)
        self._last_request_time = time.time()

    def _base_params(self) -> dict:
        params = {}
        if self.api_key:
            params["api_key"] = self.api_key
        if self.email:
            params["email"] = self.email
        return params

    def search(
        self,
        query: str,
        max_results: int = 100,
        sort: str = "relevance",
        min_date: Optional[str] = None,
        max_date: Optional[str] = None,
    ) -> list[str]:
        """
        Search PubMed and return list of PMIDs.

        Args:
            query: PubMed search query (supports boolean operators, MeSH terms)
            max_results: Maximum number of results to return
            sort: Sort order - "relevance", "pub_date", "Author", "JournalName"
            min_date: Minimum publication date (YYYY/MM/DD)
            max_date: Maximum publication date (YYYY/MM/DD)

        Returns:
            List of PMID strings
        """
        self._rate_limit()

        params = {
            **self._base_params(),
            "db": "pubmed",
            "term": query,
            "retmax": max_results,
            "sort": sort,
            "retmode": "json",
        }
        if min_date:
            params["mindate"] = min_date
            params["datetype"] = "pdat"
        if max_date:
            params["maxdate"] = max_date
            params["datetype"] = "pdat"

        url = f"{EUTILS_BASE}/esearch.fcgi?{urlencode(params)}"
        response = self.client.get(url)
        response.raise_for_status()

        data = response.json()
        return data.get("esearchresult", {}).get("idlist", [])

    def fetch_articles(self, pmids: list[str]) -> list[PubMedArticle]:
        """
        Fetch full article metadata for a list of PMIDs.

        Args:
            pmids: List of PubMed IDs

        Returns:
            List of PubMedArticle objects
        """
        if not pmids:
            return []

        articles = []
        # Process in batches of 200 (E-Utilities limit)
        for i in range(0, len(pmids), 200):
            batch = pmids[i : i + 200]
            articles.extend(self._fetch_batch(batch))

        return articles

    def _fetch_batch(self, pmids: list[str]) -> list[PubMedArticle]:
        self._rate_limit()

        params = {
            **self._base_params(),
            "db": "pubmed",
            "id": ",".join(pmids),
            "retmode": "xml",
            "rettype": "abstract",
        }

        url = f"{EUTILS_BASE}/efetch.fcgi?{urlencode(params)}"
        response = self.client.get(url)
        response.raise_for_status()

        return self._parse_xml(response.text)

    def _parse_xml(self, xml_text: str) -> list[PubMedArticle]:
        """Parse PubMed XML response into PubMedArticle objects."""
        articles = []
        root = ET.fromstring(xml_text)

        for article_elem in root.findall(".//PubmedArticle"):
            try:
                articles.append(self._parse_article(article_elem))
            except Exception as e:
                pmid = article_elem.findtext(".//PMID", "unknown")
                print(f"Warning: Failed to parse PMID {pmid}: {e}")

        return articles

    def _parse_article(self, elem: ET.Element) -> PubMedArticle:
        """Parse a single PubmedArticle XML element."""
        medline = elem.find(".//MedlineCitation")
        article = medline.find(".//Article")

        pmid = medline.findtext(".//PMID", "")
        title = article.findtext(".//ArticleTitle", "")

        # Abstract (may have multiple sections)
        abstract_parts = []
        abstract_elem = article.find(".//Abstract")
        if abstract_elem is not None:
            for text_elem in abstract_elem.findall(".//AbstractText"):
                label = text_elem.get("Label", "")
                text = text_elem.text or ""
                if label:
                    abstract_parts.append(f"{label}: {text}")
                else:
                    abstract_parts.append(text)
        abstract = "\n".join(abstract_parts)

        # Authors
        authors = []
        for author in article.findall(".//Author"):
            last = author.findtext("LastName", "")
            first = author.findtext("ForeName", "")
            if last:
                authors.append(f"{last} {first}".strip())

        # Journal
        journal = article.findtext(".//Journal/Title", "")

        # Year
        year = None
        year_text = article.findtext(".//Journal/JournalIssue/PubDate/Year")
        if year_text:
            try:
                year = int(year_text)
            except ValueError:
                pass

        # DOI
        doi = None
        for id_elem in article.findall(".//ELocationID"):
            if id_elem.get("EIdType") == "doi":
                doi = id_elem.text

        # MeSH terms
        mesh_terms = []
        for mesh in medline.findall(".//MeshHeadingList/MeshHeading/DescriptorName"):
            if mesh.text:
                mesh_terms.append(mesh.text)

        # Publication types
        pub_types = []
        for pt in article.findall(".//PublicationTypeList/PublicationType"):
            if pt.text:
                pub_types.append(pt.text)

        return PubMedArticle(
            pmid=pmid,
            title=title,
            abstract=abstract,
            authors=authors,
            journal=journal,
            year=year,
            doi=doi,
            mesh_terms=mesh_terms,
            publication_types=pub_types,
        )

    def search_and_fetch(
        self,
        query: str,
        max_results: int = 50,
        **search_kwargs,
    ) -> list[PubMedArticle]:
        """Convenience: search then fetch in one call."""
        pmids = self.search(query, max_results=max_results, **search_kwargs)
        return self.fetch_articles(pmids)

    def close(self):
        self.client.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()


# ─── STUDY TYPE CLASSIFICATION ───────────────────────

# Rule-based classification from PubMed publication types and MeSH terms
STUDY_TYPE_MAP = {
    "Meta-Analysis": "META_ANALYSIS",
    "Systematic Review": "SYSTEMATIC_REVIEW",
    "Randomized Controlled Trial": "RCT",
    "Controlled Clinical Trial": "CONTROLLED_TRIAL",
    "Clinical Trial": "CONTROLLED_TRIAL",
    "Clinical Trial, Phase I": "CONTROLLED_TRIAL",
    "Clinical Trial, Phase II": "CONTROLLED_TRIAL",
    "Clinical Trial, Phase III": "RCT",
    "Clinical Trial, Phase IV": "RCT",
    "Cohort Studies": "COHORT",
    "Observational Study": "COHORT",
    "Case-Control Studies": "CASE_CONTROL",
    "Cross-Sectional Studies": "CROSS_SECTIONAL",
    "Case Reports": "CASE_REPORT",
    "Review": "REVIEW",
}


def classify_study_type(article: PubMedArticle) -> str:
    """
    Classify study type from PubMed publication types and MeSH terms.
    Returns the strongest study type found.
    """
    # Priority order (strongest first)
    priority = [
        "META_ANALYSIS",
        "SYSTEMATIC_REVIEW",
        "RCT",
        "CONTROLLED_TRIAL",
        "COHORT",
        "CASE_CONTROL",
        "CROSS_SECTIONAL",
        "CASE_REPORT",
        "REVIEW",
    ]

    found_types = set()

    for pub_type in article.publication_types:
        mapped = STUDY_TYPE_MAP.get(pub_type)
        if mapped:
            found_types.add(mapped)

    for mesh in article.mesh_terms:
        mapped = STUDY_TYPE_MAP.get(mesh)
        if mapped:
            found_types.add(mapped)

    # Check abstract keywords as fallback
    abstract_lower = article.abstract.lower()
    if not found_types:
        if "meta-analysis" in abstract_lower or "meta analysis" in abstract_lower:
            found_types.add("META_ANALYSIS")
        elif "randomized" in abstract_lower and "controlled" in abstract_lower:
            found_types.add("RCT")
        elif "systematic review" in abstract_lower:
            found_types.add("SYSTEMATIC_REVIEW")
        elif "animal" in abstract_lower or "mice" in abstract_lower or "rats" in abstract_lower:
            found_types.add("ANIMAL")
        elif "in vitro" in abstract_lower or "cell culture" in abstract_lower:
            found_types.add("IN_VITRO")

    # Return highest priority type found
    for ptype in priority:
        if ptype in found_types:
            return ptype

    if "ANIMAL" in found_types:
        return "ANIMAL"
    if "IN_VITRO" in found_types:
        return "IN_VITRO"

    return "OTHER"
