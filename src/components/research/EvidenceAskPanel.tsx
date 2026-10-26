"use client";

import { type FormEvent, useState } from "react";
import type { EvidenceAskResponse } from "@/lib/ai/rag/contracts";

interface AskForm {
  question: string;
  asOfDate: string;
  lane: "publication" | "research_draft";
  dataYear: string;
  payer: string;
  geographyCode: string;
}

const INITIAL: AskForm = {
  question: "",
  asOfDate: "2026-10-24",
  lane: "research_draft",
  dataYear: "",
  payer: "Medicare",
  geographyCode: "US",
};

export default function EvidenceAskPanel() {
  const [form, setForm] = useState<AskForm>(INITIAL);
  const [result, setResult] = useState<EvidenceAskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const payload: Record<string, unknown> = {
        question: form.question,
        asOfDate: form.asOfDate,
        lane: form.lane,
        payer: form.payer || undefined,
        geographyCode: form.geographyCode || undefined,
      };
      if (form.dataYear.trim()) {
        payload.dataYear = Number(form.dataYear);
      }
      const response = await fetch("/api/research/evidence/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json() as EvidenceAskResponse | {
        error?: string;
      };
      if (!response.ok && !("disposition" in body)) {
        setError(body.error ?? "The evidence ask could not be completed.");
        return;
      }
      if (!("disposition" in body)) {
        setError("The evidence ask returned an unexpected response.");
        return;
      }
      setResult(body);
    } catch {
      setError("The evidence ask could not be completed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-lacuna-plum">
          Research
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-lacuna-plum">
          Evidence ask
        </h1>
        <p className="mt-2 text-sm text-lacuna-blue">
          Question, then evidence, then uncertainty, then an explicit
          non-decision. Public CMS excerpts in the research-draft lane are
          source-verified text, not publication-approved claims.
        </p>
      </header>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label
            className="block text-sm font-medium"
            htmlFor="evidence-question"
          >
            Question
          </label>
          <textarea
            className="mt-1 w-full rounded border border-lacuna-plum/30 p-2 text-sm"
            id="evidence-question"
            maxLength="1000"
            required
            rows="4"
            value={form.question}
            onChange={(event) =>
              setForm({ ...form, question: event.target.value })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              className="block text-sm font-medium"
              htmlFor="evidence-asof"
            >
              As of
            </label>
            <input
              className="mt-1 w-full rounded border border-lacuna-plum/30 p-2 text-sm"
              id="evidence-asof"
              required
              type="date"
              value={form.asOfDate}
              onChange={(event) =>
                setForm({ ...form, asOfDate: event.target.value })}
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium"
              htmlFor="evidence-lane"
            >
              Evidence lane
            </label>
            <select
              className="mt-1 w-full rounded border border-lacuna-plum/30 p-2 text-sm"
              id="evidence-lane"
              value={form.lane}
              onChange={(event) =>
                setForm({
                  ...form,
                  lane: event.target.value as AskForm["lane"],
                })}
            >
              <option value="research_draft">Research draft</option>
              <option value="publication">Publication</option>
            </select>
          </div>
          <div>
            <label
              className="block text-sm font-medium"
              htmlFor="evidence-year"
            >
              Data year
            </label>
            <input
              className="mt-1 w-full rounded border border-lacuna-plum/30 p-2 text-sm"
              id="evidence-year"
              inputMode="numeric"
              placeholder="Optional"
              value={form.dataYear}
              onChange={(event) =>
                setForm({ ...form, dataYear: event.target.value })}
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium"
              htmlFor="evidence-payer"
            >
              Payer
            </label>
            <input
              className="mt-1 w-full rounded border border-lacuna-plum/30 p-2 text-sm"
              id="evidence-payer"
              value={form.payer}
              onChange={(event) =>
                setForm({ ...form, payer: event.target.value })}
            />
          </div>
        </div>
        <button
          className="rounded bg-lacuna-plum px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Checking evidence…" : "Ask with evidence"}
        </button>
      </form>

      <div aria-live="polite" className="mt-8 space-y-6">
        {error && (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        {result && <EvidenceResult result={result} />}
      </div>
    </article>
  );
}

function EvidenceResult({ result }: { result: EvidenceAskResponse }) {
  const verified = result.claims.filter((claim) =>
    claim.verification === "resolved"
  );
  return (
    <>
      <section aria-labelledby="evidence-question-heading">
        <h2 className="text-lg font-semibold" id="evidence-question-heading">
          Question
        </h2>
        <p className="mt-2 text-sm">
          {result.disposition === "abstain"
            ? "The system abstained."
            : "A scoped synthesis is below. It is not a decision."} Lane:{" "}
          {result.lane === "research_draft" ? "research draft" : "publication"}
          .
        </p>
      </section>

      <section aria-labelledby="evidence-evidence-heading">
        <h2 className="text-lg font-semibold" id="evidence-evidence-heading">
          Evidence
        </h2>
        {result.considered.length === 0
          ? (
            <p className="mt-2 text-sm">
              No admissible passages were retrieved.
            </p>
          )
          : (
            <ul className="mt-3 space-y-3">
              {result.considered.map((citation) => (
                <li
                  className="rounded border border-lacuna-plum/20 p-3 text-sm"
                  key={citation.passageId}
                >
                  <p className="font-medium">{citation.title}</p>
                  <p className="mt-1">
                    Locator: {citation.locator}
                  </p>
                  <p>
                    Published: {citation.publishedAt ?? "unknown"}
                    {" · "}
                    Retrieved: {citation.retrievedAt}
                  </p>
                  <p>
                    Scope: {citation.geographyLabel ?? "unspecified geography"}
                    {citation.payer ? ` · ${citation.payer}` : ""}
                    {citation.setting ? ` · ${citation.setting}` : ""}
                    {citation.dataYear
                      ? ` · data year ${citation.dataYear}`
                      : ""}
                  </p>
                  <p>
                    Status: {citation.reviewState}
                    {" · "}
                    {citation.passageRole}
                    {" · "}
                    {citation.corpusClass}
                  </p>
                  <p>Limitations: {citation.limitations.join(" ")}</p>
                  <p>
                    <a
                      className="underline"
                      href={citation.sourceUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Source document
                    </a>
                  </p>
                </li>
              ))}
            </ul>
          )}
        <h3 className="mt-4 text-sm font-semibold">Verified evidence</h3>
        {verified.length === 0
          ? (
            <p className="mt-1 text-sm">
              No deterministically verified claim was returned.
            </p>
          )
          : (
            <ul className="mt-1 list-disc pl-5 text-sm">
              {verified.map((claim) => <li key={claim.id}>{claim.text}</li>)}
            </ul>
          )}
      </section>

      <section aria-labelledby="evidence-uncertainty-heading">
        <h2 className="text-lg font-semibold" id="evidence-uncertainty-heading">
          Uncertainty
        </h2>
        {result.disposition === "abstain"
          ? (
            <p className="mt-2 text-sm">
              {result.abstentionReason}
            </p>
          )
          : (
            <div className="mt-2 space-y-2 text-sm">
              <h3 className="font-semibold">Generated synthesis</h3>
              <p>{result.answer}</p>
              <h3 className="font-semibold">Assumptions</h3>
              <p>
                {result.assumptions.length === 0
                  ? "None stated."
                  : result.assumptions.join(" ")}
              </p>
              <h3 className="font-semibold">Analyst interpretation</h3>
              <p>Not produced by this tool.</p>
            </div>
          )}
        {result.conflicts.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-sm">
            {result.conflicts.map((conflict) => (
              <li key={conflict}>{conflict}</li>
            ))}
          </ul>
        )}
        <ul className="mt-2 list-disc pl-5 text-sm">
          {result.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="evidence-decision-heading">
        <h2 className="text-lg font-semibold" id="evidence-decision-heading">
          Decision
        </h2>
        <p className="mt-2 text-sm">{result.disclaimer}</p>
        <p className="mt-1 text-xs text-lacuna-blue">
          Request {result.requestId}
          {" · "}
          model {result.modelId}
          {" · "}
          prompt {result.promptVersion}
          {" · "}
          retriever {result.retrieverVersion}
        </p>
      </section>
    </>
  );
}
