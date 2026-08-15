# Arcane Ledger — Project Handoff

Branch `claude/prior-conversation-continuation-emddj9` — all described work below is committed and pushed.

## What I'm building

A personal MTG landing page / web app (single-user, self-hosted, no login needed) that serves as:

- A **collection repository** — track everything I own
- **Price tracking** — current + historical value of cards/decks
- **Organization & statistics** — browse/sort by category, set, etc.
- **Smart search by ability** — find cards for a deck by querying oracle text/abilities, not just name
- **Interactive deck viewing** — upload decks, view them grouped by category
- **Exact-printing card images** — see the specific set/edition/foil version of a card, the way Archidekt shows it
- Later: Higgsfield for AI-generated art/branding (hero banner, theme art) once the functional app exists — not for the app framework itself

## Tech decisions already made

- **Next.js 16** (App Router, TypeScript, Tailwind), self-hosted, **no auth**
- **SQLite via `better-sqlite3`** (not Prisma — avoided to skip native engine binary downloads), local file at `data/arcane-ledger.db`
- **Scryfall API** for all card data: images per exact printing/foil, prices (usd/eur/tix), oracle-text search syntax (`o:"..."`) for the future ability-search feature. Free, no key, batch lookup via `/cards/collection` (75 ids/call)
- **Archidekt CSV export** as the deck-import format (semicolon-delimited, `scryfall_uuid` maps directly to Scryfall's card `id`)

## What's already built

- `src/lib/db.ts` — schema: `cards` (Scryfall cache), `decks`, `deck_cards` (qty, foil_qty, category, board)
- `src/lib/scryfall.ts` — batched Scryfall lookups + local caching
- `src/lib/archidekt.ts` — tolerant CSV parser (matches header aliases since Archidekt's exported columns vary; falls back scryfall_uuid → set+collector_number → name)
- `src/lib/decks.ts` — query/grouping helpers, deck value calculation
- `src/app/api/decks/import/route.ts` — upload endpoint
- `src/app/decks/page.tsx` + `src/app/decks/[id]/page.tsx` — deck list + interactive viewer grouped by category, showing real card art/foil/price
- Verified: build/typecheck/lint clean, full pipeline tested against mocked Scryfall data (parser → DB → grouping → value calc all correct)

## Known blocker → why moving to local/VS Code

The Claude Code on the web sandbox's network egress allowlist blocks `api.scryfall.com` and
`cards.scryfall.io`, so live imports can't be tested there. Continuing on a local machine with
Claude Code in VS Code (same account) instead, since it has unrestricted network access and lets
me actually click through `localhost:3000` as we build. See `README.md` for the specific hosts
to allowlist if returning to a sandboxed environment.

## Not yet built (the actual next-steps roadmap)

1. **Collection management** — full owned-card inventory beyond single decks (add/track quantities, bulk import, organization)
2. **Price tracking** — historical value snapshots over time, not just current price
3. **Smart ability search** — query collection/decks by oracle text/type/color using Scryfall-style syntax

## Open questions for the next chat to resolve before building

- **Scope order**: build all three roadmap items together as one coherent design, or one at a time?
- **Archidekt export verification**: a real Archidekt CSV export hasn't been sent yet. The
  importer's column-matching (`src/lib/archidekt.ts`) is currently based on researched guesses,
  not a verified real file — confirm actual column names (especially how categories/tags are
  exported) before relying on that feature.
