import { useId } from "react";
import styles from "./EvidenceField.module.css";

export type EvidenceFieldItem = {
  id: string;
  label: string;
  title: string;
  description: string;
  state: "observed" | "emerging" | "unresolved";
  metadata: string;
};

export type EvidenceFieldProps = {
  eyebrow?: string;
  question?: string;
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
  },
  {
    id: "evidence",
    label: "Evidence",
    title: "Validation context",
    description:
      "Trace the evidence that supports the question while retaining its limits and maturity.",
    state: "emerging",
    metadata: "EVIDENCE · MATURITY",
  },
  {
    id: "translation",
    label: "Translation",
    title: "Actionable question",
    description:
      "Carry what is known into a decision frame without smoothing over what remains unresolved.",
    state: "unresolved",
    metadata: "PATHWAY · NEXT STEP",
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
  items = DEFAULT_ITEMS,
}: EvidenceFieldProps) {
  const headingId = useId();

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
          <li key={item.id} className={styles.panelItem}>
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

                <div className={styles.panelFooter}>
                  <span className={styles.metadata}>{item.metadata}</span>
                  <span className={styles.state}>State · {item.state}</span>
                </div>
              </div>
            </article>
          </li>
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
