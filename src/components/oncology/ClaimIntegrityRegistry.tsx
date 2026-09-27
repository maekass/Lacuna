"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ReviewAccessGate from "@/components/ReviewAccessGate";
import {
  CLASSIFICATION_LABELS,
  REVIEW_STATUS_LABELS,
  SOURCE_TYPE_LABELS,
} from "@/lib/oncology/claimIntegrity/labels";
import {
  CLAIM_INTEGRITY_DISCLOSURE,
  type OncologyClaim,
} from "@/lib/oncology/claimIntegrity/types";

export default function ClaimIntegrityRegistry() {
  const [ready, setReady] = useState(false);
  const [claims, setClaims] = useState<OncologyClaim[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [reviewStatus, setReviewStatus] = useState("");
  const [classification, setClassification] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [claimDateFrom, setClaimDateFrom] = useState("");
  const [evidenceCutoffTo, setEvidenceCutoffTo] = useState("");

  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (reviewStatus) params.set("reviewStatus", reviewStatus);
    if (classification) params.set("classification", classification);
    if (sourceType) params.set("sourceType", sourceType);
    if (claimDateFrom) params.set("claimDateFrom", claimDateFrom);
    if (evidenceCutoffTo) params.set("evidenceCutoffTo", evidenceCutoffTo);
    const query = params.toString();
    fetch(`/api/research/oncology/claims${query ? `?${query}` : ""}`)
      .then((response) => {
        if (!response.ok) throw new Error("The registry could not be loaded.");
        return response.json() as Promise<{ claims: OncologyClaim[] }>;
      })
      .then((body) => {
        setClaims(body.claims);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Load failed");
      });
  }, [
    ready,
    q,
    reviewStatus,
    classification,
    sourceType,
    claimDateFrom,
    evidenceCutoffTo,
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-lacuna-blue">
        Evidence consistency
      </p>
      <h1 className="mt-1 text-3xl font-bold text-lacuna-plum">
        Oncology Claim-Integrity Monitor
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-lacuna-blue">
        {CLAIM_INTEGRITY_DISCLOSURE}
      </p>
      <ReviewAccessGate onUnlocked={() => setReady(true)} className="mt-6" />
      {ready && (
        <>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/research/oncology/claim-integrity/new"
              className="rounded-md bg-lacuna-plum px-3 py-2 text-sm text-white"
            >
              Record a claim
            </Link>
            <p className="text-sm text-lacuna-blue">
              Methodology: docs/ONCOLOGY_CLAIM_INTEGRITY.md
            </p>
          </div>
          <form className="mt-6 grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-lacuna-blue">
              Search company, asset, indication, biomarker
              <input
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                value={q}
                onChange={(event) => setQ(event.target.value)}
              />
            </label>
            <label className="text-xs text-lacuna-blue">
              Review status
              <select
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                value={reviewStatus}
                onChange={(event) => setReviewStatus(event.target.value)}
              >
                <option value="">Any</option>
                {Object.entries(REVIEW_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-lacuna-blue">
              Classification
              <select
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                value={classification}
                onChange={(event) => setClassification(event.target.value)}
              >
                <option value="">Any</option>
                {Object.entries(CLASSIFICATION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-lacuna-blue">
              Source type
              <select
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                value={sourceType}
                onChange={(event) => setSourceType(event.target.value)}
              >
                <option value="">Any</option>
                {Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-lacuna-blue">
              Claim date from
              <input
                type="date"
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                value={claimDateFrom}
                onChange={(event) => setClaimDateFrom(event.target.value)}
              />
            </label>
            <label className="text-xs text-lacuna-blue">
              Evidence cutoff through
              <input
                type="date"
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                value={evidenceCutoffTo}
                onChange={(event) => setEvidenceCutoffTo(event.target.value)}
              />
            </label>
          </form>
          {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
          <ul className="mt-6 space-y-3">
            {claims.length === 0 && (
              <li className="text-sm text-lacuna-blue">
                No analyst records match these filters. The registry starts
                empty.
              </li>
            )}
            {claims.map((claim) => (
              <li
                key={claim.id}
                className="rounded-lg border border-lacuna-lavender/40 bg-white p-4"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={claim.reviewStatus === "approved"
                      ? "rounded bg-emerald-100 px-2 py-0.5 text-emerald-900"
                      : "rounded bg-amber-100 px-2 py-0.5 text-amber-950"}
                  >
                    {REVIEW_STATUS_LABELS[claim.reviewStatus]}
                  </span>
                  <span>{CLASSIFICATION_LABELS[claim.classification]}</span>
                  <span>{claim.claimDate}</span>
                </div>
                <Link
                  href={`/research/oncology/claim-integrity/${claim.id}`}
                  className="mt-2 block font-medium text-lacuna-plum underline"
                >
                  {claim.exactClaim}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
