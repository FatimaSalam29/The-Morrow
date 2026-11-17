# The Morrow

**A personal morning newspaper, printed for one reader.**

The Morrow gathers real stories from trusted newsrooms every morning, summarises each one strictly from the publisher's own text, and lays them out as a traditional broadsheet: a lead story, a front page and themed sections. Every like, save, read and skip teaches it what to put in tomorrow's paper.

Built for NaSCon '26.

---

## The problem

News apps are endless feeds: noisy, repetitive and tuned for time spent, not for being informed. Readers either drown in headlines or miss the stories they actually care about. The Morrow brings back the finite, curated morning paper, with one edition a day built around one person and grounded in real reporting.

## Key features

- **Accounts:** sign up with email and password or Google. Each reader's profile, preferences and history are private to them.
- **Guided onboarding:** a five-step setup covering the name on the masthead, sections (at least 2 of 16, including Pakistan), subjects or keywords to follow, paper length (6–20 stories) and summary style (brief, balanced, detailed), with a preview before the first edition.
- **Real news only:** stories come from about 25 public RSS feeds, including BBC, The Guardian, Al Jazeera, Dawn, Express Tribune, The Verge, Ars Technica and NASA. Nothing is invented, and every story links to its original article.
- **Faithful summaries:** stories are summarised only from their feed title and text, in the reader's chosen length, along with a short editor's note naming the day's headlines. If summarising fails, the paper still prints using the publisher's own text.
- **Personalised ranking:**
  - Stories are scored by followed sections, matching keywords, freshness, learned section and source affinity, and photos.
  - Sections are kept varied, each followed section gets a slot, and one slot is kept for a discovery outside the reader's usual sections.
  - Skipped stories and stories printed in earlier editions never come back.
  - Each story shows why it was picked.
- **Daily edition page:** a broadsheet layout with masthead, edition number, reading time and read progress. You can move between days, open stories in a reader view and reprint today's paper with the latest news.
- **PDF download:** an A4, three-column newspaper PDF with photographs and clickable source links.
- **Desk (dashboard):** reading stats, the sections and sources the paper has learned you prefer, and recent editions.
- **Archive:** every past edition, grouped by month and kept exactly as printed.
- **Explore:** search the full news wire by keyword, section and source, and refresh it on demand.
- **Saved:** your clipped stories.
- **Preferences:** edit sections, keywords, length and style, hide sources, or reset what the paper has learned.

## How it works

```text
RSS feeds ──► server fetch + parse ──► shared article cache (deduplicated by URL)
                                              │
reader profile + reading signals ──► ranking engine (src/lib/recommend.ts)
                                              │
                                  picked stories ──► AI summaries + editor's note
                                              │
                                  saved edition ──► newspaper page / PDF / archive
```

1. When a reader opens today's paper, the server works out which sections to fetch: followed sections, sections the reader has strongly engaged with, and one rotating discovery section.
2. Fresh items are pulled from each section's feeds, parsed and stored once in a shared cache.
3. The ranking engine scores the last four days of candidates against the reader's profile and every past interaction, then picks a varied edition.
4. Summaries are written for the picked stories, and the edition is saved so it stays the same when you come back to it.
5. Reading actions (read, like, save, skip) are stored as signals that change the next edition's ranking.

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | React 19, TanStack Start (SSR + server functions), TanStack Router & Query |
| Build | Vite 7, TypeScript |
| Styling | Tailwind CSS v4, Radix UI primitives, lucide icons |
| Database & auth | PostgreSQL with row-level security (Supabase), email + Google sign-in |
| News | Public RSS/Atom feeds parsed with `fast-xml-parser` |
| Summaries | Large language model via an AI gateway (structured JSON output) |
| PDF | jsPDF (generated in the browser) |
| Tests | Vitest |

### Data model

- `profiles`: name, sections, keywords, paper length, summary style, hidden sources, onboarding state
- `articles`: shared cache of fetched stories and their summaries
- `editions`: one per reader per day, with edition number and editor's note
- `edition_articles`: the stories in each edition, with position, section, score and reason
- `article_interactions`: read / like / save / skip signals

Each reader can only see their own profile, editions and interactions, which is enforced by row-level security.

## Getting started

### Prerequisites

- [Bun](https://bun.sh) 1.x (or Node.js 20+ with npm)
- A Supabase-compatible Postgres backend with the schema in `drizzle/migrations/0000_migration.sql` applied
- An API key for the AI gateway used for summaries

### Setup

```sh
git clone <this-repository-url>
cd <repository-folder>
bun install
cp .env.example .env   # then fill in your values
bun run dev            # http://localhost:8080
```

### Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | browser | Backend URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser | Public (publishable) key |
| `VITE_SUPABASE_PROJECT_ID` | browser | Project id |
| `SUPABASE_URL` | server | Backend URL for server functions |
| `SUPABASE_PUBLISHABLE_KEY` | server | Public key for server functions |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Writes the shared article cache. Keep it secret |
| `LOVABLE_API_KEY` | server | AI gateway key for summaries. Keep it secret |

No news API keys are needed, because all sources are free public feeds.

### Scripts

```sh
bun run dev        # start the dev server
bun run build      # production build
bun run test       # run unit tests (ranking engine + routing)
bun run lint       # lint
```

## Project structure

```text
src/
  routes/                 pages (landing, auth, and signed-in pages under _authenticated/)
    _authenticated/       onboarding, paper/$date, dashboard, explore, saved, archive, settings
  components/paper/       masthead, story layouts, reader view, app shell
  lib/
    feeds.ts              sections and their RSS sources
    rss.ts                RSS/Atom parser
    recommend.ts          ranking engine (pure, unit-tested)
    news.server.ts        fetching, caching and summarising (server only)
    news.functions.ts     server functions: build edition, refresh wire, PDF images
    pdf.ts                broadsheet PDF generator
drizzle/migrations/       database schema and access policies
```

## Notes

- Summaries are written only from the text each publisher puts in its feed. Follow the links to read the full reporting.
- Editions are kept once printed. "Reprint with latest news" rebuilds today's edition only.
