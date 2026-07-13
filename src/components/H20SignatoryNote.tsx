/** G20 & G7 Health and Development Partnership — H20 Summit (Aug 2024). */
export const H20_CALL_TO_ACTION_URL =
  "https://www.icn.ch/sites/default/files/2024-08/H20%20Call%20to%20action%20-%20Final%20version.pdf";

interface H20SignatoryNoteProps {
  className?: string;
}

export default function H20SignatoryNote({ className }: H20SignatoryNoteProps) {
  return (
    <p className={className}>
      Signatory to the{" "}
      <a
        href={H20_CALL_TO_ACTION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-lacuna-lavender/50 hover:text-lacuna-plum transition-colors"
      >
        G20 &amp; G7 HDP H20 Call to Action
      </a>{" "}
      on global health diplomacy (Aug 2024).
    </p>
  );
}
