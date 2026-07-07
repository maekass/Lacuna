"use client";

import { useCallback, useState } from "react";

interface ImportResponse {
  ok: boolean;
  parsed?: number;
  skipped?: number;
  sync?: { inserted: number; updated: number; skipped: number };
  errors?: string[];
  error?: string;
}

/** Paste or upload CSV candidates into `lacuna_deals` staging. */
export default function CandidateImportPanel() {
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = useCallback(async () => {
    if (!csv.trim()) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/deals/candidates/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const body = await response.json() as ImportResponse;
      if (!response.ok || !body.ok) {
        setError(body.error ?? "Import failed.");
        return;
      }
      setResult(body);
    } catch {
      setError("Import request failed.");
    } finally {
      setBusy(false);
    }
  }, [csv]);

  const handleFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsv(typeof reader.result === "string" ? reader.result : "");
      setResult(null);
      setError(null);
    };
    reader.readAsText(file);
  }, []);

  return (
    <div className="rounded-xl border border-lacuna-lavender/40 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-lacuna-plum">
        Press / manual CSV import
      </h3>
      <p className="mt-1 text-sm text-lacuna-blue">
        Import human-curated candidates into the review queue. Template:{" "}
        <code className="text-xs">staging/deals_candidates.template.csv</code>
        {" "}— never auto-merges to verified JSON.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <label className="cursor-pointer rounded-md border border-lacuna-lavender/50 px-3 py-1.5 text-xs font-medium text-lacuna-plum hover:bg-lacuna-lavender/20">
          Choose CSV file
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={handleFile}
          />
        </label>
        <button
          type="button"
          onClick={() => void handleImport()}
          disabled={busy || !csv.trim()}
          className="rounded-md bg-lacuna-plum px-3 py-1.5 text-xs font-medium text-white hover:bg-lacuna-plum/90 disabled:opacity-50"
        >
          {busy ? "Importing…" : "Import to staging"}
        </button>
      </div>

      <textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        placeholder="Paste CSV rows (header row optional)…"
        rows={5}
        className="mt-3 w-full rounded-lg border border-lacuna-lavender/40 px-3 py-2 font-mono text-xs text-lacuna-plum"
      />

      {error
        ? (
          <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )
        : null}

      {result?.ok
        ? (
          <p className="mt-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
            Imported {result.parsed ?? 0} row(s) — inserted{" "}
            {result.sync?.inserted ?? 0}, updated {result.sync?.updated ?? 0}.
            Refresh the review queue below.
          </p>
        )
        : null}
    </div>
  );
}
