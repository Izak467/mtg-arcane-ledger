"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function UploadDeckForm() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("uploading");
    setError(null);

    const formData = new FormData(event.currentTarget);
    const res = await fetch("/api/decks/import", { method: "POST", body: formData });
    const json = await res.json();

    if (!res.ok) {
      setStatus("error");
      setError(json.error ?? "Import failed");
      return;
    }

    setStatus("idle");
    event.currentTarget.reset();
    router.push(`/decks/${json.deckId}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4"
    >
      <h2 className="text-sm font-medium text-neutral-300">Import a deck</h2>
      <input
        name="name"
        type="text"
        placeholder="Deck name (optional)"
        className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
      />
      <input
        name="file"
        type="file"
        accept=".csv,.txt"
        required
        className="text-sm file:mr-3 file:rounded file:border-0 file:bg-neutral-700 file:px-3 file:py-1.5 file:text-sm file:text-neutral-100"
      />
      <button
        type="submit"
        disabled={status === "uploading"}
        className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {status === "uploading" ? "Importing…" : "Import Archidekt CSV"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
