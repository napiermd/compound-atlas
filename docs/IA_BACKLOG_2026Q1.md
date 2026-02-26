# CompoundAtlas IA Audit + Backlog Hardening (2026 Q1)

## Scope audited
- Primary navigation and discoverability across `/compounds`, `/stacks`, `/cycles`, `/research`
- Cross-page user flows:
  - Compounds → stack building
  - Stacks → cycle execution
  - Research → compound pages
  - Logged-out to logged-in transitions
- Research freshness and content coverage gaps

## What was improved in this PR (quick wins)
1. **Added section-level navigation hub** (`SectionNav`) to Compounds, Stacks, Cycles, and Research pages.
   - Improves lateral movement and task switching across main product areas.
2. **Upgraded Research discovery UX**
   - Added query + study type + evidence level filters.
   - Added explicit clear/reset behavior.
   - Added result count context (`showing X of Y`).
3. **Improved research-to-compound linkage**
   - Compound badges now deep-link to compound detail pages.
   - Added PubMed/full-text outbound links for source verification.

---

## IA gaps still open (prioritized backlog)

### P0 — must-do next

#### 1) Multi-level stack organization (goal → experience → variant)
- **Problem:** Stack list is filterable but not truly hierarchical; difficult to browse depth-first.
- **Outcome:** Users can browse stacks as a drilldown tree before filtering.
- **Acceptance criteria:**
  - [ ] Add group headers for goal + experience + variant.
  - [ ] URL-driven state (`/stacks?goal=x&level=y&variant=z`).
  - [ ] Persist/restore filters on refresh/share.

#### 2) Outdated compound freshness indicators + stale queue
- **Problem:** `lastResearchSync` exists but no stale queue/ops surface.
- **Outcome:** Editorial/data ops can find and refresh stale compounds quickly.
- **Acceptance criteria:**
  - [ ] Define stale thresholds (e.g., >180d warning, >365d critical).
  - [ ] Add stale badges on cards and detail pages.
  - [ ] Add admin/report endpoint listing stale compounds by priority.

#### 3) Peptide frontier coverage expansion
- **Problem:** Pipeline exists but peptide coverage depth is thin and hard to discover.
- **Outcome:** Better frontier completeness and discoverability.
- **Acceptance criteria:**
  - [ ] Define peptide inclusion rubric (evidence + safety + legality).
  - [ ] Add at least 25 candidate peptides with triage status.
  - [ ] Add dedicated peptide frontier section/filter.

#### 4) Literature freshness automation
- **Problem:** Refresh appears manual/batch; freshness can drift.
- **Outcome:** Predictable, measured ingestion freshness.
- **Acceptance criteria:**
  - [ ] Scheduled incremental ingestion cadence.
  - [ ] Failure alerting + run history.
  - [ ] Freshness SLA metric surfaced in UI/admin.

#### 5) Flow completion from research to action
- **Problem:** Research page is browse-heavy; weak conversion to stack/cycle workflows.
- **Outcome:** Faster path from evidence discovery to protocol execution.
- **Acceptance criteria:**
  - [ ] “Add to draft stack” CTA from compound details.
  - [ ] “Related stacks” on compound pages.
  - [ ] “Start cycle from this stack” one-click on stack detail.

### P1 — high-value follow-ons

#### 6) Compound compare mode
- Side-by-side evidence/safety/dose/synergy compare for 2–4 compounds.

#### 7) IA taxonomy normalization
- Normalize category/subcategory naming and aliases for cleaner browse/search facets.

#### 8) Personalized onboarding route
- Guided first-run path by goal/risk tolerance/legal constraints.

#### 9) Research feed quality controls
- Add dedupe confidence score + source quality diagnostics.

#### 10) Canonical search UX across all domains
- One global search entry with tabs for compounds/stacks/studies.

---

## Proposed top 10 actionable tickets (for GitHub issues)
1. Hierarchical stack navigation IA
2. URL-persisted stack filters and sharable views
3. Stale compound scoring + badge system
4. Stale compound operations dashboard/export
5. Peptide frontier intake rubric + candidate backlog
6. Add peptide frontier collection page/filters
7. Automated weekly ingestion scheduler + alerts
8. Freshness SLA metrics and status component
9. Compound → related stacks recommendation block
10. Stack detail “Start cycle” CTA hardening + instrumentation

---

## Top 5 roadmap priorities
1. **Automate literature freshness** (scheduler, alerts, SLA)
2. **Fix stale-compound discoverability** (badges + stale queue)
3. **Deepen stack IA** (hierarchical browse + URL-persisted filters)
4. **Expand peptide frontier coverage** (rubric + curated pipeline)
5. **Improve cross-domain conversion flows** (research → compound → stack → cycle)
