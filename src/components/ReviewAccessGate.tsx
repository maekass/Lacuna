"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { consumeReviewAuthErrorFromLocation } from "@/lib/infra/reviewAuthError";
import { reportWarning } from "@/lib/observability/reportError";

interface ReviewAccessGateProps {
  onUnlocked?: () => void;
  className?: string;
}

interface SessionActor {
  label: string;
  method: string;
}

interface SessionResponse {
  ok?: boolean;
  authenticated?: boolean;
  readOnly?: boolean;
  githubSignInAvailable?: boolean;
  actor?: SessionActor;
  error?: string;
}

type GateStatus = "loading" | "signed_in" | "signed_out";

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
  const [status, setStatus] = useState<GateStatus>("loading");
  const [actor, setActor] = useState<SessionActor | null>(null);
  const [readOnly, setReadOnly] = useState(false);

  const applySession = useCallback((body: SessionResponse) => {
    setGithubAvailable(body.githubSignInAvailable === true);
    setReadOnly(body.readOnly === true);
    if (body.authenticated) {
      setActor(body.actor ?? { label: "Reviewer", method: "github" });
      setStatus("signed_in");
      return;
    }
    setActor(null);
    setStatus("signed_out");
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function probeSession() {
      const oauthError = consumeReviewAuthErrorFromLocation();
      if (oauthError && !cancelled) setError(oauthError);
      try {
        const response = await fetch("/api/deals/review/session");
        if (!response.ok && response.status !== 401) {
          throw new Error(`Session probe failed: ${response.status}`);
        }
        const body = await response.json() as SessionResponse;
        if (cancelled) return;
        applySession(body);
      } catch (probeError) {
        if (cancelled) return;
        setStatus("signed_out");
        setError(
          `Could not check review session (${
            reportWarning("reviewGate.sessionProbe", probeError)
          }).`,
        );
      }
    }
    void probeSession();
    return () => {
      cancelled = true;
    };
  }, [applySession]);

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
      applySession(body);
      onUnlocked?.();
    } catch {
      setError("Could not unlock review tools.");
    } finally {
      setBusy(false);
    }
  }, [token, applySession, onUnlocked]);

  const handleSignOut = useCallback(async () => {
    setBusy(true);
    try {
      await fetch("/api/deals/review/session", { method: "DELETE" });
      setStatus("signed_out");
      setActor(null);
      setReadOnly(false);
      onUnlocked?.();
    } catch {
      setError("Could not sign out.");
    } finally {
      setBusy(false);
    }
  }, [onUnlocked]);

  if (status === "loading") {
    return (
      <p className={`text-xs text-lacuna-blue/70 ${className}`}>
        Checking review session…
      </p>
    );
  }

  if (status === "signed_in" && actor) {
    if (actor.method === "dev") {
      return null;
    }
    return (
      <div
        className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 ${className}`}
      >
        <p className="text-xs text-emerald-950">
          Signed in as <span className="font-medium">{actor.label}</span>
          {actor.method === "github" ? " via GitHub" : ""}
        </p>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={busy}
          className="text-xs font-medium text-lacuna-plum underline underline-offset-2 disabled:opacity-50"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 ${className}`}
    >
      <p className="text-sm font-medium text-amber-950">
        {readOnly
          ? "Demo review is read-only — sign in to approve or promote"
          : "Review tools require authentication in production"}
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
