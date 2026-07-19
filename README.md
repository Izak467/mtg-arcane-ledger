# Arcane Ledger

A personal Magic: The Gathering collection and deck-tracking web app: import decks, browse
them with real card art (exact set/printing/foil), and see estimated value. Card data and
prices are pulled from the [Scryfall API](https://scryfall.com/docs/api); decks are imported
from [Archidekt](https://archidekt.com) CSV exports.

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind CSS)
- SQLite via `better-sqlite3`, stored locally at `data/arcane-ledger.db` (gitignored)
- No auth — this is meant to be self-hosted for a single user

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to `/decks`.

### Network access

This app calls `https://api.scryfall.com` at import time to resolve card data, and renders
card images served from `https://cards.scryfall.io`. If you're running this inside a sandboxed
environment with an egress allowlist (e.g. Claude Code on the web), add both hosts to that
allowlist or deck imports will fail with a network error.

### Importing a deck

On `/decks`, upload an Archidekt CSV export (deck or collection). The importer is tolerant of
the columns Archidekt includes (they vary by export options) but expects at least a card name,
and ideally a `scryfall_uuid` column for exact-printing matches. Rows without a `scryfall_uuid`
fall back to `set_code` + `collector_number`, then to card name.

Cards are grouped in the deck view by an Archidekt `category`/`tags` column if present,
otherwise by a coarse type (`Creature`, `Instant`, `Land`, etc.) derived from the card's type line.

## Project structure

- `src/lib/db.ts` — SQLite schema and connection (`cards`, `decks`, `deck_cards`)
- `src/lib/scryfall.ts` — batched Scryfall lookups (`/cards/collection`) with local caching
- `src/lib/archidekt.ts` — Archidekt CSV parsing
- `src/lib/decks.ts` — deck/card query and grouping helpers
- `src/app/decks` — deck list + deck viewer pages
- `src/app/api/decks/import` — CSV upload endpoint

## Roadmap

Collection management (beyond single decks), price history tracking, and ability/oracle-text
search (`o:"draw a card"` style queries against your own collection) are planned next.
