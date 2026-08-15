import Metric from "@/components/Metric";

export function Covered({ value }: { value: number }) {
  return <Metric>{value.toFixed(1)}</Metric>;
}
