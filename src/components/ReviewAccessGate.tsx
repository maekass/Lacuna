"use client";

import { useCallback, useState } from "react";

interface ReviewAccessGateProps {
  onUnlocked?: () => void;
  className?: string;
}

/** Unlock deal-review APIs in production via session cookie. */
export default function ReviewAccessGate({
  onUnlocked,
  className = "",
}: ReviewAccessGateProps) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnlock = useCallback(async () => {
    if (!token.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/deals/review/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const body = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) {
        setError(body.error ?? "Invalid review key.");
        return;
      }
      setToken("");
      onUnlocked?.();
    } catch {
      setError("Could not unlock review tools.");
    } finally {
      setBusy(false);
    }
  }, [token, onUnlocked]);

  return (
    <div
      className={`rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 ${className}`}
    >
      <p className="text-sm font-medium text-amber-950">
        Review tools require authentication in production
      </p>
      <p className="mt-1 text-xs text-amber-900/80">
        Enter your <code className="text-[11px]">LACUNA_REVIEW_API_KEY</code> or
        {" "}
        <code className="text-[11px]">CRON_SECRET</code>{" "}
        to unlock the staging queue, CSV import, and funding panel for this
        browser session.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Review API key"
          className="min-h-9 flex-1 rounded-md border border-amber-200 bg-white px-3 text-xs text-lacuna-plum"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => void handleUnlock()}
          disabled={busy || !token.trim()}
          className="min-h-9 rounded-md bg-lacuna-plum px-3 text-xs font-medium text-white hover:bg-lacuna-plum/90 disabled:opacity-50"
        >
          {busy ? "Unlocking…" : "Unlock"}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
