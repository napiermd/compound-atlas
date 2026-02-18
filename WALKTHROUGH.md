# CompoundAtlas — Full Bootstrap Walkthrough
# ============================================
# You're sitting in Cursor with Claude Code open in the terminal.
# You've extracted compound-atlas-starter.tar.gz somewhere on your machine.
# Here's every step, in order, with the exact commands and Claude Code prompts.


# ══════════════════════════════════════════════════════════════
# PHASE 0: ENVIRONMENT SETUP (5 minutes)
# ══════════════════════════════════════════════════════════════

# Step 0.1 — Open the project in Cursor
# In your regular terminal (not Claude Code yet):

cd ~/projects  # or wherever you keep code
tar -xzf ~/Downloads/compound-atlas-starter.tar.gz
cd compound-atlas
cursor .  # Opens Cursor IDE in this directory

# Step 0.2 — Verify you have the prerequisites
node --version   # Need 20+
python3 --version  # Need 3.11+
docker --version   # Need Docker running

# Step 0.3 — Get your free API keys (do this in browser tabs now)
#
# 1. NCBI API Key (PubMed):
#    → https://www.ncbi.nlm.nih.gov/account/
#    → Sign up → Settings → API Key Management → Create
#
# 2. Semantic Scholar API Key:
#    → https://www.semanticscholar.org/product/api
#    → Request API Key (arrives via email, usually instant)
#
# 3. GitHub OAuth (for user login):
#    → https://github.com/settings/developers
#    → New OAuth App
#    → Homepage: http://localhost:3000
#    → Callback: http://localhost:3000/api/auth/callback/github

# Step 0.4 — Set up environment
cp .env.example .env
# Now edit .env and paste in your API keys


# ══════════════════════════════════════════════════════════════
# PHASE 1: PROJECT SCAFFOLDING (Claude Code prompts)
# ══════════════════════════════════════════════════════════════

# Open Claude Code terminal in Cursor (Cmd+Shift+P → "Claude Code")
# Or if using Claude Code CLI: just type `claude` in terminal

# ──────────────────────────────────────────────────────────────
# PROMPT 1.1 — Initialize Next.js app
# ──────────────────────────────────────────────────────────────

# Paste this into Claude Code:

<<PROMPT
I have a monorepo starter for CompoundAtlas (an open-source evidence-based
compound research platform). The repo structure is already set up with:
- package.json and turbo.json at root
- Prisma schema at apps/web/prisma/schema.prisma
- Python research pipeline in packages/research-ingestion/
- Compound seed data in packages/compound-data/compounds/*.yaml

I need you to scaffold the Next.js 14 app in apps/web/. Do the following:

1. Initialize Next.js 14 with App Router in apps/web/:
   - TypeScript strict mode
   - Tailwind CSS
   - src/ directory: NO (use app/ directly)
   - Import alias: @/

2. Install and configure these packages:
   - shadcn/ui (init with default style, zinc color, CSS variables)
   - tRPC (@trpc/server, @trpc/client, @trpc/react-query, @trpc/next)
   - NextAuth.js v5 (next-auth@beta, @auth/prisma-adapter)
   - Prisma client (@prisma/client, prisma as dev dep)
   - Zod for validation
   - date-fns for date handling
   - recharts for charts
   - lucide-react for icons
   - @tanstack/react-query

3. Set up the file structure:
   apps/web/
   ├── app/
   │   ├── layout.tsx          (root layout with providers)
   │   ├── page.tsx            (landing page)
   │   ├── globals.css         (Tailwind + shadcn styles)
   │   ├── (auth)/
   │   │   ├── login/page.tsx
   │   │   └── register/page.tsx
   │   ├── compounds/
   │   │   ├── page.tsx        (explorer/grid)
   │   │   └── [slug]/page.tsx (detail)
   │   ├── stacks/
   │   │   ├── page.tsx        (gallery)
   │   │   └── new/page.tsx    (builder)
   │   ├── cycles/
   │   │   └── page.tsx
   │   ├── research/
   │   │   └── page.tsx
   │   └── api/
   │       ├── auth/[...nextauth]/route.ts
   │       └── trpc/[trpc]/route.ts
   ├── components/
   │   └── ui/                 (shadcn components go here)
   ├── lib/
   │   ├── db.ts               (Prisma singleton)
   │   ├── auth.ts             (NextAuth config)
   │   ├── trpc/
   │   │   ├── client.ts
   │   │   ├── server.ts
   │   │   ├── provider.tsx
   │   │   └── routers/
   │   │       ├── index.ts    (root router)
   │   │       ├── compound.ts
   │   │       ├── stack.ts
   │   │       └── cycle.ts
   │   └── utils.ts
   ├── prisma/
   │   └── schema.prisma       (already exists)
   └── package.json

4. Generate Prisma client and run initial migration.

5. Make sure `npm run dev` from root starts the Next.js dev server.

Read the existing CLAUDE.md and prisma/schema.prisma first to understand the
full data model before generating code.
PROMPT


# ──────────────────────────────────────────────────────────────
# PROMPT 1.2 — Start databases and run migration
# ──────────────────────────────────────────────────────────────

# After Claude Code finishes scaffolding, run these yourself:

docker-compose up -d          # Start Postgres + Redis + Typesense
cd apps/web
npx prisma migrate dev --name init   # Create tables
npx prisma generate                   # Generate client
cd ../..

# Verify:
docker ps  # Should show 3 containers running
# Should see migration success message


# ══════════════════════════════════════════════════════════════
# PHASE 2: SEED DATA + COMPOUND PAGES (Claude Code prompts)
# ══════════════════════════════════════════════════════════════

# ──────────────────────────────────────────────────────────────
# PROMPT 2.1 — Create the database seed script
# ──────────────────────────────────────────────────────────────

<<PROMPT
Create a seed script at apps/web/prisma/seed.ts that:

1. Reads all YAML files from packages/compound-data/compounds/*.yaml
2. Parses them and upserts into the Compound table using Prisma
3. Also creates related records:
   - CompoundSideEffect entries from sideEffects array
   - CompoundMechanism entries from mechanisms array
   - CompoundInteraction entries from interactions array (match by target slug)
4. Handles re-running idempotently (upsert on slug)

Also update apps/web/package.json to add:
  "prisma": { "seed": "tsx prisma/seed.ts" }

And add tsx as a dev dependency.

Then add 8 more compound YAML files to packages/compound-data/compounds/:
- ashwagandha.yaml (adaptogen)
- modafinil.yaml (nootropic)
- bpc-157.yaml (peptide)
- l-theanine.yaml (nootropic/amino acid)
- beta-alanine.yaml (supplement)
- lions-mane.yaml (nootropic)
- citrulline-malate.yaml (supplement)
- magnesium-glycinate.yaml (vitamin/mineral)

Each YAML should follow the exact same format as creatine-monohydrate.yaml
with realistic dosing, side effects, mechanisms, and PubMed search terms.

After creating everything, run: npx prisma db seed
PROMPT


# ──────────────────────────────────────────────────────────────
# PROMPT 2.2 — Build the Compound Explorer page
# ──────────────────────────────────────────────────────────────

<<PROMPT
Build the Compound Explorer page at app/compounds/page.tsx.

This is the main browsing interface. Requirements:

1. Server component that fetches all compounds from Prisma

2. Layout: Responsive grid of CompoundCard components
   - Each card shows: name, category badge, evidence score bar,
     study count, legal status indicator, and brief description
   - Cards link to /compounds/[slug]

3. Filtering sidebar (or top bar on mobile):
   - Category filter (checkboxes for each CompoundCategory enum)
   - Legal status filter
   - Evidence level filter (A/B/C/D)
   - Sort by: evidence score, name, study count, recently updated

4. Search bar at top with debounced filtering (client-side for now)

5. Create these shadcn components first:
   - Add: badge, card, input, select, checkbox, separator, skeleton
   (Use: npx shadcn-ui@latest add badge card input select checkbox separator skeleton)

6. Create custom components:
   - components/compound/CompoundCard.tsx
   - components/compound/EvidenceScoreBadge.tsx (colored bar + number)
   - components/compound/CategoryBadge.tsx (colored pill per category)
   - components/compound/CompoundFilters.tsx

Design notes:
- Dark mode friendly (use shadcn theming)
- Evidence score bar: red < 30, yellow 30-60, green > 60
- Category badges: each category gets a distinct color
- Clean, data-dense layout — think Bloomberg terminal meets modern web
- No emojis in the UI

Make it look professional and information-dense but clean.
PROMPT


# ──────────────────────────────────────────────────────────────
# PROMPT 2.3 — Build the Compound Detail page
# ──────────────────────────────────────────────────────────────

<<PROMPT
Build the Compound Detail page at app/compounds/[slug]/page.tsx.

This is the most important page in the app. It should feel like a
comprehensive research dossier for a single compound.

Layout (top to bottom):

1. HEADER SECTION
   - Compound name (large), category badge, legal status badge
   - Evidence Score card: big number /100 with colored ring/bar
   - Safety Score card (if available)
   - Quick stats row: study count, meta-analyses, evidence level

2. OVERVIEW TAB (default)
   - Description (from compound.description, render as markdown)
   - Dosing card: min / typical / max with unit and frequency
   - Half-life, onset, duration
   - Route of administration tags

3. EVIDENCE TAB
   - Studies table with columns: Title, Type, Year, Sample Size, Journal
   - Study type badges (colored: meta-analysis=purple, RCT=blue, etc.)
   - Evidence score breakdown chart (radar or bar showing the 6 factors)
   - "View on PubMed" links for each study
   - NOTE: Studies won't be populated yet — show empty state gracefully

4. MECHANISMS TAB
   - List of mechanisms with pathway name and description
   - Eventually could have pathway diagrams

5. SIDE EFFECTS TAB
   - Table: name, severity, frequency, notes
   - Color-coded severity (mild=green, moderate=yellow, severe=red)

6. INTERACTIONS TAB
   - Table: compound name (linked), interaction type, severity, description

7. STACKS TAB (placeholder for now)
   - "Community stacks using this compound" — show empty state

Use tabs from shadcn (add the tabs component).
Also add: table, tooltip, progress, avatar components from shadcn.

Create components:
- components/compound/CompoundHeader.tsx
- components/compound/DosingCard.tsx
- components/compound/EvidenceBreakdown.tsx
- components/compound/StudiesTable.tsx
- components/compound/SideEffectsTable.tsx
- components/compound/InteractionsTable.tsx
- components/compound/MechanismsList.tsx

Use recharts for the evidence score breakdown (radar chart with the 6 factors).

Data fetching: Server component, fetch by slug from Prisma with all relations.
Generate static params from all compound slugs for ISR.
PROMPT


# ══════════════════════════════════════════════════════════════
# PHASE 3: VERIFY & TEST (manual steps)
# ══════════════════════════════════════════════════════════════

# At this point, run the dev server and check everything:

npm run dev

# Open browser:
# http://localhost:3000                → Landing page
# http://localhost:3000/compounds      → Explorer with 10 compounds
# http://localhost:3000/compounds/creatine-monohydrate  → Detail page

# If something is broken, paste the error into Claude Code:
# "I'm getting this error on the compounds page: [paste error]"
# Claude Code will fix it.


# ══════════════════════════════════════════════════════════════
# PHASE 4: RESEARCH PIPELINE INTEGRATION (Claude Code prompts)
# ══════════════════════════════════════════════════════════════

# ──────────────────────────────────────────────────────────────
# PROMPT 4.1 — Run the research pipeline and wire it to the DB
# ──────────────────────────────────────────────────────────────

<<PROMPT
The Python research pipeline in packages/research-ingestion/ has PubMed
and Semantic Scholar clients, a scoring algorithm, and an ingestion
orchestrator. But it currently just prints results — it doesn't write
to the database.

Update packages/research-ingestion/src/ingest.py to:

1. After collecting studies for a compound, write them to PostgreSQL:
   - Upsert Study records (dedup on PMID or DOI)
   - Create CompoundStudy join records
   - Classify and store study_type and evidence_level
   - Update the Compound's evidence_score, safety_score,
     study_count, meta_analysis_count, and last_research_sync

2. Use psycopg2 to connect directly to Postgres (connection string from
   DATABASE_URL env var). Use parameterized queries for safety.

3. Add a --dry-run flag that shows what would be written without
   actually writing.

4. Add error handling: if one compound fails, log the error and
   continue to the next one.

5. Add a summary at the end showing which compounds were updated
   and their new scores.

Read the Prisma schema to understand the exact table names and columns
(Prisma uses the model names directly as table names with proper casing).

Then test it:
  cd packages/research-ingestion
  pip install -r requirements.txt
  python -m src.ingest --compound creatine-monohydrate --dry-run
PROMPT


# ──────────────────────────────────────────────────────────────
# PROMPT 4.2 — Create an API route to trigger ingestion
# ──────────────────────────────────────────────────────────────

<<PROMPT
Create a Next.js API route at app/api/cron/ingest/route.ts that:

1. Can be called via GET with a secret key for auth:
   GET /api/cron/ingest?key=CRON_SECRET&mode=incremental&since=7d

2. Spawns the Python ingestion script as a child process
3. Streams the output back as a response
4. Protected by a CRON_SECRET env variable

Also create a simple admin page at app/admin/ingest/page.tsx that:
- Has a button to trigger incremental ingestion
- Shows the output in a terminal-like display
- Protected by auth (must be logged in)

Add CRON_SECRET to .env.example.

This endpoint will eventually be called by Vercel Cron or GitHub Actions
on a weekly schedule.
PROMPT


# ══════════════════════════════════════════════════════════════
# PHASE 5: STACK BUILDER (Claude Code prompts)
# ══════════════════════════════════════════════════════════════

# ──────────────────────────────────────────────────────────────
# PROMPT 5.1 — Build the Stack Builder UI
# ──────────────────────────────────────────────────────────────

<<PROMPT
Build the Stack Builder at app/stacks/new/page.tsx.

This lets users create a compound stack (a protocol combining
multiple compounds with specific doses and timing).

Requirements:

1. COMPOUND PICKER
   - Search input that queries compounds (use tRPC)
   - Dropdown results showing name, category, evidence score
   - Click to add to stack

2. STACK CONFIGURATION
   - For each added compound, show a row with:
     - Compound name + evidence score badge
     - Dose input (number + unit dropdown: mg, IU, mcg, g)
     - Frequency dropdown (daily, 2x/day, 3x/week, M/W/F, weekly, etc.)
     - Start week / End week (for periodized stacks)
     - Notes field (optional)
     - Remove button
   - Drag to reorder (use @dnd-kit/core)

3. STACK METADATA
   - Stack name (required)
   - Goal dropdown (from StackGoal enum)
   - Duration in weeks
   - Description (textarea)
   - Public/private toggle

4. INTERACTION CHECKER
   - When 2+ compounds are added, check CompoundInteraction table
   - Show warnings inline: yellow for caution, red for contraindicated
   - Show synergies in green

5. COMPOSITE EVIDENCE SCORE
   - Real-time calculated from added compounds
   - Show as a summary card at the bottom

6. SAVE BUTTON
   - Requires auth (redirect to login if not authenticated)
   - Creates Stack + StackCompound records via tRPC mutation
   - Redirects to stack detail page after save

Create the tRPC router for stacks (lib/trpc/routers/stack.ts) with:
- stack.search (compound search for picker)
- stack.create (create stack with compounds)
- stack.getBySlug (detail page)
- stack.list (gallery with filters)

Install @dnd-kit/core and @dnd-kit/sortable.
PROMPT


# ──────────────────────────────────────────────────────────────
# PROMPT 5.2 — Build the Stack Gallery page
# ──────────────────────────────────────────────────────────────

<<PROMPT
Build the Stack Gallery at app/stacks/page.tsx.

Shows all public stacks, filterable by goal.

1. Grid of StackCards showing:
   - Stack name, goal badge, duration
   - Compound count, composite evidence score
   - Creator name (or "Anonymous")
   - Upvote count, fork count
   - Compound pills (small tags showing first 4-5 compounds)

2. Filter bar:
   - Goal filter (tabs or dropdown for each StackGoal)
   - Sort: most upvoted, newest, highest evidence score

3. Create a Stack Detail page at app/stacks/[slug]/page.tsx:
   - Full stack info with all compounds in a table
   - Evidence breakdown
   - Interaction warnings
   - "Fork this stack" button (copies to new stack for editing)
   - "Start Cycle" button (creates a Cycle from this stack)

Use server components for initial data, client components for
interactive elements.
PROMPT


# ══════════════════════════════════════════════════════════════
# PHASE 6: CYCLE TRACKER (Claude Code prompts)
# ══════════════════════════════════════════════════════════════

# ──────────────────────────────────────────────────────────────
# PROMPT 6.1 — Build the Cycle Tracker
# ──────────────────────────────────────────────────────────────

<<PROMPT
Build the Cycle Tracker at app/cycles/page.tsx and related pages.

This is a personal tracking tool for users running compound protocols.

1. CYCLE LIST (app/cycles/page.tsx)
   - Shows user's cycles: active, planned, completed
   - Status badges (green=active, blue=planned, gray=completed, red=aborted)
   - Quick stats: days into cycle, compounds active, last log date
   - "New Cycle" button

2. NEW CYCLE (app/cycles/new/page.tsx)
   - Option to create from a stack OR freeform
   - If from stack: pre-populate compounds from the stack
   - Name, start date, expected end date
   - Add/remove compounds with dosing

3. CYCLE DETAIL (app/cycles/[id]/page.tsx)
   - Header: cycle name, status, date range, days remaining
   - TODAY'S LOG card (prominently displayed):
     - Checkboxes for each compound taken today
     - Quick metrics: weight, resting HR, mood/energy/libido sliders (1-10)
     - Sleep hours
     - Symptoms multi-select (tags)
     - Notes textarea
     - "Log Today" submit button
   - PROGRESS CHARTS (recharts):
     - Weight over time (line chart)
     - Mood/Energy/Libido over time (multi-line)
     - Resting HR over time
     - Symptom frequency heatmap or bar chart
   - BLOODWORK section:
     - "Add Bloodwork" button → modal/form with common lab values
     - Bloodwork timeline showing panels with key values
     - Trend charts for: total test, free test, estradiol, hematocrit,
       ALT, AST, HDL, LDL, triglycerides
   - LOG HISTORY:
     - Scrollable list of past daily entries
     - Click to expand/edit

4. Create tRPC router (lib/trpc/routers/cycle.ts):
   - cycle.list (user's cycles)
   - cycle.create
   - cycle.getById
   - cycle.addEntry (daily log)
   - cycle.addBloodwork
   - cycle.updateStatus

Make the daily logging flow as frictionless as possible — it should take
under 30 seconds to log a day. Use large touch targets and smart defaults.
PROMPT


# ══════════════════════════════════════════════════════════════
# PHASE 7: LANDING PAGE + POLISH (Claude Code prompts)
# ══════════════════════════════════════════════════════════════

# ──────────────────────────────────────────────────────────────
# PROMPT 7.1 — Build the landing page
# ──────────────────────────────────────────────────────────────

<<PROMPT
Build a compelling landing page at app/page.tsx.

This is what people see when they first visit CompoundAtlas.
It should communicate the value prop instantly.

Sections:

1. HERO
   - Headline: "Evidence-Based Enhancement, Open Source"
   - Subhead: "Browse compounds, build stacks, track cycles — backed by
     real research from PubMed and Semantic Scholar. Free forever."
   - CTA buttons: "Explore Compounds" → /compounds, "View on GitHub" → repo
   - Visual: A stylized compound evidence card (use real data from DB)

2. WHAT IS THIS
   - 4-column feature grid:
     - Research-Backed: Evidence scores from real studies
     - Stack Builder: Combine compounds into goal-driven protocols
     - Cycle Tracker: Log doses, bloodwork, and progress
     - Open Source: Community-driven, no paywalls

3. EVIDENCE SCORING EXPLAINED
   - Visual breakdown of the 6-factor scoring system
   - Show an example compound with its score breakdown

4. POPULAR COMPOUNDS
   - Top 6 compounds by evidence score (fetched from DB)
   - CompoundCard components, links to detail pages

5. POPULAR STACKS
   - Top 3 public stacks by upvotes
   - StackCard components

6. OPEN SOURCE CTA
   - "Built by the community, for the community"
   - GitHub stats (stars, contributors — can be static for now)
   - "Contribute a compound" → link to GitHub compound-data dir

Design: Modern, dark-mode default, data-focused aesthetic.
Think Linear/Vercel marketing vibes but for a research platform.
No stock photos. Use data visualizations and compound cards as the visuals.
PROMPT


# ──────────────────────────────────────────────────────────────
# PROMPT 7.2 — Navigation, theme, and responsive polish
# ──────────────────────────────────────────────────────────────

<<PROMPT
Add global navigation and polish the app:

1. NAVBAR (components/layout/Navbar.tsx)
   - Logo: "CompoundAtlas" text mark
   - Nav links: Compounds, Stacks, Cycles (if logged in), Research
   - Right side: Search (opens command palette), User avatar/login button
   - Mobile: hamburger menu
   - Sticky on scroll

2. COMMAND PALETTE (Cmd+K)
   - Global search across compounds, stacks
   - Use cmdk package (https://cmdk.paco.me/)
   - Recent searches, quick navigate

3. FOOTER
   - Links: GitHub, API Docs (placeholder), Contributing
   - "Data sourced from PubMed and Semantic Scholar"
   - MIT License badge

4. DARK/LIGHT MODE TOGGLE
   - Use next-themes
   - Default to system preference
   - Toggle in navbar

5. RESPONSIVE AUDIT
   - Ensure all pages work on mobile (375px width)
   - Compound explorer: single column on mobile
   - Cycle tracker: stack the charts vertically
   - Stack builder: simplified mobile layout

Install cmdk and next-themes.
PROMPT


# ══════════════════════════════════════════════════════════════
# PHASE 8: DEPLOY + OPEN SOURCE (manual steps)
# ══════════════════════════════════════════════════════════════

# Step 8.1 — Push to GitHub
git init
git add .
git commit -m "feat: initial CompoundAtlas scaffolding"
git remote add origin https://github.com/YOUR_USERNAME/compound-atlas.git
git push -u origin main

# Step 8.2 — Deploy database (choose one):
#
# Option A: Railway (recommended, free tier)
#   → https://railway.app
#   → New Project → Provision PostgreSQL
#   → Copy the DATABASE_URL
#
# Option B: Neon (serverless Postgres, generous free tier)
#   → https://neon.tech
#   → Create database → Copy connection string
#
# Option C: Supabase (Postgres + extras)
#   → https://supabase.com
#   → New project → Settings → Database → Connection string

# Step 8.3 — Deploy to Vercel
#   → https://vercel.com/new
#   → Import your GitHub repo
#   → Set environment variables from .env
#   → Framework: Next.js (auto-detected)
#   → Build command: cd apps/web && npx prisma generate && next build
#   → Root directory: apps/web
#   → Deploy

# Step 8.4 — Set up Vercel Cron for weekly research ingestion
# Add to apps/web/vercel.json:
# {
#   "crons": [{
#     "path": "/api/cron/ingest?mode=incremental&since=7d",
#     "schedule": "0 3 * * 0"
#   }]
# }

# Step 8.5 — Run initial full ingestion
cd packages/research-ingestion
python -m src.ingest --full
# This will take a while (10 compounds × PubMed + S2 queries)
# Watch the terminal for progress


# ══════════════════════════════════════════════════════════════
# PHASE 9: ONGOING DEVELOPMENT (future Claude Code prompts)
# ══════════════════════════════════════════════════════════════

# These are the prompts you'd use for subsequent features:

# --- Research Feed ---
# "Build a research feed at /research that shows the latest studies
#  auto-pulled for compounds the user follows. Include a 'follow'
#  button on each compound detail page. Show studies in reverse
#  chronological order with study type badges and PubMed links."

# --- Export/PDF ---
# "Add PDF export to the cycle tracker. When a user clicks 'Export Cycle',
#  generate a PDF with: cycle summary, compound table with doses,
#  all logged entries, bloodwork charts, and progress charts. Use
#  @react-pdf/renderer."

# --- More Compounds ---
# "Add 20 more compound YAML files covering these categories:
#  - Peptides: TB-500, CJC-1295, Ipamorelin, GHK-Cu, Tesamorelin
#  - Nootropics: Piracetam, Phenylpiracetam, Noopept, Bacopa, NALT
#  - Supplements: Fish Oil, Vitamin D3, Zinc, CoQ10, Berberine
#  - Fat Loss: L-Carnitine, Yohimbine, Caffeine, Green Tea Extract
#  - Adaptogens: Rhodiola, Tongkat Ali"

# --- Community Features ---
# "Add upvoting to stacks (one vote per user per stack).
#  Add a 'fork stack' feature that clones a public stack
#  into the user's account for editing. Track fork count
#  on the original stack."

# --- API Documentation ---
# "Create API docs at /docs using Fumadocs or Nextra.
#  Document all tRPC endpoints, the evidence scoring algorithm,
#  the data model, and how to contribute compound data."
