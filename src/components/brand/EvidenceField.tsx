import { Fragment, useId } from "react";
import styles from "./EvidenceField.module.css";

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
};

export type EvidenceFieldProps = {
  eyebrow?: string;
  question?: string;
  uncertainty?: string;
  items?: EvidenceFieldItem[];
};

const DEFAULT_ITEMS: EvidenceFieldItem[] = [
  {
    id: "need",
    label: "Need",
    title: "Clinical burden",
    description:
      "Start with the patient and clinical context that makes the unmet need visible.",
    state: "observed",
    metadata: "BURDEN · CONTEXT",
    context: "Clinical need and population context",
    confidence: "supported",
  },
  {
    id: "evidence",
    label: "Evidence",
    title: "Validation context",
    description:
      "Trace the evidence that supports the question while retaining its limits and maturity.",
    state: "emerging",
    metadata: "EVIDENCE · MATURITY",
    context: "Available clinical and scientific record",
    limitation:
      "Evidence maturity, coverage, and source quality may constrain interpretation.",
    confidence: "emerging",
  },
  {
    id: "translation",
    label: "Translation",
    title: "Actionable question",
    description:
      "Carry what is known into a decision frame without smoothing over what remains unresolved.",
    state: "unresolved",
    metadata: "PATHWAY · NEXT STEP",
    context: "Decision pathway and remaining diligence",
    confidence: "emerging",
  },
];

/**
 * A structural evidence pathway for pairing visible research signals with
 * explicit uncertainty. It is intentionally route-agnostic for later reuse.
 */
export function EvidenceField({
  eyebrow = "Evidence field",
  question =
    "Where clinical need is clear, investable visibility is often not.",
  uncertainty =
    "What remains unknown, weakly observed, or insufficiently translated?",
  items = DEFAULT_ITEMS,
}: EvidenceFieldProps) {
  const headingId = useId();
  const uncertaintyId = useId();

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 id={headingId} className={styles.question}>
          {question}
        </h2>
        <p className={styles.supportingText}>
          Lacuna brings biological, clinical, and market context into a single
          evidence-led view while preserving what remains unknown.
        </p>
      </header>

      <ol className={styles.panelList}>
        {items.map((item, index) => (
          <Fragment key={item.id}>
            <li className={styles.panelItem}>
              <article className={styles.panel}>
                <div className={styles.cellField} aria-hidden="true">
                  <span className={`${styles.cell} ${styles.cellOne}`} />
                  <span className={`${styles.cell} ${styles.cellTwo}`} />
                  <span className={`${styles.cell} ${styles.cellThree}`} />
                  <span className={styles.connector} />
                  <span className={styles.lacuna} />
                </div>

                <div className={styles.panelContent}>
                  <div className={styles.panelHeading}>
                    <span className={styles.index}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className={styles.label}>{item.label}</span>
                  </div>

                  <h3 className={styles.title}>{item.title}</h3>
                  <p className={styles.description}>{item.description}</p>

                  {(item.context ||
                    item.source ||
                    item.limitation ||
                    item.confidence) && (
                    <dl className={styles.evidenceMeta}>
                      {item.context && (
                        <div>
                          <dt>Context</dt>
                          <dd>{item.context}</dd>
                        </div>
                      )}

                      {item.source && (
                        <div>
                          <dt>Source</dt>
                          <dd>
                            {item.source.href ? (
                              <a href={item.source.href}>{item.source.label}</a>
                            ) : (
                              item.source.label
                            )}
                          </dd>
                        </div>
                      )}

                      {item.limitation && (
                        <div>
                          <dt>Limitation</dt>
                          <dd>{item.limitation}</dd>
                        </div>
                      )}

                      {item.confidence && (
                        <div>
                          <dt>Confidence</dt>
                          <dd>{item.confidence}</dd>
                        </div>
                      )}
                    </dl>
                  )}

                  <div className={styles.panelFooter}>
                    <span className={styles.metadata}>{item.metadata}</span>
                    <span className={styles.state}>State · {item.state}</span>
                  </div>
                </div>
              </article>
            </li>

            {index === 1 && (
              <li
                className={styles.uncertaintyItem}
                aria-labelledby={uncertaintyId}
              >
                <div className={styles.uncertainty}>
                  <p className={styles.uncertaintyLabel}>Explicit uncertainty</p>
                  <p id={uncertaintyId} className={styles.uncertaintyText}>
                    {uncertainty}
                  </p>
                </div>
              </li>
            )}
          </Fragment>
        ))}
      </ol>

      <footer className={styles.method}>
        <p>
          <span className={styles.methodLabel}>Method</span>{" "}
          — Question → evidence → explicit uncertainty → action.
        </p>
        <p>Structural prototype; color and imagery deferred.</p>
      </footer>
    </section>
  );
}
