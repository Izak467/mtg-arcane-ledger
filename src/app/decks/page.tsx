import Link from "next/link";
import { listDecks } from "@/lib/decks";
import UploadDeckForm from "@/components/UploadDeckForm";

export const dynamic = "force-dynamic";

export default function DecksPage() {
  const decks = listDecks();

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Decks</h1>
        <p className="text-sm text-neutral-400">Your imported decks, ready to browse.</p>
      </div>

      <UploadDeckForm />

      {decks.length === 0 ? (
        <p className="text-sm text-neutral-500">No decks imported yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {decks.map((deck) => (
            <li key={deck.id}>
              <Link
                href={`/decks/${deck.id}`}
                className="block rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 transition hover:border-neutral-600"
              >
                <span className="font-medium">{deck.name}</span>
                <span className="block text-sm text-neutral-400">{deck.card_count} cards</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
