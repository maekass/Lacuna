import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import {
  displayFontUppercase,
  labelFontUppercase,
} from "@/lib/theme/typography";

interface AnalysisPanelHeaderProps {
  title: ReactNode;
  /** Uppercase strapline under the title (usually method | caveat pairs). */
  subtitle?: ReactNode;
  /** `lg` is the default panel scale; `md` is used by denser report panels. */
  size?: "md" | "lg";
  className?: string;
}

const TITLE_SIZE = { md: "text-xl", lg: "text-2xl" } as const;
const SUBTITLE_SIZE = { md: "text-xs", lg: "text-sm" } as const;

/** Rule-separated title + strapline used at the top of analysis panels. */
export default function AnalysisPanelHeader({
  title,
  subtitle,
  size = "lg",
  className,
}: AnalysisPanelHeaderProps) {
  return (
    <div
      className={cn("border-b border-lacuna-border pb-4", className)}
    >
      <h3
        className={cn(TITLE_SIZE[size], "font-light tracking-tight")}
        style={displayFontUppercase}
      >
        {title}
      </h3>
      {subtitle
        ? (
          <p
            className={cn(
              SUBTITLE_SIZE[size],
              "tracking-widest text-lacuna-text-muted mt-1",
            )}
            style={labelFontUppercase}
          >
            {subtitle}
          </p>
        )
        : null}
    </div>
  );
}
