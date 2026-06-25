"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import { LACUNA_SEMANTIC } from "@/lib/theme/palette";

const CHART = LACUNA_SEMANTIC.chart;

/* ── chart geometry ───────────────────────────────────── */
const W = 740;
const H = 480;
const ML = 72;
const MR = 32;
const MT = 40;
const MB = 64;
const PW = W - ML - MR;
const PH = H - MT - MB;
const GRID_TICKS = 5;

/* ── types ────────────────────────────────────────────── */
interface SectorPoint {
  readonly sector: string;
  readonly dealCount: number;
  readonly avgValuation: number;
  readonly companyCount: number;
  readonly companyShare: number;
  readonly dealShare: number;
  readonly radius: number;
  readonly isWhiteSpace: boolean;
  x: number;
  y: number;
}

interface WhiteSpaceAnalysisProps {
  showHeader?: boolean;
}

type ViewFilter = "all" | "whitespace";

/* ── helpers ──────────────────────────────────────────── */
function fmtVal(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}B`;
  if (v > 0) return `$${Math.round(v)}M`;
  return "$0";
}

function resolveCollisions(pts: SectorPoint[], padding: number = 6): void {
  const n = pts.length;
  for (let iter = 0; iter < 120; iter++) {
    let moved = false;
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        const dx = pts[b].x - pts[a].x;
        const dy = pts[b].y - pts[a].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const minDist = pts[a].radius + pts[b].radius + padding;
        if (dist < minDist) {
          const push = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          pts[a].x -= nx * push;
          pts[a].y -= ny * push;
          pts[b].x += nx * push;
          pts[b].y += ny * push;
          moved = true;
        }
      }
    }
    for (const p of pts) {
      p.x = Math.max(ML + p.radius + 2, Math.min(W - MR - p.radius - 2, p.x));
      p.y = Math.max(MT + p.radius + 2, Math.min(H - MB - p.radius - 2, p.y));
    }
    if (!moved) break;
  }
}

function labelPosition(p: SectorPoint): {
  lx: number;
  ly: number;
  outside: boolean;
} {
  if (p.radius >= 26) return { lx: p.x, ly: p.y, outside: false };
  const offset = p.radius + 14;
  let ly = p.y - offset;
  if (ly < MT + 14) ly = p.y + offset + 8;
  return { lx: p.x, ly, outside: true };
}

function splitLabel(sector: string): string[] {
  if (sector.length <= 12) return [sector];
  const words = sector.split(" ");
  if (words.length <= 1) return words;
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

/* ── component ────────────────────────────────────────── */
export default function WhiteSpaceAnalysis({
  showHeader = false,
}: WhiteSpaceAnalysisProps) {
  const { verifiedCompanies, verifiedAcquisitions } = useVerifiedDataset();
  const [hovered, setHovered] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");

  const handleEnter = useCallback((s: string) => setHovered(s), []);
  const handleLeave = useCallback(() => setHovered(null), []);

  const {
    sectorPoints,
    maxDealCount,
    maxAvgVal,
    whiteSpaceSectors,
    unplottedSectors,
  } = useMemo(() => {
    const companyById = new Map(
      verifiedCompanies.map((c) => [c.id, c]),
    );
    const totalCo = Math.max(1, verifiedCompanies.length);
    const totalDeals = Math.max(1, verifiedAcquisitions.length);
    const sectors = [...new Set(verifiedCompanies.map((c) => c.sector))].sort();

    const raw = sectors.map((sector) => {
      const cos = verifiedCompanies.filter((c) => c.sector === sector);
      const vals = cos
        .map((c) => c.lastKnownValuation)
        .filter((v): v is number => typeof v === "number");
      const avgV = vals.length > 0
        ? vals.reduce((s, v) => s + v, 0) / vals.length
        : 0;
      const deals = verifiedAcquisitions.filter((a) => {
        const t = companyById.get(a.targetId);
        return t?.sector === sector;
      }).length;
      return {
        sector,
        dealCount: deals,
        avgValuation: avgV,
        companyCount: cos.length,
        companyShare: cos.length / totalCo,
        dealShare: deals / totalDeals,
      };
    });

    const plottable = raw.filter(
      (p) => p.companyCount >= 2 || p.dealCount >= 1,
    );
    const unplotted = raw.filter(
      (p) => p.companyCount < 2 && p.dealCount === 0,
    );

    const maxD = Math.max(1, ...plottable.map((p) => p.dealCount));
    const maxV = Math.max(1, ...plottable.map((p) => p.avgValuation));

    const points: SectorPoint[] = plottable.map((p) => {
      const radius = Math.max(16, Math.min(40, Math.sqrt(p.companyCount) * 10));
      const xRatio = maxD === 0 ? 0 : p.dealCount / maxD;
      const yRatio = maxV === 0 ? 0 : p.avgValuation / maxV;
      const isWS = p.companyShare > p.dealShare;
      return {
        ...p,
        radius,
        x: ML + xRatio * PW,
        y: H - MB - yRatio * PH,
        isWhiteSpace: isWS,
      };
    });

    resolveCollisions(points);

    return {
      sectorPoints: points,
      maxDealCount: maxD,
      maxAvgVal: maxV,
      whiteSpaceSectors: points.filter((p) => p.isWhiteSpace),
      unplottedSectors: unplotted,
    };
  }, [verifiedCompanies, verifiedAcquisitions]);

  const hoveredPoint = sectorPoints.find((p) => p.sector === hovered) ?? null;

  const ticks = Array.from(
    { length: GRID_TICKS + 1 },
    (_, i) => i / GRID_TICKS,
  );

  const visiblePoints = viewFilter === "whitespace"
    ? sectorPoints.filter((p) => p.isWhiteSpace)
    : sectorPoints;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-2xl border border-lacuna-border bg-white/80 backdrop-blur-sm shadow-[0_1px_3px_rgba(93,78,109,0.06),0_8px_24px_rgba(93,78,109,0.04)]"
    >
      <div className="px-6 pt-5 pb-4">
        <CuratedDatasetBanner className="mb-4" />

        {/* header row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {showHeader && (
              <div>
                <h3 className="text-base font-semibold text-lacuna-text-primary tracking-tight">
                  White Space Analysis
                </h3>
                <p className="text-xs text-lacuna-text-muted mt-0.5">
                  High company density, low M&amp;A activity
                </p>
              </div>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-lacuna-pink/8 px-2.5 py-1 text-[11px] font-medium text-lacuna-plum tabular-nums">
              <span className="h-1.5 w-1.5 rounded-full bg-lacuna-plum/60" />
              {whiteSpaceSectors.length} white-space
            </span>
          </div>

          {/* segmented control */}
          <div className="flex rounded-lg bg-lacuna-surface-subtle p-0.5 text-[11px] font-medium">
            {(["all", "whitespace"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setViewFilter(v)}
                className={`rounded-md px-3 py-1 transition-all duration-200 ${
                  viewFilter === v
                    ? "bg-white text-lacuna-text-primary shadow-sm"
                    : "text-lacuna-text-muted hover:text-lacuna-text-secondary"
                }`}
              >
                {v === "all" ? "All sectors" : "White space"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── chart ──────────────────────────────────────── */}
      <div className="relative px-4 pb-2">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          style={{ fontFeatureSettings: "'tnum'" }}
        >
          <defs>
            <filter
              id="ws-glow"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter
              id="ws-shadow"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feDropShadow
                dx="0"
                dy="1"
                stdDeviation="2.5"
                floodColor="#5D4E6D"
                floodOpacity="0.08"
              />
            </filter>
            <radialGradient id="ws-grad-accent" cx="35%" cy="30%">
              <stop offset="0%" stopColor={CHART.accent} stopOpacity="0.35" />
              <stop offset="100%" stopColor={CHART.accent} stopOpacity="0.10" />
            </radialGradient>
            <radialGradient id="ws-grad-secondary" cx="35%" cy="30%">
              <stop
                offset="0%"
                stopColor={CHART.secondary}
                stopOpacity="0.38"
              />
              <stop
                offset="100%"
                stopColor={CHART.secondary}
                stopOpacity="0.12"
              />
            </radialGradient>
            <linearGradient id="ws-zone-bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={CHART.accent} stopOpacity="0.03" />
              <stop offset="100%" stopColor={CHART.accent} stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* white-space zone hint */}
          <rect
            x={ML}
            y={H - MB - PH * 0.45}
            width={PW * 0.35}
            height={PH * 0.45}
            rx={6}
            fill="url(#ws-zone-bg)"
          />

          {/* gridlines — subtle dots */}
          {ticks.map((t) => {
            const gx = ML + t * PW;
            const gy = H - MB - t * PH;
            return (
              <g key={`grid-${t}`}>
                {t > 0 && (
                  <line
                    x1={ML}
                    y1={gy}
                    x2={W - MR}
                    y2={gy}
                    stroke={CHART.grid}
                    strokeWidth={0.5}
                    strokeDasharray="2,5"
                  />
                )}
                {t > 0 && (
                  <line
                    x1={gx}
                    y1={MT}
                    x2={gx}
                    y2={H - MB}
                    stroke={CHART.grid}
                    strokeWidth={0.5}
                    strokeDasharray="2,5"
                  />
                )}
              </g>
            );
          })}

          {/* axes — thin and refined */}
          <line
            x1={ML}
            y1={H - MB}
            x2={W - MR}
            y2={H - MB}
            stroke={CHART.axis}
            strokeWidth={1}
            opacity={0.5}
          />
          <line
            x1={ML}
            y1={MT}
            x2={ML}
            y2={H - MB}
            stroke={CHART.axis}
            strokeWidth={1}
            opacity={0.5}
          />

          {/* trend line */}
          <line
            x1={ML}
            y1={H - MB}
            x2={W - MR}
            y2={MT}
            stroke={CHART.axis}
            strokeWidth={0.8}
            strokeDasharray="4,8"
            opacity={0.25}
          />

          {/* axis ticks & labels */}
          {ticks.map((t) => {
            const gx = ML + t * PW;
            const gy = H - MB - t * PH;
            return (
              <g key={`tick-${t}`}>
                <text
                  x={gx}
                  y={H - MB + 18}
                  textAnchor="middle"
                  className="text-[9px] fill-lacuna-text-muted"
                  opacity={0.7}
                >
                  {Math.round(maxDealCount * t)}
                </text>
                <text
                  x={ML - 8}
                  y={gy + 3}
                  textAnchor="end"
                  className="text-[9px] fill-lacuna-text-muted"
                  opacity={0.7}
                >
                  {fmtVal(maxAvgVal * t)}
                </text>
              </g>
            );
          })}

          {/* axis titles */}
          <text
            x={(ML + W - MR) / 2}
            y={H - 14}
            textAnchor="middle"
            className="text-[10px] fill-lacuna-text-muted font-medium"
            opacity={0.6}
          >
            Deal Count
          </text>
          <text
            x={14}
            y={(MT + H - MB) / 2}
            textAnchor="middle"
            transform={`rotate(-90 14 ${(MT + H - MB) / 2})`}
            className="text-[10px] fill-lacuna-text-muted font-medium"
            opacity={0.6}
          >
            Average Valuation
          </text>

          {/* legend — minimal */}
          <g transform={`translate(${ML + 4}, ${MT + 6})`}>
            <circle
              cx={5}
              cy={0}
              r={4}
              fill="url(#ws-grad-accent)"
              stroke={CHART.accent}
              strokeWidth={1.2}
            />
            <text
              x={14}
              y={3}
              className="text-[9px] font-medium"
              fill={CHART.accent}
              opacity={0.8}
            >
              White Space
            </text>
            <circle
              cx={95}
              cy={0}
              r={4}
              fill="url(#ws-grad-secondary)"
              stroke={CHART.secondary}
              strokeWidth={1.2}
            />
            <text
              x={104}
              y={3}
              className="text-[9px] font-medium"
              fill={CHART.axis}
              opacity={0.8}
            >
              Active M&amp;A
            </text>
          </g>

          {/* bubble size legend */}
          <g transform={`translate(${W - MR - 90}, ${MT + 2})`}>
            <text
              x={0}
              y={0}
              className="text-[8px] fill-lacuna-text-muted font-medium"
              opacity={0.5}
            >
              Size = companies
            </text>
          </g>

          {/* bubbles with CSS transitions */}
          {sectorPoints.map((p) => {
            const isH = hovered === p.sector;
            const { lx, ly, outside } = labelPosition(p);
            const lines = splitLabel(p.sector);
            const filtered = viewFilter === "whitespace" && !p.isWhiteSpace;
            const dimmed = (hovered !== null && !isH) || filtered;
            return (
              <g
                key={p.sector}
                onMouseEnter={() => !filtered && handleEnter(p.sector)}
                onMouseLeave={handleLeave}
                style={{
                  cursor: filtered ? "default" : "pointer",
                  transition: "opacity 200ms ease",
                  opacity: filtered ? 0.12 : dimmed ? 0.35 : 1,
                }}
              >
                {/* ambient glow on hover */}
                {isH && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={p.radius + 8}
                    fill={p.isWhiteSpace ? CHART.accent : CHART.secondary}
                    opacity={0.12}
                    filter="url(#ws-glow)"
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isH ? p.radius + 2 : p.radius}
                  fill={p.isWhiteSpace
                    ? "url(#ws-grad-accent)"
                    : "url(#ws-grad-secondary)"}
                  stroke={p.isWhiteSpace ? CHART.accent : CHART.secondary}
                  strokeWidth={isH ? 2 : 1.2}
                  filter="url(#ws-shadow)"
                  style={{
                    transition: "r 200ms ease, stroke-width 200ms ease",
                  }}
                />
                {/* leader line */}
                {outside && !filtered && (
                  <line
                    x1={p.x}
                    y1={ly > p.y ? p.y + p.radius + 1 : p.y - p.radius - 1}
                    x2={lx}
                    y2={ly > p.y ? ly - 10 : ly + 4}
                    stroke={CHART.axis}
                    strokeWidth={0.6}
                    opacity={dimmed ? 0.15 : 0.4}
                    style={{ transition: "opacity 200ms ease" }}
                  />
                )}
                {/* label */}
                {!filtered && (
                  <text
                    x={lx}
                    y={ly - (lines.length - 1) * 5}
                    textAnchor="middle"
                    className="fill-lacuna-text-primary text-[8.5px] font-medium pointer-events-none"
                    style={{
                      transition: "opacity 200ms ease",
                      opacity: dimmed ? 0.3 : 0.9,
                    }}
                  >
                    {lines.map((line, i) => (
                      <tspan key={line} x={lx} dy={i === 0 ? 0 : 10}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* tooltip — frosted glass */}
        <AnimatePresence>
          {hoveredPoint && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 6 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="absolute top-3 right-3 w-52 rounded-xl border border-white/40 bg-white/90 backdrop-blur-md shadow-[0_4px_24px_rgba(93,78,109,0.12),0_1px_4px_rgba(93,78,109,0.06)] pointer-events-none z-10 overflow-hidden"
            >
              {/* accent bar */}
              <div
                className="h-0.5"
                style={{
                  background: hoveredPoint.isWhiteSpace
                    ? CHART.accent
                    : CHART.secondary,
                }}
              />
              <div className="px-3.5 py-3">
                <p className="text-[13px] font-semibold text-lacuna-text-primary tracking-tight leading-tight">
                  {hoveredPoint.sector}
                </p>
                {hoveredPoint.isWhiteSpace && (
                  <span className="mt-1 inline-block rounded-full bg-lacuna-pink/10 px-2 py-0.5 text-[9px] font-medium text-lacuna-plum">
                    White space
                  </span>
                )}
                <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2">
                  <MetricCell
                    label="Companies"
                    value={String(hoveredPoint.companyCount)}
                  />
                  <MetricCell
                    label="Deals"
                    value={String(hoveredPoint.dealCount)}
                  />
                  <MetricCell
                    label="Avg valuation"
                    value={fmtVal(hoveredPoint.avgValuation)}
                  />
                  <MetricCell
                    label="Market share"
                    value={`${(hoveredPoint.companyShare * 100).toFixed(1)}%`}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── sector cards ───────────────────────────────── */}
      <div className="border-t border-lacuna-border/50 px-6 py-5">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-lacuna-text-muted">
            White-space sectors
          </h4>
          <span className="text-[10px] text-lacuna-text-muted tabular-nums">
            {whiteSpaceSectors.length} of {visiblePoints.length} plotted
          </span>
        </div>
        {whiteSpaceSectors.length > 0
          ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {whiteSpaceSectors.map((p) => (
                <motion.div
                  key={p.sector}
                  onHoverStart={() => handleEnter(p.sector)}
                  onHoverEnd={handleLeave}
                  whileHover={{ y: -1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="group rounded-lg border border-lacuna-border/40 bg-lacuna-surface-muted/50 px-3 py-2.5 cursor-default hover:border-lacuna-border hover:shadow-sm transition-[border-color,box-shadow] duration-200"
                >
                  <p className="text-[13px] font-medium text-lacuna-text-primary leading-tight">
                    {p.sector}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Chip label={`${p.companyCount} cos`} />
                    <Chip label={`${p.dealCount} deals`} />
                    <Chip label={fmtVal(p.avgValuation)} />
                  </div>
                </motion.div>
              ))}
            </div>
          )
          : (
            <div className="rounded-lg border border-lacuna-border/30 bg-lacuna-surface-muted/50 p-3 text-xs text-lacuna-text-muted">
              No sector currently screens as white space.
            </div>
          )}
        {unplottedSectors.length > 0 && (
          <p className="mt-3 text-[10px] text-lacuna-text-muted leading-relaxed">
            Not plotted (single tracked company, no deals):{" "}
            {unplottedSectors.map((p) => p.sector).join(", ")}.
          </p>
        )}
      </div>
    </motion.div>
  );
}

/* ── sub-components ────────────────────────────────────── */
function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] text-lacuna-text-muted leading-none">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-lacuna-text-primary tabular-nums leading-tight">
        {value}
      </p>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-lacuna-surface-subtle px-1.5 py-0.5 text-[10px] font-medium text-lacuna-text-secondary tabular-nums">
      {label}
    </span>
  );
}
