import { parse } from "csv-parse/sync";
import type { ScryfallIdentifier } from "./scryfall";

export interface ParsedDeckCard {
  scryfallId: string | null;
  setCode: string | null;
  collectorNumber: string | null;
  name: string;
  quantity: number;
  foilQuantity: number;
  category: string | null;
  board: string;
}

// Archidekt CSV exports vary depending on which columns the user selected,
// so headers are matched case-insensitively against several known aliases
// rather than assuming a fixed column order.
const HEADER_ALIASES: Record<keyof Omit<ParsedDeckCard, "quantity" | "foilQuantity">, string[]> = {
  scryfallId: ["scryfall_uuid", "scryfallid", "scryfall id"],
  setCode: ["set_code", "edition code", "set"],
  collectorNumber: ["collector_number", "collector number"],
  name: ["card_name", "name", "english_card_name"],
  category: ["category", "categories", "tags"],
  board: ["board", "deck section"],
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function findColumn(headers: string[], aliases: string[]): string | null {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias);
    if (idx !== -1) return headers[idx];
  }
  return null;
}

function toInt(value: string | undefined, fallback = 0): number {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}

/**
 * Parses an Archidekt deck/collection CSV export (semicolon-delimited).
 * Falls back to comma delimiting if no semicolons are present, since
 * Archidekt has changed its export delimiter across versions.
 */
export function parseArchidektCsv(text: string): ParsedDeckCard[] {
  const delimiter = text.split("\n")[0]?.includes(";") ? ";" : ",";

  const rows: Record<string, string>[] = parse(text, {
    columns: true,
    delimiter,
    skip_empty_lines: true,
    trim: true,
  });

  if (rows.length === 0) return [];

  const headers = Object.keys(rows[0]);
  const cols = {
    scryfallId: findColumn(headers, HEADER_ALIASES.scryfallId),
    setCode: findColumn(headers, HEADER_ALIASES.setCode),
    collectorNumber: findColumn(headers, HEADER_ALIASES.collectorNumber),
    name: findColumn(headers, HEADER_ALIASES.name),
    category: findColumn(headers, HEADER_ALIASES.category),
    board: findColumn(headers, HEADER_ALIASES.board),
  };

  const quantityCol = findColumn(headers, ["quantity", "qty"]);
  const foilQuantityCol = findColumn(headers, ["foil_quantity", "foil quantity", "foil"]);

  return rows
    .filter((row) => (cols.name ? row[cols.name] : Object.values(row)[0]))
    .map((row) => ({
      scryfallId: cols.scryfallId ? row[cols.scryfallId] || null : null,
      setCode: cols.setCode ? row[cols.setCode] || null : null,
      collectorNumber: cols.collectorNumber ? row[cols.collectorNumber] || null : null,
      name: cols.name ? row[cols.name] : Object.values(row)[0],
      quantity: toInt(quantityCol ? row[quantityCol] : undefined, 1),
      foilQuantity: toInt(foilQuantityCol ? row[foilQuantityCol] : undefined, 0),
      category: cols.category ? row[cols.category] || null : null,
      board: cols.board ? row[cols.board] || "main" : "main",
    }));
}

export function toIdentifier(card: ParsedDeckCard): ScryfallIdentifier {
  if (card.scryfallId) return { id: card.scryfallId };
  if (card.setCode && card.collectorNumber) {
    return { set: card.setCode.toLowerCase(), collector_number: card.collectorNumber };
  }
  return { name: card.name };
}
