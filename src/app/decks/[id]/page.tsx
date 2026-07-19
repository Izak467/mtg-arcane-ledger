import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deckValueUsd, getDeck, getDeckCards, groupByCategory } from "@/lib/decks";

export const dynamic = "force-dynamic";

export default async function DeckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deckId = Number(id);
  const deck = getDeck(deckId);
  if (!deck) notFound();

  const cards = getDeckCards(deckId);
  const groups = groupByCategory(cards);
  const totalValue = deckValueUsd(cards);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/decks" className="text-sm text-neutral-400 hover:text-neutral-200">
            ← All decks
          </Link>
          <h1 className="text-2xl font-semibold">{deck.name}</h1>
          <p className="text-sm text-neutral-400">
            {deck.card_count} cards · est. ${totalValue.toFixed(2)}
          </p>
        </div>
      </div>

      {groups.map(([category, groupCards]) => (
        <section key={category} className="flex flex-col gap-3">
          <h2 className="text-lg font-medium text-neutral-200">
            {category} <span className="text-sm text-neutral-500">({groupCards.length})</span>
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {groupCards.map((card) => {
              const isFoil = card.foil_quantity > 0;
              const price = isFoil ? card.price_usd_foil ?? card.price_usd : card.price_usd;
              return (
                <div
                  key={card.scryfall_id}
                  className="flex flex-col gap-1 rounded-lg border border-neutral-800 bg-neutral-900/40 p-2"
                >
                  {card.image_normal ? (
                    <Image
                      src={card.image_normal}
                      alt={card.name}
                      width={244}
                      height={340}
                      className="rounded-md"
                    />
                  ) : (
                    <div className="flex aspect-[244/340] items-center justify-center rounded-md bg-neutral-800 text-xs text-neutral-500">
                      No image
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span>
                      {card.quantity + card.foil_quantity}× {card.set_code.toUpperCase()}
                      {isFoil ? " ✦" : ""}
                    </span>
                    {price != null && <span>${price.toFixed(2)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
