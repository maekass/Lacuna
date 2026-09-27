"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ReviewAccessGate from "@/components/ReviewAccessGate";
import { SOURCE_TYPE_LABELS } from "@/lib/oncology/claimIntegrity/labels";
import { CLAIM_INTEGRITY_DISCLOSURE } from "@/lib/oncology/claimIntegrity/types";

export default function NewOncologyClaimForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exactClaim, setExactClaim] = useState("");
  const [claimSourceUrl, setClaimSourceUrl] = useState("");
  const [claimSourceType, setClaimSourceType] = useState("press_release");
  const [claimDate, setClaimDate] = useState("");
  const [evidenceCutoffDate, setEvidenceCutoffDate] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [assetId, setAssetId] = useState("");
  const [trialId, setTrialId] = useState("");
  const [indication, setIndication] = useState("");
  const [biomarker, setBiomarker] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/research/oncology/claims", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        exactClaim,
        claimSourceUrl,
        claimSourceType,
        claimDate,
        evidenceCutoffDate,
        companyId,
        assetId,
        trialId,
        indication,
        biomarker,
      }),
    });
    const body = await response.json() as {
      error?: string;
      record?: { claim: { id: string } };
    };
    if (!response.ok || !body.record) {
      setError(body.error ?? "The claim was not saved.");
      return;
    }
    router.push(`/research/oncology/claim-integrity/${body.record.claim.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/research/oncology/claim-integrity"
        className="text-sm text-lacuna-plum underline"
      >
        Registry
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-lacuna-plum">
        Record an oncology claim
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-lacuna-blue">
        Lacuna assesses evidence consistency. It does not assess fraud or
        intent. {CLAIM_INTEGRITY_DISCLOSURE}
      </p>
      <ReviewAccessGate onUnlocked={() => setReady(true)} className="mt-6" />
      {ready && (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            Exact claim
            <textarea
              required
              className="mt-1 w-full rounded border px-2 py-1"
              rows="4"
              value={exactClaim}
              onChange={(event) => setExactClaim(event.target.value)}
            />
          </label>
          <label className="block text-sm">
            Source URL
            <input
              required
              className="mt-1 w-full rounded border px-2 py-1"
              value={claimSourceUrl}
              onChange={(event) => setClaimSourceUrl(event.target.value)}
            />
          </label>
          <label className="block text-sm">
            Source type
            <select
              className="mt-1 w-full rounded border px-2 py-1"
              value={claimSourceType}
              onChange={(event) => setClaimSourceType(event.target.value)}
            >
              {Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Claim date
              <input
                required
                type="date"
                className="mt-1 w-full rounded border px-2 py-1"
                value={claimDate}
                onChange={(event) => setClaimDate(event.target.value)}
              />
            </label>
            <label className="text-sm">
              Evidence cutoff date
              <input
                required
                type="date"
                className="mt-1 w-full rounded border px-2 py-1"
                value={evidenceCutoffDate}
                onChange={(event) => setEvidenceCutoffDate(event.target.value)}
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Company id"
              value={companyId}
              onChange={setCompanyId}
            />
            <Field label="Asset id" value={assetId} onChange={setAssetId} />
            <Field label="Trial id" value={trialId} onChange={setTrialId} />
            <Field
              label="Indication"
              value={indication}
              onChange={setIndication}
            />
            <Field
              label="Biomarker"
              value={biomarker}
              onChange={setBiomarker}
            />
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            className="rounded-md bg-lacuna-plum px-3 py-2 text-sm text-white"
          >
            Save draft
          </button>
        </form>
      )}
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm">
      {props.label}
      <input
        className="mt-1 w-full rounded border px-2 py-1"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  );
}
