import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface ChartTooltipProps {
  title?: string;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/** Floating tooltip panel for D3/SVG chart hover states. */
export default function ChartTooltip({
  title,
  children,
  className,
  style,
}: ChartTooltipProps) {
  return (
    <div
      role="tooltip"
      className={cn(
        "pointer-events-none z-10 rounded-lg border border-lacuna-border-subtle bg-lacuna-surface-inverse px-3 py-2 text-xs text-lacuna-text-inverse shadow-xl",
        className,
      )}
      style={style}
    >
      {title
        ? (
          <p className="mb-1 font-semibold text-lacuna-text-inverse">{title}</p>
        )
        : null}
      <div className="space-y-0.5 text-lacuna-text-inverse/90">{children}</div>
    </div>
  );
}
