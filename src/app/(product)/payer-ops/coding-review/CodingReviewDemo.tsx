"use client";

import { useId, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import {
  buildTestCaseCandidate,
  type PinnedRowView,
  type ReviewerDemo,
  type ReviewerItem,
  type ReviewerRecord,
  type ReviewerRun,
} from "@/lib/payerOps/codingJudgment/reviewerDemoView";

type RouteFilter = "all" | "auto" | "person" | "overrode";
type Decision = "flag" | "no_flag" | "abstain";
type Route = "auto" | "human_review";

const ROUTE_FILTERS: { id: RouteFilter; label: string }[] = [
  { id: "all", label: "All cases" },
  { id: "auto", label: "Decided automatically" },
  { id: "person", label: "Sent to a person" },
  { id: "overrode", label: "Guard overrode the model" },
];

const DECISION_LABEL: Record<Decision, string> = {
  flag: "Flag",
  no_flag: "No flag",
  abstain: "Abstain",
};

const ROUTE_LABEL: Record<Route, string> = {
  auto: "Decide automatically",
  human_review: "Send to a person",
};

const CONDITION_LABEL: Record<string, string> = {
  grounded: "Grounded (pinned rows supplied)",
  closed_book: "Closed book (no rows supplied)",
};

function matches(record: ReviewerRecord, filter: RouteFilter): boolean {
  if (filter === "auto") return record.finalRoute === "auto";
  if (filter === "person") return record.finalRoute === "human_review";
  if (filter === "overrode") return record.overrodeModel;
  return true;
}

function shortModel(modelId: string): string {
  return modelId.split("/").pop()?.replace(/:free$/, "") ?? modelId;
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function Pill(
  { children, tone }: { children: React.ReactNode; tone: "plum" | "blue" },
) {
  const toneClass = tone === "plum"
    ? "border-lacuna-plum/40 bg-lacuna-plum/10 text-lacuna-plum"
    : "border-lacuna-blue/30 bg-lacuna-lavender/20 text-lacuna-blue";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${toneClass}`}
    >
      {children}
    </span>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-lacuna-blue/80">{label}</dt>
      <dd className="break-words text-sm text-lacuna-plum">{value}</dd>
    </div>
  );
}

function RowDetails({ row }: { row: PinnedRowView }) {
  return (
    <details className="rounded-lg border border-lacuna-lavender/40 bg-white px-3 py-2">
      <summary className="cursor-pointer text-sm font-medium text-lacuna-plum">
        {row.title}
        <span className="ml-2 break-all font-mono text-xs text-lacuna-blue/80">
          {row.id}
        </span>
      </summary>
      <dl className="mt-2 grid gap-2 sm:grid-cols-2">
        {row.details.map(([label, value]) => (
          <Fact key={label} label={label} value={value} />
        ))}
      </dl>
    </details>
  );
}

function DisagreeForm(
  { record, item, guardVersion, onClose }: {
    record: ReviewerRecord;
    item: ReviewerItem;
    guardVersion: string;
    onClose: () => void;
  },
) {
  const noteId = useId();
  const decisionId = useId();
  const routeId = useId();
  const [note, setNote] = useState("");
  const [decision, setDecision] = useState<Decision | "">("");
  const [route, setRoute] = useState<Route | "">("");
  const [downloaded, setDownloaded] = useState<string | null>(null);
  const ready = note.trim().length > 0;

  const download = () => {
    const candidate = buildTestCaseCandidate(
      record,
      item,
      guardVersion,
      {
        note,
        proposedDecision: decision === "" ? null : decision,
        proposedRoute: route === "" ? null : route,
      },
      new Date().toISOString(),
    );
    const filename = `test-case-candidate-${record.caseId}-${
      shortModel(record.modelId)
    }-${record.condition}.json`;
    downloadJson(filename, candidate);
    setDownloaded(filename);
  };

  return (
    <div className="mt-4 rounded-lg border border-lacuna-plum/30 bg-lacuna-lavender/10 p-4">
      <p className="text-sm text-lacuna-blue">
        Your note and this case become a test-case candidate. It downloads to
        your device as JSON. Nothing is saved or sent anywhere. A candidate is
        not a label until someone adjudicates it.
      </p>
      <label
        htmlFor={noteId}
        className="mt-3 block text-sm font-medium text-lacuna-plum"
      >
        What is wrong with this result? (required)
      </label>
      <textarea
        id={noteId}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={3}
        className="mt-1 w-full rounded-lg border border-lacuna-lavender/60 bg-white p-2 text-sm text-lacuna-plum"
      />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor={decisionId}
            className="block text-sm font-medium text-lacuna-plum"
          >
            Decision you would expect (optional)
          </label>
          <select
            id={decisionId}
            value={decision}
            onChange={(event) =>
              setDecision(event.target.value as Decision | "")}
            className="mt-1 w-full rounded-lg border border-lacuna-lavender/60 bg-white p-2 text-sm text-lacuna-plum"
          >
            <option value="">No proposal</option>
            <option value="flag">Flag</option>
            <option value="no_flag">No flag</option>
            <option value="abstain">Abstain</option>
          </select>
        </div>
        <div>
          <label
            htmlFor={routeId}
            className="block text-sm font-medium text-lacuna-plum"
          >
            Route you would expect (optional)
          </label>
          <select
            id={routeId}
            value={route}
            onChange={(event) => setRoute(event.target.value as Route | "")}
            className="mt-1 w-full rounded-lg border border-lacuna-lavender/60 bg-white p-2 text-sm text-lacuna-plum"
          >
            <option value="">No proposal</option>
            <option value="auto">Decide automatically</option>
            <option value="human_review">Send to a person</option>
          </select>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={download}
          disabled={!ready}
          className="rounded-lg bg-lacuna-plum px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Download test-case candidate (JSON)
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-lacuna-lavender/60 bg-white px-3 py-2 text-sm font-medium text-lacuna-plum"
        >
          Cancel
        </button>
      </div>
      {downloaded
        ? (
          <p role="status" className="mt-2 text-sm text-lacuna-blue">
            Downloaded {downloaded}
          </p>
        )
        : null}
    </div>
  );
}

function RecordCard(
  { record, item, run, guardVersion }: {
    record: ReviewerRecord;
    item: ReviewerItem;
    run: ReviewerRun;
    guardVersion: string;
  },
) {
  const [disagreeing, setDisagreeing] = useState(false);
  const { facts, intake } = item;
  const cited = record.model.ok
    ? record.model.citations.map((id) => ({ id, row: run.rows[id] }))
    : [];
  const citedIds = new Set(cited.map((c) => c.id));
  const guardRows = record.decidingRowIds
    .filter((id) => !citedIds.has(id))
    .map((id) => run.rows[id])
    .filter((row): row is PinnedRowView => row !== undefined);

  return (
    <li>
      <Card className="p-4 sm:p-6">
        <article aria-label={`Case ${record.caseId}`}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-mono text-base font-semibold text-lacuna-plum">
              {record.caseId}
            </h3>
            <Pill tone={record.finalRoute === "auto" ? "blue" : "plum"}>
              {record.finalRoute === "auto"
                ? "Decided automatically"
                : "Sent to a person"}
            </Pill>
            {record.overrodeModel
              ? <Pill tone="plum">Guard overrode the model</Pill>
              : null}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-lacuna-plum">
            {item.question}
          </p>

          <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-lacuna-blue">
            Claim facts
          </h4>
          <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Fact label="Codes" value={facts.codes.join(", ") || "None"} />
            <Fact
              label="Modifiers"
              value={facts.modifiers.join(", ") || "None"}
            />
            <Fact
              label="Units"
              value={facts.units === undefined ? "—" : String(facts.units)}
            />
            <Fact label="Date of service" value={facts.dateOfService ?? "—"} />
            <Fact label="Payer" value={intake.payer.replaceAll("_", " ")} />
            <Fact
              label="Request type"
              value={intake.requestType.replaceAll("_", " ")}
            />
            {facts.profileId
              ? <Fact label="Provider (hashed id)" value={facts.profileId} />
              : null}
          </dl>

          <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-lacuna-blue">
            Model decision (recorded)
          </h4>
          {record.model.ok
            ? (
              <div className="mt-2 space-y-2">
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Fact
                    label="Decision"
                    value={DECISION_LABEL[record.model.decision]}
                  />
                  <Fact
                    label="Route asked for"
                    value={ROUTE_LABEL[record.model.route]}
                  />
                  <Fact
                    label="Stated confidence"
                    value={String(record.model.confidence)}
                  />
                  <Fact label="Model" value={shortModel(record.modelId)} />
                </dl>
                <p className="text-sm leading-relaxed text-lacuna-blue">
                  {record.model.rationale}
                </p>
              </div>
            )
            : (
              <p className="mt-2 text-sm text-lacuna-plum">
                The reply could not be used ({record.model.reason}), so it is
                treated as needing a person.
              </p>
            )}

          <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-lacuna-blue">
            Rule rows the model cited
          </h4>
          {cited.length
            ? (
              <ul className="mt-2 space-y-2">
                {cited.map(({ id, row }) => (
                  <li key={id}>
                    {row
                      ? <RowDetails row={row} />
                      : (
                        <p className="break-all text-sm text-lacuna-plum">
                          {id} (not a pinned row)
                        </p>
                      )}
                  </li>
                ))}
              </ul>
            )
            : <p className="mt-2 text-sm text-lacuna-blue">None cited.</p>}
          {guardRows.length
            ? (
              <>
                <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-lacuna-blue">
                  Other rows the guard checked
                </h4>
                <ul className="mt-2 space-y-2">
                  {guardRows.map((row) => (
                    <li key={row.id}>
                      <RowDetails row={row} />
                    </li>
                  ))}
                </ul>
              </>
            )
            : null}

          <div className="mt-4 rounded-lg border border-lacuna-lavender/40 bg-lacuna-lavender/10 p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-lacuna-blue">
              Why it was routed this way
            </h4>
            <p className="mt-1 text-sm text-lacuna-plum">{record.reasonText}</p>
            {record.reasons.length
              ? (
                <p className="mt-1 break-words font-mono text-xs text-lacuna-blue/80">
                  {record.reasons.join(" · ")}
                </p>
              )
              : null}
          </div>

          {disagreeing
            ? (
              <DisagreeForm
                record={record}
                item={item}
                guardVersion={guardVersion}
                onClose={() => setDisagreeing(false)}
              />
            )
            : (
              <button
                type="button"
                onClick={() => setDisagreeing(true)}
                className="mt-4 rounded-lg border border-lacuna-plum/40 bg-white px-3 py-2 text-sm font-semibold text-lacuna-plum"
              >
                Disagree
              </button>
            )}
        </article>
      </Card>
    </li>
  );
}

export default function CodingReviewDemo({ demo }: { demo: ReviewerDemo }) {
  const runSelectId = useId();
  const modelSelectId = useId();
  const conditionSelectId = useId();
  const [runId, setRunId] = useState(demo.runs[demo.runs.length - 1].runId);
  const run = demo.runs.find((r) => r.runId === runId) ?? demo.runs[0];
  const [modelId, setModelId] = useState(run.modelIds[0]);
  const [condition, setCondition] = useState(run.conditions[0]);
  const [filter, setFilter] = useState<RouteFilter>("all");

  const selectRun = (next: string) => {
    const nextRun = demo.runs.find((r) => r.runId === next) ?? demo.runs[0];
    setRunId(nextRun.runId);
    if (!nextRun.modelIds.includes(modelId)) setModelId(nextRun.modelIds[0]);
    if (!nextRun.conditions.includes(condition)) {
      setCondition(nextRun.conditions[0]);
    }
  };

  const inScope = useMemo(
    () =>
      demo.records.filter((r) =>
        r.runId === run.runId && r.modelId === modelId &&
        r.condition === condition
      ),
    [demo.records, run.runId, modelId, condition],
  );
  const shown = inScope.filter((r) => matches(r, filter));
  const items = useMemo(
    () => new Map(run.items.map((item) => [item.caseId, item])),
    [run.items],
  );

  const selectClass =
    "mt-1 w-full rounded-lg border border-lacuna-lavender/60 bg-white p-2 text-sm text-lacuna-plum";

  return (
    <div>
      <header className="mb-8 overflow-hidden rounded-3xl border border-lacuna-lavender/40 bg-white/80 p-6 shadow-sm sm:p-8">
        <p className="lacuna-eyebrow text-xs font-semibold text-lacuna-blue">
          Payer operations · coding judgment check
        </p>
        <h1 className="lacuna-gradient-text mt-3 max-w-4xl text-3xl font-bold leading-tight text-balance sm:text-5xl">
          Reviewer view of recorded cases
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-lacuna-blue">
          Each card shows one claim question the way a claim reviewer would see
          it: the claim facts, the model&apos;s decision, the rule rows it
          cited, where the case went, and why. The routing guard decides the
          final route. It sends a case to a person whenever the pinned rules,
          the claim intake, or the model&apos;s own reply say a person should
          look.
        </p>
        <div
          role="note"
          className="mt-5 rounded-xl border border-lacuna-plum/40 bg-lacuna-lavender/10 p-4 text-sm text-lacuna-plum"
        >
          <p className="font-semibold">
            Recorded run, not a live model.
          </p>
          <p className="mt-1">
            These are saved replies from free OpenRouter models, replayed
            through guard{" "}
            {demo.guardVersion}. Nothing on this page calls a model or saves
            data. The cases and labels are assistant-built and have not been
            adjudicated by a certified coder. Providers appear only as hashed
            ids. A flagged profile is a reason for review, never evidence of
            wrongdoing.
          </p>
        </div>
      </header>

      <section aria-labelledby="coding-review-scope">
        <h2 id="coding-review-scope" className="sr-only">
          Choose a recorded run
        </h2>
        <Card className="p-4 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor={runSelectId}
                className="block text-sm font-medium text-lacuna-plum"
              >
                Recorded run
              </label>
              <select
                id={runSelectId}
                value={run.runId}
                onChange={(event) => selectRun(event.target.value)}
                className={selectClass}
              >
                {demo.runs.map((r) => (
                  <option key={r.runId} value={r.runId}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor={modelSelectId}
                className="block text-sm font-medium text-lacuna-plum"
              >
                Model
              </label>
              <select
                id={modelSelectId}
                value={modelId}
                onChange={(event) => setModelId(event.target.value)}
                className={selectClass}
              >
                {run.modelIds.map((m) => (
                  <option key={m} value={m}>{shortModel(m)}</option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor={conditionSelectId}
                className="block text-sm font-medium text-lacuna-plum"
              >
                Arm
              </label>
              <select
                id={conditionSelectId}
                value={condition}
                onChange={(event) =>
                  setCondition(event.target.value as typeof condition)}
                className={selectClass}
              >
                {run.conditions.map((c) => (
                  <option key={c} value={c}>{CONDITION_LABEL[c] ?? c}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="mt-3 text-sm text-lacuna-blue">
            {run.note} Recorded {run.recordedAt.slice(0, 10)}, prompt{" "}
            {run.promptVersion}.
          </p>
        </Card>
      </section>

      <section className="mt-8">
        <SectionHeader
          title="Recorded cases"
          description={`${shown.length} of ${inScope.length} cases shown.`}
        />
        <div
          role="group"
          aria-label="Filter by route"
          className="mb-6 flex flex-wrap gap-2"
        >
          {ROUTE_FILTERS.map(({ id, label }) => {
            const count = inScope.filter((r) => matches(r, id)).length;
            const active = filter === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(id)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                  active
                    ? "border-lacuna-plum bg-lacuna-plum text-white"
                    : "border-lacuna-lavender/60 bg-white text-lacuna-plum"
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
        {shown.length
          ? (
            <ul className="space-y-4">
              {shown.map((record) => {
                const item = items.get(record.caseId);
                return item
                  ? (
                    <RecordCard
                      key={record.key}
                      record={record}
                      item={item}
                      run={run}
                      guardVersion={demo.guardVersion}
                    />
                  )
                  : null;
              })}
            </ul>
          )
          : (
            <p className="text-sm text-lacuna-blue">
              No recorded cases match this filter.
            </p>
          )}
      </section>
    </div>
  );
}
