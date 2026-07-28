import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { displayFont, labelFont } from "@/lib/theme/typography";

interface MetricTileProps {
  value: ReactNode;
  /** Uppercase caption rendered under the value. */
  label: ReactNode;
  className?: string;
  valueClassName?: string;
}

/** Muted-surface tile pairing a display-font value with an uppercase label. */
export default function MetricTile({
  value,
  label,
  className,
  valueClassName,
}: MetricTileProps) {
  return (
    <div
      className={cn(
        "bg-lacuna-surface-muted p-3 rounded-lg text-center",
        className,
      )}
    >
      <div
        className={cn("text-2xl font-light", valueClassName)}
        style={displayFont}
      >
        {value}
      </div>
      <div
        className="text-xs text-lacuna-text-muted uppercase mt-1"
        style={labelFont}
      >
        {label}
      </div>
    </div>
  );
}
