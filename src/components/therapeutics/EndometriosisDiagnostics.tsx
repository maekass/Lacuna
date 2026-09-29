import Metric from "@/components/Metric";
import { endometriosisTherapeuticsGraph } from "@/data/therapeutics/endometriosis";
import { getTherapeuticStateAt } from "@/lib/therapeutics/pointInTime";

const SNAPSHOTS = [
  { subjectId: "asset-elagolix", date: "2018-07-23" },
  { subjectId: "asset-elagolix", date: "2018-09-17" },
  { subjectId: "asset-elagolix", date: "2018-09-18" },
  { subjectId: "asset-relugolix-combination", date: "2022-08-05" },
  { subjectId: "asset-relugolix-combination", date: "2022-08-08" },
] as const;

function orgName(id: string): string {
  return endometriosisTherapeuticsGraph.organizations.find((org) =>
    org.id === id
  )?.canonicalName ?? id;
}

/**
 * Developer inspection of the endometriosis reference graph.
 * Presentation is intentionally plain.
 */
export default function EndometriosisDiagnostics() {
  const graph = endometriosisTherapeuticsGraph;
  const disease = graph.diseases[0];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 text-lacuna-text-primary">
      <p className="text-xs uppercase tracking-wide text-lacuna-text-muted">
        Diagnostic surface
      </p>
      <h1 className="mt-1 text-2xl font-semibold">{disease?.canonicalName}</h1>
      <p className="mt-2 text-sm text-lacuna-text-secondary">
        Reference vertical for the therapeutics ontology. This page inspects
        committed records. It is not a comprehensive therapeutics database and
        it does not score an investment.
      </p>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Disease</h2>
        <p className="mt-2 text-sm">{disease?.description.value}</p>
        <ul className="mt-2 list-disc pl-5 text-sm text-lacuna-text-secondary">
          {disease?.codedReferences.map((code) => (
            <li key={code.id}>
              {code.system} {code.code.value}
              {code.code.sourceId ? ` · ${code.code.sourceId}` : ""}
            </li>
          ))}
        </ul>
        <ul className="mt-2 list-disc pl-5 text-sm">
          {disease?.limitations.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Therapeutic assets</h2>
        <ul className="mt-2 space-y-3 text-sm">
          {graph.assets.map((asset) => (
            <li key={asset.id} className="border-t border-lacuna-border pt-2">
              <p className="font-medium">{asset.canonicalName}</p>
              <p className="text-lacuna-text-secondary">
                Sponsor {orgName(asset.sponsorOrganizationId)}
                {" · "}
                {asset.developmentStatuses.map((status) =>
                  `${status.jurisdiction}: ${status.stage.value}`
                ).join("; ")}
              </p>
              <p>
                Mechanism: {asset.mechanism?.value ?? "unresolved"}
              </p>
              <p className="text-lacuna-text-muted">
                {asset.limitations[0]}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Clinical trials</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {graph.trials.map((trial) => (
            <li key={trial.id}>
              {trial.nctId} · {trial.rawStatus} · {trial.phase} ·{" "}
              {trial.resultStatus} · assets {trial.assetIds.join(", ") ||
                "none"}
              <span className="block text-lacuna-text-muted">
                {trial.title}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Regulatory events</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {graph.regulatoryEvents.map((event) => (
            <li key={event.id}>
              {event.id} · {event.jurisdiction} {event.regulator} ·{" "}
              {event.eventType.value} · {event.outcome.value}
              {event.decisionDate
                ? ` · decision ${event.decisionDate.value}`
                : ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Catalysts</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {graph.catalysts.map((catalyst) => (
            <li key={catalyst.id}>
              {catalyst.id} · {catalyst.status} · {catalyst.date.role}{" "}
              {catalyst.date.value} · certainty {catalyst.date.certainty}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Evidence conflicts</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {graph.conflicts.map((conflict) => (
            <li key={conflict.id}>
              {conflict.id} · {conflict.field} · {conflict.reason} ·{" "}
              {conflict.resolutionStatus}
              <span className="block text-lacuna-text-muted">
                {conflict.reviewerNote}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Analyst assumptions</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {graph.theses.flatMap((thesis) =>
            thesis.assumptions.map((assumption) => (
              <li key={assumption.id}>
                {assumption.kind}: {assumption.statement}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Point-in-time counts</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {SNAPSHOTS.map((snapshot) => {
            const state = getTherapeuticStateAt(
              graph,
              snapshot.subjectId,
              snapshot.date,
            );
            return (
              <li key={`${snapshot.subjectId}-${snapshot.date}`}>
                {snapshot.subjectId} @ {snapshot.date}: admissible{" "}
                <Metric
                  label="Point-in-time admissible evidence count"
                  provenance={{
                    kind: "assumption",
                    value: state.admissible.length,
                    model: {
                      module: "src/lib/therapeutics/pointInTime.ts",
                      exportName: "getTherapeuticStateAt",
                      definition:
                        "Count of graph records admitted by the point-in-time evidence filter for this asset and cutoff date.",
                    },
                    caveat:
                      "Descriptive graph coverage count, not a clinical, regulatory, or investment score.",
                  }}
                />, excluded future{" "}
                <Metric
                  label="Point-in-time future-excluded evidence count"
                  provenance={{
                    kind: "assumption",
                    value: state.excludedFuture.length,
                    model: {
                      module: "src/lib/therapeutics/pointInTime.ts",
                      exportName: "getTherapeuticStateAt",
                      definition:
                        "Count of graph records excluded because their evidence was not yet knowable at the cutoff date.",
                    },
                    caveat:
                      "Descriptive temporal-filter count; it does not imply a future clinical or regulatory outcome.",
                  }}
                />, unresolved{" "}
                <Metric
                  label="Point-in-time unresolved evidence count"
                  provenance={{
                    kind: "assumption",
                    value: state.unresolved.length,
                    model: {
                      module: "src/lib/therapeutics/pointInTime.ts",
                      exportName: "getTherapeuticStateAt",
                      definition:
                        "Count of graph records withheld from the cutoff state because temporal provenance is unresolved.",
                    },
                    caveat:
                      "A provenance-gap count; unresolved records are not treated as zero or inferred.",
                  }}
                />
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Sources</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {graph.sources.map((source) => (
            <li key={source.id}>
              {source.id} · {source.sourceClass} ·{" "}
              {source.publishedAt ?? "publication date unknown"}
              <span className="block break-all text-lacuna-text-muted">
                {source.url}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
