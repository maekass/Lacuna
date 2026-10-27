import { useId } from "react";
import styles from "./EvidenceField.module.css";

export type EvidenceLayerKind = "source" | "interpretation" | "limitation";

export type EvidenceLayer = {
  id: string;
  kind: EvidenceLayerKind;
  label: string;
  detail: string;
};

export type UncertaintyFacet = {
  id: string;
  label: string;
  detail: string;
};

export type EvidenceFieldItem = {
  id: string;
  label: string;
  title: string;
  description: string;
  state: "observed" | "emerging" | "unresolved";
  metadata: string;
  source?: {
    label: string;
    href?: string;
  };
  context?: string;
  limitation?: string;
  confidence?: "emerging" | "supported" | "established";
  layers?: EvidenceLayer[];
};

export type EvidenceFieldProps = {
  eyebrow?: string;
  question?: string;
  uncertainty?: string;
  uncertaintyFacets?: UncertaintyFacet[];
  items?: EvidenceFieldItem[];
};

const DEFAULT_UNCERTAINTY_FACETS: UncertaintyFacet[] = [
  {
    id: "missing",
    label: "Missing evidence",
    detail: "Needed records are not in this dataset.",
  },
  {
    id: "conflict",
    label: "Conflicting sources",
    detail: "Public accounts that disagree stay unresolved.",
  },
  {
    id: "coverage",
    label: "Coverage limitations",
    detail: "Disclosure, timing, or population is partial.",
  },
];

const DEFAULT_ITEMS: EvidenceFieldItem[] = [
  {
    id: "need",
    label: "Question",
    title: "What are we trying to establish?",
    description:
      "Name the clinical or commercial question, and the population, asset, or event it concerns.",
    state: "observed",
    metadata: "Question · context",
    context: "Question, population, asset, or event",
  },
  {
    id: "evidence",
    label: "Evidence",
    title: "What can the available record substantiate?",
    description:
      "Separate what a cited source states from what analysis infers.",
    state: "emerging",
    metadata: "Evidence · record",
    layers: [
      {
        id: "source",
        kind: "source",
        label: "Source verification",
        detail: "Cited public observations stay attached to their sources.",
      },
      {
        id: "interpretation",
        kind: "interpretation",
        label: "Analytical context",
        detail:
          "Comparison or derivation. Interpretation is not a verified fact.",
      },
      {
        id: "limitation",
        kind: "limitation",
        label: "Evidence limitations",
        detail: "Maturity, coverage, and source quality constrain the reading.",
      },
    ],
  },
  {
    id: "translation",
    label: "Decision",
    title: "What can we responsibly conclude?",
    description:
      "A bounded conclusion or next diligence step. It does not turn interpretation into fact.",
    state: "unresolved",
    metadata: "Decision · implication",
    context: "Justified by the evidence",
  },
];

function uncertaintyAnchor(items: EvidenceFieldItem[]): number {
  const byId = items.findIndex((item) => item.id === "evidence");
  if (byId >= 0) return byId;
  const byLabel = items.findIndex(
    (item) => item.label.toLowerCase() === "evidence",
  );
  if (byLabel >= 0) return byLabel;
  return items.length > 1 ? 1 : -1;
}

/**
 * Presents the question → evidence → uncertainty → decision pathway.
 * Presentation only: it does not classify records or score evidence.
 */
export function EvidenceField({
  eyebrow = "Evidence architecture",
  question = "How a record becomes a decision",
  uncertainty =
    "What remains unknown, weakly supported, or insufficiently documented?",
  uncertaintyFacets = DEFAULT_UNCERTAINTY_FACETS,
  items = DEFAULT_ITEMS,
}: EvidenceFieldProps) {
  const headingId = useId();
  const uncertaintyId = useId();
  const anchor = uncertaintyAnchor(items);

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 id={headingId} className={styles.question}>
          {question}
        </h2>
        <p className={styles.supportingText}>
          Source-verified observations, analytical interpretation, explicit
          uncertainty, and decision implications stay distinct.
        </p>
      </header>

      <ol className={styles.panelList}>
        {items.map((item, index) => {
          const layers = item.layers ?? [];
          const hasLayers = layers.length > 0;
          const showRecordMeta = Boolean(
            item.context || item.source || item.limitation || item.confidence,
          ) && !hasLayers;

          return (
            <li key={item.id} className={styles.panelItem}>
              <article className={styles.panel}>
                <div className={styles.panelContent}>
                  <div className={styles.panelHeading}>
                    <span className={styles.index}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className={styles.label}>{item.label}</span>
                  </div>

                  <h3 className={styles.title}>{item.title}</h3>
                  <p className={styles.description}>{item.description}</p>

                  {hasLayers
                    ? (
                      <dl className={styles.layers}>
                        {layers.map((layer) => (
                          <div
                            key={layer.id}
                            className={styles.layer}
                            data-kind={layer.kind}
                          >
                            <dt>{layer.label}</dt>
                            <dd>{layer.detail}</dd>
                          </div>
                        ))}
                      </dl>
                    )
                    : null}

                  {showRecordMeta
                    ? (
                      <dl className={styles.evidenceMeta}>
                        {item.context
                          ? (
                            <div>
                              <dt>Context</dt>
                              <dd>{item.context}</dd>
                            </div>
                          )
                          : null}
                        {item.source
                          ? (
                            <div>
                              <dt>Source</dt>
                              <dd>
                                {item.source.href
                                  ? (
                                    <a href={item.source.href}>
                                      {item.source.label}
                                    </a>
                                  )
                                  : item.source.label}
                              </dd>
                            </div>
                          )
                          : null}
                        {item.limitation
                          ? (
                            <div>
                              <dt>Limitation</dt>
                              <dd>{item.limitation}</dd>
                            </div>
                          )
                          : null}
                        {item.confidence
                          ? (
                            <div>
                              <dt>Status</dt>
                              <dd>{item.confidence}</dd>
                            </div>
                          )
                          : null}
                      </dl>
                    )
                    : null}

                  {item.source && hasLayers
                    ? (
                      <p className={styles.sourceLine}>
                        <span className={styles.sourceLabel}>Source</span>{" "}
                        {item.source.href
                          ? <a href={item.source.href}>{item.source.label}</a>
                          : item.source.label}
                      </p>
                    )
                    : null}

                  {index === anchor
                    ? (
                      <aside
                        className={styles.uncertainty}
                        aria-labelledby={uncertaintyId}
                      >
                        <h4
                          id={uncertaintyId}
                          className={styles.uncertaintyLabel}
                        >
                          Explicit uncertainty
                        </h4>
                        <p className={styles.uncertaintyText}>{uncertainty}</p>
                        {uncertaintyFacets.length > 0
                          ? (
                            <ul className={styles.facetList}>
                              {uncertaintyFacets.map((facet) => (
                                <li key={facet.id} className={styles.facet}>
                                  <span className={styles.facetLabel}>
                                    {facet.label}
                                  </span>
                                  <span className={styles.facetDetail}>
                                    {facet.detail}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )
                          : null}
                      </aside>
                    )
                    : null}

                  <p className={styles.panelFooter}>
                    <span className={styles.metadata}>{item.metadata}</span>
                    <span className={styles.state}>State · {item.state}</span>
                  </p>
                </div>
              </article>
            </li>
          );
        })}
      </ol>

      <footer className={styles.method}>
        <p>
          <span className={styles.methodLabel}>Method</span>{" "}
          — Question → evidence → uncertainty → decision.
        </p>
        <p>Every step stays traceable to the underlying record.</p>
      </footer>
    </section>
  );
}
