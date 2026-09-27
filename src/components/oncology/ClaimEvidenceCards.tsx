"use client";

import { useState } from "react";
import {
  RELATIONSHIP_LABELS,
  SOURCE_TYPE_LABELS,
} from "@/lib/oncology/claimIntegrity/labels";
import type {
  ClaimEvidence,
  ClaimRecord,
  EvidenceRelationship,
} from "@/lib/oncology/claimIntegrity/types";

const GROUPS: EvidenceRelationship[] = [
  "supports",
  "contradicts",
  "contextualizes",
  "subsequent_evidence",
];

export function ClaimEvidenceList({ items }: { items: ClaimEvidence[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-lacuna-blue">None linked.</p>;
  }
  return (
    <ul className="mt-2 space-y-3">
      {items.map((item) => (
        <li key={item.id} className="rounded-lg border p-3 text-sm">
          <p className="font-medium">{item.title}</p>
          <p>{SOURCE_TYPE_LABELS[item.sourceType]}</p>
          <p>
            Primary source: {item.primarySource ? "yes" : "no"}{" "}
            · Available by claim date:{" "}
            {item.availableByClaimDate ? "yes" : "no"}
          </p>
          <p>Publication date: {item.publicationDate ?? "Not recorded"}</p>
          <p>Relationship: {RELATIONSHIP_LABELS[item.relationship]}</p>
          <p>{item.analystSummary}</p>
          {item.quotedExcerpt && <blockquote>{item.quotedExcerpt}</blockquote>}
          {item.limitations && <p>Limitations: {item.limitations}</p>}
          <a className="underline" href={item.url}>Open source</a>
        </li>
      ))}
    </ul>
  );
}

export function ClaimEvidenceForm(props: {
  claimId: string;
  onSaved: (record: ClaimRecord) => void;
  onError: (message: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [analystSummary, setAnalystSummary] = useState("");
  const [publicationDate, setPublicationDate] = useState("");
  const [relationship, setRelationship] = useState("supports");
  const [sourceType, setSourceType] = useState("peer_reviewed_publication");
  const [primarySource, setPrimarySource] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch(
      `/api/research/oncology/claims/${props.claimId}/evidence`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          url,
          analystSummary,
          publicationDate,
          relationship,
          sourceType,
          primarySource,
        }),
      },
    );
    const body = await response.json() as {
      record?: ClaimRecord;
      error?: string;
    };
    if (!response.ok || !body.record) {
      props.onError(body.error ?? "Evidence was not saved.");
      return;
    }
    props.onSaved(body.record);
    setTitle("");
    setAnalystSummary("");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Attach evidence</h2>
      <input
        required
        placeholder="Title"
        className="w-full rounded border px-2 py-1 text-sm"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <input
        required
        placeholder="URL"
        className="w-full rounded border px-2 py-1 text-sm"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
      />
      <textarea
        required
        placeholder="Analyst summary"
        className="w-full rounded border px-2 py-1 text-sm"
        value={analystSummary}
        onChange={(event) => setAnalystSummary(event.target.value)}
      />
      <input
        type="date"
        className="rounded border px-2 py-1 text-sm"
        value={publicationDate}
        onChange={(event) => setPublicationDate(event.target.value)}
      />
      <select
        className="rounded border px-2 py-1 text-sm"
        value={relationship}
        onChange={(event) => setRelationship(event.target.value)}
      >
        {GROUPS.map((value) => (
          <option key={value} value={value}>
            {RELATIONSHIP_LABELS[value]}
          </option>
        ))}
      </select>
      <select
        className="ml-2 rounded border px-2 py-1 text-sm"
        value={sourceType}
        onChange={(event) => setSourceType(event.target.value)}
      >
        {Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <label className="ml-2 text-sm">
        <input
          type="checkbox"
          checked={primarySource}
          onChange={(event) => setPrimarySource(event.target.checked)}
        />{" "}
        Primary source
      </label>
      <button type="submit" className="block rounded border px-3 py-1 text-sm">
        Attach
      </button>
    </form>
  );
}
