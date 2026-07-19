import db from "./db";

export interface Deck {
  id: number;
  name: string;
  source: string | null;
  created_at: string;
  card_count: number;
}

export interface DeckCardRow {
  scryfall_id: string;
  name: string;
  set_code: string;
  set_name: string;
  collector_number: string;
  type_line: string | null;
  mana_cost: string | null;
  finishes: string;
  image_normal: string | null;
  image_large: string | null;
  price_usd: number | null;
  price_usd_foil: number | null;
  quantity: number;
  foil_quantity: number;
  category: string | null;
  board: string;
}

export function listDecks(): Deck[] {
  return db
    .prepare(
      `SELECT d.id, d.name, d.source, d.created_at,
              COALESCE(SUM(dc.quantity + dc.foil_quantity), 0) AS card_count
       FROM decks d
       LEFT JOIN deck_cards dc ON dc.deck_id = d.id
       GROUP BY d.id
       ORDER BY d.created_at DESC`
    )
    .all() as Deck[];
}

export function getDeck(id: number): Deck | undefined {
  return db
    .prepare(
      `SELECT d.id, d.name, d.source, d.created_at,
              COALESCE(SUM(dc.quantity + dc.foil_quantity), 0) AS card_count
       FROM decks d
       LEFT JOIN deck_cards dc ON dc.deck_id = d.id
       WHERE d.id = ?
       GROUP BY d.id`
    )
    .get(id) as Deck | undefined;
}

export function getDeckCards(id: number): DeckCardRow[] {
  return db
    .prepare(
      `SELECT c.scryfall_id, c.name, c.set_code, c.set_name, c.collector_number,
              c.type_line, c.mana_cost, c.finishes, c.image_normal, c.image_large,
              c.price_usd, c.price_usd_foil,
              dc.quantity, dc.foil_quantity, dc.category, dc.board
       FROM deck_cards dc
       JOIN cards c ON c.scryfall_id = dc.scryfall_id
       WHERE dc.deck_id = ?
       ORDER BY c.name`
    )
    .all(id) as DeckCardRow[];
}

const TYPE_CATEGORY_ORDER = [
  "Creature",
  "Planeswalker",
  "Battle",
  "Instant",
  "Sorcery",
  "Artifact",
  "Enchantment",
  "Land",
] as const;

export function categoryFor(card: DeckCardRow): string {
  if (card.category) return card.category;
  const typeLine = card.type_line ?? "";
  for (const type of TYPE_CATEGORY_ORDER) {
    if (typeLine.includes(type)) return type;
  }
  return "Other";
}

export function groupByCategory(cards: DeckCardRow[]): [string, DeckCardRow[]][] {
  const groups = new Map<string, DeckCardRow[]>();
  for (const card of cards) {
    const category = categoryFor(card);
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category)!.push(card);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

export function deckValueUsd(cards: DeckCardRow[]): number {
  return cards.reduce((total, card) => {
    const nonFoilValue = (card.price_usd ?? 0) * card.quantity;
    const foilValue = (card.price_usd_foil ?? card.price_usd ?? 0) * card.foil_quantity;
    return total + nonFoilValue + foilValue;
  }, 0);
}
