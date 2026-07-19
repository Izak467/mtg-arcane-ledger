import db from "./db";

const SCRYFALL_API = "https://api.scryfall.com";
const BATCH_SIZE = 75;

export type ScryfallIdentifier =
  | { id: string }
  | { set: string; collector_number: string }
  | { name: string; set?: string };

interface ScryfallImageUris {
  small?: string;
  normal?: string;
  large?: string;
  art_crop?: string;
}

interface ScryfallCardFace {
  image_uris?: ScryfallImageUris;
}

export interface ScryfallCard {
  id: string;
  oracle_id?: string;
  name: string;
  set: string;
  set_name: string;
  collector_number: string;
  lang: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  colors?: string[];
  color_identity?: string[];
  finishes?: string[];
  rarity?: string;
  image_uris?: ScryfallImageUris;
  card_faces?: ScryfallCardFace[];
  prices: {
    usd?: string | null;
    usd_foil?: string | null;
    usd_etched?: string | null;
    eur?: string | null;
    eur_foil?: string | null;
  };
}

interface CollectionResponse {
  data: ScryfallCard[];
  not_found: ScryfallIdentifier[];
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Resolves a batch of card identifiers against Scryfall's /cards/collection endpoint. */
export async function fetchCardsByIdentifiers(
  identifiers: ScryfallIdentifier[]
): Promise<{ cards: ScryfallCard[]; notFound: ScryfallIdentifier[] }> {
  const cards: ScryfallCard[] = [];
  const notFound: ScryfallIdentifier[] = [];

  for (const batch of chunk(identifiers, BATCH_SIZE)) {
    const res = await fetch(`${SCRYFALL_API}/cards/collection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifiers: batch }),
    });

    if (!res.ok) {
      throw new Error(`Scryfall collection lookup failed: ${res.status} ${await res.text()}`);
    }

    const json = (await res.json()) as CollectionResponse;
    cards.push(...json.data);
    notFound.push(...(json.not_found ?? []));

    // Be polite to Scryfall's rate limit between batches.
    await sleep(100);
  }

  return { cards, notFound };
}

function cardImages(card: ScryfallCard): ScryfallImageUris {
  return card.image_uris ?? card.card_faces?.[0]?.image_uris ?? {};
}

function toNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

const upsertCardStmt = db.prepare(`
  INSERT INTO cards (
    scryfall_id, oracle_id, name, set_code, set_name, collector_number, lang,
    mana_cost, type_line, oracle_text, colors, color_identity, finishes, rarity,
    image_small, image_normal, image_large, image_art_crop,
    price_usd, price_usd_foil, price_usd_etched, price_eur, price_eur_foil, updated_at
  ) VALUES (
    @scryfall_id, @oracle_id, @name, @set_code, @set_name, @collector_number, @lang,
    @mana_cost, @type_line, @oracle_text, @colors, @color_identity, @finishes, @rarity,
    @image_small, @image_normal, @image_large, @image_art_crop,
    @price_usd, @price_usd_foil, @price_usd_etched, @price_eur, @price_eur_foil, @updated_at
  )
  ON CONFLICT(scryfall_id) DO UPDATE SET
    oracle_id=excluded.oracle_id, name=excluded.name, set_code=excluded.set_code,
    set_name=excluded.set_name, collector_number=excluded.collector_number, lang=excluded.lang,
    mana_cost=excluded.mana_cost, type_line=excluded.type_line, oracle_text=excluded.oracle_text,
    colors=excluded.colors, color_identity=excluded.color_identity, finishes=excluded.finishes,
    rarity=excluded.rarity, image_small=excluded.image_small, image_normal=excluded.image_normal,
    image_large=excluded.image_large, image_art_crop=excluded.image_art_crop,
    price_usd=excluded.price_usd, price_usd_foil=excluded.price_usd_foil,
    price_usd_etched=excluded.price_usd_etched, price_eur=excluded.price_eur,
    price_eur_foil=excluded.price_eur_foil, updated_at=excluded.updated_at
`);

/** Caches resolved Scryfall cards into the local database. */
export function cacheCards(cards: ScryfallCard[]) {
  const images = cards.map((card) => cardImages(card));
  const now = new Date().toISOString();

  const insertMany = db.transaction((rows: ScryfallCard[]) => {
    rows.forEach((card, i) => {
      upsertCardStmt.run({
        scryfall_id: card.id,
        oracle_id: card.oracle_id ?? null,
        name: card.name,
        set_code: card.set,
        set_name: card.set_name,
        collector_number: card.collector_number,
        lang: card.lang,
        mana_cost: card.mana_cost ?? null,
        type_line: card.type_line ?? null,
        oracle_text: card.oracle_text ?? null,
        colors: JSON.stringify(card.colors ?? []),
        color_identity: JSON.stringify(card.color_identity ?? []),
        finishes: JSON.stringify(card.finishes ?? []),
        rarity: card.rarity ?? null,
        image_small: images[i].small ?? null,
        image_normal: images[i].normal ?? null,
        image_large: images[i].large ?? null,
        image_art_crop: images[i].art_crop ?? null,
        price_usd: toNumber(card.prices?.usd),
        price_usd_foil: toNumber(card.prices?.usd_foil),
        price_usd_etched: toNumber(card.prices?.usd_etched),
        price_eur: toNumber(card.prices?.eur),
        price_eur_foil: toNumber(card.prices?.eur_foil),
        updated_at: now,
      });
    });
  });

  insertMany(cards);
}

/** Resolves identifiers via Scryfall and caches them locally in one step. */
export async function resolveAndCacheCards(identifiers: ScryfallIdentifier[]) {
  const { cards, notFound } = await fetchCardsByIdentifiers(identifiers);
  cacheCards(cards);
  return { cards, notFound };
}
