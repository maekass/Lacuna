/**
 * Confidence Level Indicator
 *
 * Reusable component showing measurement vs proxy vs assumption
 * for any data point in the OAIS framework
 */

"use client";

export type ConfidenceLevel = "measured" | "proxy" | "assumption";

interface ConfidenceLevelIndicatorProps {
  level: ConfidenceLevel;
  label?: string;
  source?: string;
  limitation?: string;
  showIcon?: boolean;
  showTooltip?: boolean;
  size?: "sm" | "md" | "lg";
}

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, {
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: string;
  label: string;
  description: string;
}> = {
  measured: {
    color: "#22c55e",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    borderColor: "border-green-200",
    icon: "✓",
    label: "MEASURED",
    description: "Direct data from verified public source",
  },
  proxy: {
    color: "#eab308",
    bgColor: "bg-yellow-50",
    textColor: "text-yellow-700",
    borderColor: "border-yellow-200",
    icon: "~",
    label: "PROXY",
    description: "Indirect indicator; not direct measurement",
  },
  assumption: {
    color: "#ef4444",
    bgColor: "bg-red-50",
    textColor: "text-red-700",
    borderColor: "border-red-200",
    icon: "?",
    label: "ASSUMPTION",
    description: "Required estimate; not measurable from available data",
  },
};

export default function ConfidenceLevelIndicator({
  level,
  label,
  source,
  limitation,
  showIcon = true,
  showTooltip = true,
  size = "md",
}: ConfidenceLevelIndicatorProps) {
  const config = CONFIDENCE_CONFIG[level];

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-3 py-1.5",
  };

  return (
    <div className="inline-flex items-center gap-2 group relative">
      <span
        className={`${config.bgColor} ${config.textColor} ${
          sizeClasses[size]
        } rounded font-medium uppercase tracking-wider`}
        style={{ fontFamily: "'Arial Narrow', sans-serif" }}
      >
        {showIcon && <span className="mr-1">{config.icon}</span>}
        {label || config.label}
      </span>

      {showTooltip && (source || limitation) && (
        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10 w-64 p-3 bg-lacuna-surface-inverse text-white text-xs rounded-lg shadow-lg">
          <p className="font-medium mb-1">{config.description}</p>
          {source && (
            <p className="text-lacuna-text-muted/80 mt-2">
              <strong>Source:</strong> {source}
            </p>
          )}
          {limitation && (
            <p className="text-amber-300 mt-2">
              <strong>Limitation:</strong> {limitation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Legend component for confidence levels
export function ConfidenceLegend() {
  return (
    <div
      className="flex flex-wrap gap-3 text-xs"
      style={{ fontFamily: "'Arial Narrow', sans-serif" }}
    >
      <div className="flex items-center gap-2">
        <ConfidenceLevelIndicator level="measured" showTooltip={false} />
        <span className="text-lacuna-text-secondary">Direct measurement</span>
      </div>
      <div className="flex items-center gap-2">
        <ConfidenceLevelIndicator level="proxy" showTooltip={false} />
        <span className="text-lacuna-text-secondary">Indirect proxy</span>
      </div>
      <div className="flex items-center gap-2">
        <ConfidenceLevelIndicator level="assumption" showTooltip={false} />
        <span className="text-lacuna-text-secondary">Required assumption</span>
      </div>
    </div>
  );
}

// Composite component showing data point with confidence
interface DataPointWithConfidenceProps {
  label: string;
  value: string | number;
  level: ConfidenceLevel;
  source?: string;
  limitation?: string;
  unit?: string;
}

export function DataPointWithConfidence({
  label,
  value,
  level,
  source,
  limitation,
  unit,
}: DataPointWithConfidenceProps) {
  const config = CONFIDENCE_CONFIG[level];

  return (
    <div
      className={`p-3 rounded-lg border ${config.borderColor} ${config.bgColor}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div
            className="text-xs text-lacuna-text-muted uppercase tracking-wider mb-1"
            style={{ fontFamily: "'Arial Narrow', sans-serif" }}
          >
            {label}
          </div>
          <div
            className="text-lg font-light"
            style={{ fontFamily: "'Bodoni MT', Didot, serif" }}
          >
            {value}
            {unit && <span className="text-sm text-lacuna-text-muted ml-1">{unit}</span>}
          </div>
        </div>
        <ConfidenceLevelIndicator
          level={level}
          source={source}
          limitation={limitation}
          size="sm"
        />
      </div>
      {(source || limitation) && (
        <div className="mt-2 pt-2 border-t border-lacuna-border text-xs space-y-1">
          {source && (
            <p className="text-lacuna-text-secondary">
              <strong>Source:</strong> {source}
            </p>
          )}
          {limitation && (
            <p className="text-amber-600">
              <strong>Limitation:</strong> {limitation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
