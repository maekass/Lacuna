"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface ReviewAccessGateProps {
  onUnlocked?: () => void;
  className?: string;
}

interface SessionResponse {
  ok?: boolean;
  authenticated?: boolean;
  githubSignInAvailable?: boolean;
  actor?: { label: string; method: string };
  error?: string;
}

/** Production sign-in for deal-review APIs (GitHub OAuth primary, API key fallback). */
export default function ReviewAccessGate({
  onUnlocked,
  className = "",
}: ReviewAccessGateProps) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [githubAvailable, setGithubAvailable] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function probeSession() {
      try {
        const response = await fetch("/api/deals/review/session");
        const body = await response.json() as SessionResponse;
        if (cancelled) return;
        setGithubAvailable(body.githubSignInAvailable === true);
        if (body.authenticated) onUnlocked?.();
      } catch {
        // gate stays visible
      }
    }
    void probeSession();
    return () => {
      cancelled = true;
    };
  }, [onUnlocked]);

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
      const body = await response.json() as SessionResponse;
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
        Sign in with an allowlisted GitHub account, or use an API key for
        automation. Sessions are signed — raw keys are not stored in cookies.
      </p>

      {githubAvailable
        ? (
          <Link
            href="/api/deals/review/github"
            className="mt-3 inline-flex min-h-9 items-center rounded-md bg-lacuna-plum px-4 text-xs font-medium text-white hover:bg-lacuna-plum/90"
          >
            Sign in with GitHub
          </Link>
        )
        : null}

      <button
        type="button"
        onClick={() => setShowApiKey((v) => !v)}
        className="mt-3 block text-xs font-medium text-lacuna-plum underline underline-offset-2"
      >
        {showApiKey ? "Hide API key sign-in" : "Use API key instead"}
      </button>

      {showApiKey
        ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="LACUNA_REVIEW_API_KEY"
              className="min-h-9 flex-1 rounded-md border border-amber-200 bg-white px-3 text-xs text-lacuna-plum"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => void handleUnlock()}
              disabled={busy || !token.trim()}
              className="min-h-9 rounded-md border border-lacuna-plum bg-white px-3 text-xs font-medium text-lacuna-plum disabled:opacity-50"
            >
              {busy ? "Unlocking…" : "Unlock"}
            </button>
          </div>
        )
        : null}

      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
