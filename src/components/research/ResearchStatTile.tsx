export function ResearchStatTile({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-lg border border-lacuna-lavender/40 bg-lacuna-pink/10 p-3">
      <p className="text-xl font-bold text-lacuna-plum tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-lacuna-blue">{label}</p>
    </div>
  );
}
