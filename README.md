# CompoundAtlas — Open-Source Evidence-Based Enhancement Platform

> An open-source, evidence-scored compound and stack planning platform for athletic performance, cognitive enhancement, longevity, and body composition optimization.

**Think: Examine.com meets GitHub meets PubMed — free, open, and community-driven.**

---

## What Is This?

CompoundAtlas is a web application that lets users:

1. **Browse compounds** — from creatine to peptides to nootropics — each with an **evidence score** derived from real research
2. **Build stacks** — combine compounds into goal-oriented protocols (recomp, cognitive focus, sleep, etc.)
3. **Track cycles** — log dosing, bloodwork, symptoms, and progress over time
4. **Read the research** — every compound page pulls from PubMed, Semantic Scholar, and curated reviews with evidence grades
5. **Share protocols** — publish anonymized stacks and results for community learning

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Compound  │ │  Stack   │ │  Cycle   │ │ Research│ │
│  │ Explorer  │ │ Builder  │ │ Tracker  │ │ Viewer │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
└────────────────────┬────────────────────────────────┘
                     │ REST / tRPC
┌────────────────────┴────────────────────────────────┐
│                  Backend (Node.js)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Auth     │ │ Compound │ │ Research │ │ Cycle  │ │
│  │ Service  │ │ Service  │ │ Ingestion│ │ Logger │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
└────────┬──────────┬──────────┬──────────┬───────────┘
         │          │          │          │
    ┌────┴───┐ ┌────┴───┐ ┌───┴────┐ ┌───┴────┐
    │Postgres│ │ Redis  │ │PubMed  │ │Semantic│
    │  (DB)  │ │(Cache) │ │  API   │ │Scholar │
    └────────┘ └────────┘ └────────┘ └────────┘
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | **Next.js 14+ (App Router)** | SSR for SEO, React ecosystem, great DX |
| Styling | **Tailwind CSS + shadcn/ui** | Fast iteration, accessible components |
| Backend API | **Next.js API routes + tRPC** | Type-safe end-to-end, co-located |
| Database | **PostgreSQL + Prisma ORM** | Relational data (compounds, studies, users), great migrations |
| Cache | **Redis (Upstash)** | Cache PubMed/S2 API responses (rate limit compliance) |
| Auth | **NextAuth.js (Auth.js v5)** | GitHub, Google, email login |
| Research APIs | **NCBI E-Utilities, Semantic Scholar API** | Free, open programmatic access to literature |
| Search | **Typesense or Meilisearch** | Fast compound/study full-text search |
| Hosting | **Vercel (frontend) + Railway/Fly.io (DB)** | Free tier friendly for open source |
| CI/CD | **GitHub Actions** | Standard open-source workflow |

---

## Data Model

### Core Entities

```
Compound
├── id, slug, name, aliases[]
├── category (enum: ANABOLIC, PEPTIDE, NOOTROPIC, SUPPLEMENT, SARM, GH_SECRETAGOGUE, FAT_LOSS, OTHER)
├── subcategory (e.g., "oral_steroid", "racetam", "amino_acid")
├── description (rich text / MDX)
├── legal_status (enum: LEGAL, PRESCRIPTION, SCHEDULED, GRAY_MARKET, BANNED)
├── evidence_score (computed, 0-100)
├── safety_score (computed, 0-100)
├── common_doses: JSON { min, typical, max, unit, frequency }
├── half_life, onset, duration
├── mechanisms[] (FK → Mechanism)
├── interactions[] (FK → Interaction)
├── side_effects[] (FK → SideEffect)
├── studies[] (FK → Study)
└── timestamps

Study
├── id, pmid, doi, semantic_scholar_id
├── title, abstract, authors[], journal, year
├── study_type (enum: META_ANALYSIS, RCT, COHORT, CASE_CONTROL, CASE_REPORT, IN_VITRO, ANIMAL, REVIEW)
├── sample_size, duration_weeks
├── population (e.g., "trained males", "elderly", "healthy adults")
├── outcomes[] (FK → Outcome)
├── evidence_level (enum: A, B, C, D) — Oxford/GRADE-inspired
├── effect_size, confidence_interval
├── compound_id (FK → Compound)
├── full_text_url (if open access)
└── timestamps

Outcome
├── id, study_id (FK)
├── metric (e.g., "lean_mass", "vo2max", "reaction_time", "cortisol")
├── direction (enum: INCREASE, DECREASE, NO_CHANGE, MIXED)
├── magnitude (enum: SMALL, MODERATE, LARGE)
├── statistical_significance (boolean)
└── notes

Stack
├── id, name, slug, description
├── goal (enum: RECOMP, BULK, CUT, COGNITIVE, SLEEP, LONGEVITY, RECOVERY, CUSTOM)
├── compounds[] (FK → StackCompound join table with dose, frequency, duration)
├── creator_id (FK → User)
├── is_public (boolean)
├── evidence_score (computed aggregate)
├── upvotes, forks
└── timestamps

Cycle (user's personal tracking)
├── id, user_id, stack_id (optional)
├── name, start_date, end_date
├── status (enum: PLANNED, ACTIVE, COMPLETED, ABORTED)
├── entries[] (FK → CycleEntry)
├── bloodwork[] (FK → BloodworkPanel)
└── timestamps

CycleEntry (daily/weekly log)
├── id, cycle_id, date
├── compounds_taken: JSON [{ compound_id, dose, unit }]
├── metrics: JSON { weight, body_fat, resting_hr, sleep_hours, mood_1_10, libido_1_10, energy_1_10 }
├── notes (free text)
└── symptoms[] (tags)

BloodworkPanel
├── id, cycle_id, date, lab_name
├── results: JSON { total_test, free_test, estradiol, prolactin, LH, FSH, hematocrit, lipids{}, liver{}, kidney{}, thyroid{}, etc }
├── file_url (uploaded PDF)
└── notes
```

---

## Evidence Scoring System

Every compound gets a composite **Evidence Score (0–100)** calculated from:

| Factor | Weight | Description |
|--------|--------|-------------|
| Study count | 15% | Total number of studies indexed |
| Study quality | 30% | Weighted by study type (meta-analysis=5, RCT=4, cohort=3, etc.) |
| Sample sizes | 15% | Aggregate participants across studies |
| Effect consistency | 20% | % of studies showing same direction of effect |
| Replication | 10% | Independent lab replication of key findings |
| Recency | 10% | Bonus for studies published in last 5 years |

Each factor normalizes to 0–100, then weighted sum produces the composite.

**Display format:**

```
┌─────────────────────────────────────────┐
│  Creatine Monohydrate                   │
│  Evidence Score: 92/100 ████████████░░  │
│  Safety Score:   88/100 ███████████░░░  │
│  ──────────────────────────────────────  │
│  Studies: 847  │  Meta-analyses: 23     │
│  Top outcome: +1.4kg lean mass (8wks)   │
│  Level: A (Strong Evidence)             │
└─────────────────────────────────────────┘
```

---

## Research Data Pipeline

### Sources (all free/open APIs)

1. **NCBI E-Utilities (PubMed)**
   - `ESearch` → find PMIDs for compound search terms
   - `EFetch` → pull abstracts, metadata, MeSH terms
   - `ELink` → citation networks
   - Rate limit: 3 req/sec without key, 10/sec with free API key
   - Python: `biopython` or `pubmedclient`

2. **Semantic Scholar API**
   - Paper search, citation graphs, TLDRs, author data
   - 200M+ papers indexed
   - Rate limit: 1 RPS with free API key (generous for batch)
   - Python: `semanticscholar` package

3. **OpenAlex** (backup/enrichment)
   - Open scholarly metadata, free API
   - Good for citation counts, open access links

4. **ClinicalTrials.gov API**
   - Ongoing trials for compounds
   - Useful for "what's being studied right now"

### Ingestion Pipeline

```
[Cron Job: Weekly]
    │
    ├── For each compound in DB:
    │   ├── Search PubMed: "{compound_name} AND (human OR clinical)"
    │   ├── Search Semantic Scholar: compound_name + synonyms
    │   ├── Deduplicate by DOI/PMID
    │   ├── Classify study type (regex + LLM fallback)
    │   ├── Extract outcomes (structured from abstract)
    │   ├── Compute/update evidence_score
    │   └── Cache results in Redis (TTL: 7 days)
    │
    └── Store new studies → Postgres
```

### LLM-Assisted Classification (Optional Enhancement)

For abstracts that are hard to auto-classify, an optional Claude API call can:
- Classify study type from abstract text
- Extract structured outcomes (metric, direction, magnitude)
- Generate a plain-English summary
- Flag potential conflicts of interest

This is opt-in and runs async to keep the platform functional without API costs.

---

## Key Pages / Features

### 1. Compound Explorer (`/compounds`)
- Filterable grid/table of all compounds
- Sort by evidence score, category, legal status, popularity
- Search with autocomplete (synonyms, brand names)

### 2. Compound Detail (`/compounds/[slug]`)
- Evidence score card + safety score
- Dosing guidelines (min/typical/max)
- Mechanism of action summary
- Studies table with filters (study type, year, outcome)
- Side effects with frequency data
- Interactions with other compounds
- Community stacks using this compound
- "View on PubMed" / "View on Semantic Scholar" links

### 3. Stack Builder (`/stacks/new`)
- Search and add compounds
- Set dose, frequency, duration for each
- System flags interactions/conflicts
- Auto-calculates composite evidence score
- Save, publish, or fork existing stacks

### 4. Cycle Tracker (`/cycles`)
- Create a cycle from a stack or freeform
- Daily logging: compounds taken, weight, mood, sleep, symptoms
- Bloodwork upload and tracking
- Charts: weight over time, bloodwork trends, symptom heatmap
- Export to PDF/CSV

### 5. Research Feed (`/research`)
- Latest studies auto-pulled for compounds user follows
- Filter by study type, evidence level, outcome
- Save/bookmark studies
- Weekly digest email (optional)

### 6. Leaderboard / Community (`/community`)
- Most popular stacks by goal
- Anonymized cycle results (opt-in sharing)
- Discussion threads per compound

---

## Project Structure

```
compound-atlas/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml              # Lint, test, type-check
│   │   └── deploy.yml          # Auto-deploy on merge to main
│   ├── ISSUE_TEMPLATE/
│   └── CONTRIBUTING.md
├── apps/
│   └── web/                    # Next.js application
│       ├── app/
│       │   ├── (auth)/         # Login, register
│       │   ├── compounds/      # Explorer + detail pages
│       │   ├── stacks/         # Builder + detail
│       │   ├── cycles/         # Tracker
│       │   ├── research/       # Feed
│       │   ├── community/      # Leaderboard
│       │   ├── api/            # API routes
│       │   │   ├── trpc/       # tRPC router
│       │   │   ├── cron/       # Vercel cron endpoints
│       │   │   └── webhooks/
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── components/
│       │   ├── ui/             # shadcn components
│       │   ├── compound/       # CompoundCard, EvidenceScore, etc.
│       │   ├── stack/          # StackBuilder, CompoundPicker
│       │   ├── cycle/          # CycleLog, BloodworkChart
│       │   └── research/       # StudyCard, EvidenceTable
│       ├── lib/
│       │   ├── db.ts           # Prisma client
│       │   ├── auth.ts         # NextAuth config
│       │   ├── trpc/           # tRPC server + client
│       │   ├── scoring.ts      # Evidence score algorithm
│       │   └── utils.ts
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts         # Seed with initial compound data
│       └── package.json
├── packages/
│   ├── research-ingestion/     # Python service for PubMed/S2 pipeline
│   │   ├── src/
│   │   │   ├── pubmed.py       # NCBI E-Utilities wrapper
│   │   │   ├── semantic_scholar.py
│   │   │   ├── classifier.py   # Study type classification
│   │   │   ├── scorer.py       # Evidence score computation
│   │   │   ├── ingest.py       # Main pipeline orchestrator
│   │   │   └── models.py       # Pydantic models
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   └── README.md
│   ├── compound-data/          # Curated seed data (JSON/YAML)
│   │   ├── compounds/
│   │   │   ├── creatine.yaml
│   │   │   ├── testosterone.yaml
│   │   │   ├── anavar.yaml
│   │   │   ├── alpha-gpc.yaml
│   │   │   ├── modafinil.yaml
│   │   │   └── ...
│   │   ├── categories.yaml
│   │   ├── mechanisms.yaml
│   │   └── interactions.yaml
│   └── shared/                 # Shared types/utils
│       ├── types/
│       └── constants/
├── docker-compose.yml          # Local dev: Postgres + Redis
├── turbo.json                  # Turborepo config
├── package.json                # Root workspace
├── .env.example
└── README.md                   # This file
```

---

## Getting Started (Developer)

### Prerequisites
- Node.js 20+
- Python 3.11+
- Docker (for local Postgres + Redis)
- NCBI API key (free: https://www.ncbi.nlm.nih.gov/account/)
- Semantic Scholar API key (free: https://www.semanticscholar.org/product/api)

### Setup

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/compound-atlas.git
cd compound-atlas

# Install dependencies
npm install

# Start databases
docker-compose up -d

# Set up environment
cp .env.example .env
# Edit .env with your API keys

# Run database migrations + seed
npx prisma migrate dev
npx prisma db seed

# Start dev server
npm run dev
```

### Running the Research Pipeline

```bash
cd packages/research-ingestion
pip install -r requirements.txt

# One-time full ingestion
python -m src.ingest --full

# Incremental update (for cron)
python -m src.ingest --incremental --since 7d
```

---

## Compound Categories (Initial Scope)

### Phase 1: Launch Categories
- **Supplements** — Creatine, Beta-Alanine, Citrulline, Fish Oil, Vitamin D, Magnesium, Ashwagandha, etc.
- **Nootropics** — Alpha-GPC, Lion's Mane, Modafinil, Racetams, L-Theanine + Caffeine, etc.
- **Peptides** — BPC-157, TB-500, CJC-1295, Ipamorelin, GHK-Cu, etc.

### Phase 2: Expanded
- **Hormonal** — Testosterone (TRT context), DHEA, Pregnenolone, Thyroid support
- **Fat Loss** — Retatrutide, Semaglutide, Cardarine (research context), L-Carnitine, Yohimbine
- **GH-Related** — HGH, MK-677, GHRP-6, Tesamorelin

### Phase 3: Advanced
- **Anabolics** — Presented in research/harm-reduction context with full evidence profiles
- **SARMs** — Research data, clinical trial status, evidence gaps

> **Content Policy:** All compound information is presented as educational research data with evidence scores. The platform does not sell, recommend, or endorse the use of any controlled substances. Legal status is clearly displayed. Harm reduction information is prioritized.

---

## Roadmap

- [ ] **v0.1 — Foundation** (Weeks 1-3)
  - [ ] Repo setup (Turborepo, Next.js, Prisma, Docker)
  - [ ] Database schema + migrations
  - [ ] Auth (GitHub + email)
  - [ ] Compound CRUD + seed data (20 compounds)
  - [ ] Basic compound explorer page
  - [ ] Basic compound detail page with evidence card

- [ ] **v0.2 — Research Pipeline** (Weeks 4-6)
  - [ ] PubMed ingestion service
  - [ ] Semantic Scholar ingestion
  - [ ] Study deduplication + classification
  - [ ] Evidence scoring algorithm v1
  - [ ] Studies table on compound detail page

- [ ] **v0.3 — Stack Builder** (Weeks 7-8)
  - [ ] Stack creation UI
  - [ ] Compound interaction checker
  - [ ] Composite stack evidence score
  - [ ] Public stack gallery

- [ ] **v0.4 — Cycle Tracker** (Weeks 9-11)
  - [ ] Cycle creation from stack
  - [ ] Daily logging UI
  - [ ] Bloodwork panel entry
  - [ ] Progress charts (weight, metrics, bloodwork trends)
  - [ ] PDF/CSV export

- [ ] **v0.5 — Community + Polish** (Weeks 12-14)
  - [ ] Stack upvoting + forking
  - [ ] Research feed with followed compounds
  - [ ] Full-text search (Typesense)
  - [ ] Mobile responsive polish
  - [ ] Open-source launch on GitHub + ProductHunt

---

## API Keys Needed (All Free)

| Service | Free Tier | Get Key |
|---------|-----------|---------|
| NCBI E-Utilities | 10 req/sec with key | https://www.ncbi.nlm.nih.gov/account/ |
| Semantic Scholar | 1 RPS (auth), 1000 RPS (shared unauth) | https://www.semanticscholar.org/product/api |
| OpenAlex | Unlimited (polite pool) | No key needed, just email in header |
| Anthropic (optional) | Pay-as-you-go for LLM classification | https://console.anthropic.com |

---

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for guidelines.

**Good first issues:**
- Add a new compound YAML file to `packages/compound-data/compounds/`
- Improve evidence scoring weights
- Add study type classification rules
- UI component improvements
- Documentation and guides

---

## License

MIT — Use it, fork it, build on it.

---

## Acknowledgments

- [Examine.com](https://examine.com) — Inspiration for evidence-based supplement analysis
- [NCBI E-Utilities](https://www.ncbi.nlm.nih.gov/home/develop/api/) — Free access to PubMed literature
- [Semantic Scholar](https://www.semanticscholar.org/) — AI-powered academic paper discovery
- [OpenAlex](https://openalex.org/) — Open scholarly metadata

---

*Built by the community, for the community. No paywalls. No ads. Just evidence.*
