export function Uncovered({ value }: { value: number }) {
  return <span>{value.toFixed(1)}</span>;
}

export function Nullable({ value }: { value: number | null }) {
  return <span>{value}</span>;
}
