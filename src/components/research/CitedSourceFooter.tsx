interface CitedSource {
  label: string;
  reference: string;
  url: string;
}

export function CitedSourceFooter({
  sources,
}: {
  sources: readonly CitedSource[];
}) {
  return (
    <div className="border-t border-lacuna-lavender/30 pt-3">
      <p className="text-[11px] font-medium text-lacuna-text-secondary mb-1">
        Sources
      </p>
      <ul className="space-y-1 text-[11px] text-lacuna-blue">
        {sources.map((s) => (
          <li key={s.label}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-lacuna-plum"
            >
              {s.label}
            </a>
            {" — "}
            {s.reference}
          </li>
        ))}
      </ul>
    </div>
  );
}
