import { NextResponse } from "next/server";
import db from "@/lib/db";
import { parseArchidektCsv, toIdentifier, type ParsedDeckCard } from "@/lib/archidekt";
import { resolveAndCacheCards, type ScryfallCard, type ScryfallIdentifier } from "@/lib/scryfall";

function identifierKey(identifier: ScryfallIdentifier): string {
  if ("id" in identifier) return `id:${identifier.id}`;
  if ("collector_number" in identifier) {
    return `sc:${identifier.set.toLowerCase()}:${identifier.collector_number.toLowerCase()}`;
  }
  return `name:${identifier.name.toLowerCase()}`;
}

function cardKeys(card: ScryfallCard): string[] {
  return [
    `id:${card.id}`,
    `sc:${card.set.toLowerCase()}:${card.collector_number.toLowerCase()}`,
    `name:${card.name.toLowerCase()}`,
  ];
}

const insertDeck = db.prepare(
  `INSERT INTO decks (name, source, created_at) VALUES (?, ?, ?)`
);
const insertDeckCard = db.prepare(`
  INSERT INTO deck_cards (deck_id, scryfall_id, quantity, foil_quantity, category, board)
  VALUES (@deck_id, @scryfall_id, @quantity, @foil_quantity, @category, @board)
`);

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const deckName = (formData.get("name") as string | null)?.trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing deck file upload" }, { status: 400 });
  }

  const text = await file.text();
  const parsedCards: ParsedDeckCard[] = parseArchidektCsv(text);

  if (parsedCards.length === 0) {
    return NextResponse.json({ error: "No cards found in the uploaded file" }, { status: 400 });
  }

  const identifiers = parsedCards.map(toIdentifier);
  let cards, notFound;
  try {
    ({ cards, notFound } = await resolveAndCacheCards(identifiers));
  } catch {
    return NextResponse.json(
      { error: "Could not reach Scryfall to resolve card data. Check network access and try again." },
      { status: 502 }
    );
  }

  const byKey = new Map<string, ScryfallCard>();
  for (const card of cards) {
    for (const key of cardKeys(card)) byKey.set(key, card);
  }

  const deckId = insertDeck.run(
    deckName || file.name.replace(/\.[^.]+$/, ""),
    file.name,
    new Date().toISOString()
  ).lastInsertRowid as number;

  const insertMany = db.transaction((rows: ParsedDeckCard[]) => {
    for (const row of rows) {
      const key = identifierKey(toIdentifier(row));
      const card = byKey.get(key);
      if (!card) continue;
      insertDeckCard.run({
        deck_id: deckId,
        scryfall_id: card.id,
        quantity: row.quantity,
        foil_quantity: row.foilQuantity,
        category: row.category,
        board: row.board,
      });
    }
  });
  insertMany(parsedCards);

  return NextResponse.json({
    deckId,
    imported: parsedCards.length,
    resolved: cards.length,
    notFound: notFound.length,
  });
}
