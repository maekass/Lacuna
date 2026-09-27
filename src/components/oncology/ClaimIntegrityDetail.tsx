"use client";

import Link from "next/link";
import { useState } from "react";
import ReviewAccessGate from "@/components/ReviewAccessGate";
import {
  ClaimEvidenceForm,
  ClaimEvidenceList,
} from "@/components/oncology/ClaimEvidenceCards";
import {
  CLASSIFICATION_LABELS,
  RELATIONSHIP_LABELS,
  SOURCE_TYPE_LABELS,
} from "@/lib/oncology/claimIntegrity/labels";
import {
  CLAIM_INTEGRITY_DISCLOSURE,
  type ClaimRecord,
  type EvidenceRelationship,
} from "@/lib/oncology/claimIntegrity/types";

const GROUPS: EvidenceRelationship[] = [
  "supports",
  "contradicts",
  "contextualizes",
  "subsequent_evidence",
];

export default function ClaimIntegrityDetail({ claimId }: { claimId: string }) {
  const [record, setRecord] = useState<ClaimRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState("");
  const [classification, setClassification] = useState(
    "insufficient_public_evidence",
  );

  async function reload() {
    const response = await fetch(`/api/research/oncology/claims/${claimId}`);
    const body = await response.json() as {
      record?: ClaimRecord;
      error?: string;
    };
    if (!response.ok || !body.record) {
      setError(body.error ?? "Record unavailable");
      return;
    }
    setRecord(body.record);
    setError(null);
  }

  function unlock() {
    void reload();
  }

  async function review(action: string) {
    const response = await fetch(
      `/api/research/oncology/claims/${claimId}/review`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, rationale, classification }),
      },
    );
    const body = await response.json() as {
      record?: ClaimRecord;
      error?: string;
    };
    if (!response.ok || !body.record) {
      setError(body.error ?? "Review action failed");
      return;
    }
    setRecord(body.record);
    setError(null);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/research/oncology/claim-integrity"
        className="text-sm text-lacuna-plum underline"
      >
        Registry
      </Link>
      <ReviewAccessGate onUnlocked={unlock} className="mt-4" />
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      {record && (
        <article className="mt-6 space-y-6">
          <p className="text-sm leading-relaxed text-lacuna-blue">
            {CLAIM_INTEGRITY_DISCLOSURE}
          </p>
          <blockquote className="border-l-4 border-lacuna-plum pl-4 text-xl text-lacuna-plum">
            {record.claim.exactClaim}
          </blockquote>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              Source: {SOURCE_TYPE_LABELS[record.claim.claimSourceType]}
            </div>
            <div>
              Issuer: {record.claim.speakerOrIssuer ?? "Not recorded"}
            </div>
            <div>Claim date: {record.claim.claimDate}</div>
            <div>Evidence cutoff: {record.claim.evidenceCutoffDate}</div>
            <div>
              <a className="underline" href={record.claim.claimSourceUrl}>
                Claim source
              </a>
            </div>
          </dl>
          <section>
            <h2 className="text-lg font-semibold">Classifications</h2>
            <p className="mt-2 text-sm">
              Suggested:{" "}
              {CLASSIFICATION_LABELS[record.analysis.suggestedClassification]}
            </p>
            <p className="text-sm">
              Human-approved: {record.claim.reviewStatus === "approved"
                ? CLASSIFICATION_LABELS[record.claim.classification]
                : "Not approved"}
            </p>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {record.analysis.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            <h3 className="mt-3 text-sm font-semibold">Missing evidence</h3>
            <ul className="list-disc pl-5 text-sm">
              {record.analysis.missingEvidence.length === 0 && (
                <li>No missing-evidence items from the current rules.</li>
              )}
              {record.analysis.missingEvidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          {GROUPS.map((relationship) => (
            <section key={relationship}>
              <h2 className="text-lg font-semibold">
                {RELATIONSHIP_LABELS[relationship]}
              </h2>
              <ClaimEvidenceList
                items={record.evidence.filter((item) =>
                  item.relationship === relationship
                )}
              />
            </section>
          ))}
          <ClaimEvidenceForm
            claimId={claimId}
            onSaved={setRecord}
            onError={setError}
          />
          <section className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Review</h2>
            <label className="mt-3 block text-sm">
              Reviewer rationale
              <textarea
                className="mt-1 w-full rounded border px-2 py-1"
                value={rationale}
                onChange={(event) => setRationale(event.target.value)}
              />
            </label>
            <label className="mt-3 block text-sm">
              Classification to approve
              <select
                className="mt-1 w-full rounded border px-2 py-1"
                value={classification}
                onChange={(event) => setClassification(event.target.value)}
              >
                {Object.entries(CLASSIFICATION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded border px-3 py-1 text-sm"
                onClick={() => review("submit")}
              >
                Submit for review
              </button>
              <button
                type="button"
                className="rounded border px-3 py-1 text-sm"
                onClick={() => review("request_changes")}
              >
                Request changes
              </button>
              <button
                type="button"
                className="rounded border px-3 py-1 text-sm"
                onClick={() => review("approve")}
              >
                Approve classification
              </button>
              <button
                type="button"
                className="rounded border px-3 py-1 text-sm"
                onClick={() => review("archive")}
              >
                Archive
              </button>
            </div>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Audit history</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {record.audit.map((event) => (
                <li key={event.id}>
                  {event.createdAt} · {event.action} · {event.actorId}
                </li>
              ))}
            </ul>
          </section>
          <section className="text-sm text-lacuna-blue">
            <h2 className="text-lg font-semibold text-lacuna-plum">
              Methodology and limitations
            </h2>
            <p className="mt-2">
              Rules live in the claim-integrity analysis module and in the
              methodology note. A missing public source is not proof that
              evidence does not exist. Later outcomes are labeled subsequent
              evidence and are not used to imply an earlier claim was knowingly
              false. Scientific weakness is not a finding of misconduct.
            </p>
          </section>
          {record.aiDrafts.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold">AI-generated draft</h2>
              <ul className="mt-2 space-y-2 text-sm">
                {record.aiDrafts.map((draft) => (
                  <li key={draft.id} className="rounded border p-2">
                    AI-generated draft · {draft.model} · {draft.promptVersion}
                    <p>{draft.draftText}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
      )}
    </div>
  );
}
