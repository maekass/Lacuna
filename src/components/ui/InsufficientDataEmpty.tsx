interface InsufficientDataEmptyProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Honest empty panel for missing disclosed rows or a filter that matches nothing.
 * Copy is supplied by the caller so this never invents a benchmark.
 */
export default function InsufficientDataEmpty({
  title,
  description,
  actionLabel,
  onAction,
}: InsufficientDataEmptyProps) {
  return (
    <div className="rounded-xl border border-dashed border-lacuna-lavender/60 bg-white/70 px-4 py-6 text-center">
      <p className="text-sm font-medium text-lacuna-plum">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-lacuna-blue/80">
        {description}
      </p>
      {actionLabel && onAction
        ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-3 rounded-full border border-lacuna-lavender/50 px-3 py-1 text-xs font-medium text-lacuna-plum transition-colors hover:bg-lacuna-lavender/20"
          >
            {actionLabel}
          </button>
        )
        : null}
    </div>
  );
}
