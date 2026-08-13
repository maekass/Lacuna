import type { ReactNode } from "react";

export function Uncovered({ value }: { value: number }) {
  return <span>{value.toFixed(1)}</span>;
}

export function Nullable({ value }: { value: number | null }) {
  return <span>{value}</span>;
}

export function ReactNodeValue({ children }: { children: ReactNode }) {
  return <span>{children}</span>;
}
