"use client";

import { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import { LACUNA_SEMANTIC } from "@/lib/theme/palette";

const CHART = LACUNA_SEMANTIC.chart;

/* ── chart geometry ───────────────────────────────────── */
const W = 720;
const H = 500;
const ML = 78;
const MR = 40;
const MT = 44;
const MB = 76;
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
  const offset = p.radius + 16;
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

  const handleEnter = useCallback((s: string) => setHovered(s), []);
  const handleLeave = useCallback(() => setHovered(null), []);

  const { sectorPoints, maxDealCount, maxAvgVal, whiteSpaceSectors, unplottedSectors } =
    useMemo(() => {
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

  const ticks = Array.from({ length: GRID_TICKS + 1 }, (_, i) => i / GRID_TICKS);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-lacuna-border p-6"
    >
      <CuratedDatasetBanner className="mb-4" />
      <div
        className={`mb-4 flex items-center ${
          showHeader ? "justify-between" : "justify-end"
        }`}
      >
        {showHeader && (
          <div>
            <h3 className="text-lg font-semibold text-lacuna-text-primary">
              White Space Analysis
            </h3>
            <p className="text-sm text-lacuna-text-muted">
              Sectors with high company density but low M&amp;A activity
              &mdash; where the next wave may form.
            </p>
          </div>
        )}
        <span className="rounded-full bg-lacuna-pink/10 px-3 py-1 text-xs font-medium text-lacuna-plum">
          {whiteSpaceSectors.length} white-space sector
          {whiteSpaceSectors.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* ── chart ──────────────────────────────────────── */}
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
          <defs>
            <filter id="ws-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.10" />
            </filter>
            <radialGradient id="ws-grad-accent" cx="40%" cy="35%">
              <stop offset="0%" stopColor={CHART.accent} stopOpacity="0.28" />
              <stop offset="100%" stopColor={CHART.accent} stopOpacity="0.12" />
            </radialGradient>
            <radialGradient id="ws-grad-secondary" cx="40%" cy="35%">
              <stop offset="0%" stopColor={CHART.secondary} stopOpacity="0.32" />
              <stop offset="100%" stopColor={CHART.secondary} stopOpacity="0.14" />
            </radialGradient>
          </defs>

          {/* gridlines */}
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
                    strokeWidth={0.6}
                    strokeDasharray="3,4"
                  />
                )}
                {t > 0 && (
                  <line
                    x1={gx}
                    y1={MT}
                    x2={gx}
                    y2={H - MB}
                    stroke={CHART.grid}
                    strokeWidth={0.6}
                    strokeDasharray="3,4"
                  />
                )}
              </g>
            );
          })}

          {/* axes */}
          <line
            x1={ML}
            y1={H - MB}
            x2={W - MR}
            y2={H - MB}
            stroke={CHART.axis}
            strokeWidth={1.5}
          />
          <line
            x1={ML}
            y1={MT}
            x2={ML}
            y2={H - MB}
            stroke={CHART.axis}
            strokeWidth={1.5}
          />

          {/* trend line */}
          <line
            x1={ML}
            y1={H - MB}
            x2={W - MR}
            y2={MT}
            stroke={CHART.axis}
            strokeWidth={1.2}
            strokeDasharray="6,6"
            opacity={0.5}
          />

          {/* axis ticks & labels */}
          {ticks.map((t) => {
            const gx = ML + t * PW;
            const gy = H - MB - t * PH;
            return (
              <g key={`tick-${t}`}>
                <line
                  x1={gx}
                  y1={H - MB}
                  x2={gx}
                  y2={H - MB + 5}
                  stroke={CHART.axis}
                  strokeWidth={1}
                />
                <text
                  x={gx}
                  y={H - MB + 20}
                  textAnchor="middle"
                  className="text-[10px] fill-lacuna-text-muted"
                >
                  {Math.round(maxDealCount * t)}
                </text>
                <line
                  x1={ML - 5}
                  y1={gy}
                  x2={ML}
                  y2={gy}
                  stroke={CHART.axis}
                  strokeWidth={1}
                />
                <text
                  x={ML - 9}
                  y={gy + 4}
                  textAnchor="end"
                  className="text-[10px] fill-lacuna-text-muted"
                >
                  {fmtVal(maxAvgVal * t)}
                </text>
              </g>
            );
          })}

          {/* axis titles */}
          <text
            x={(ML + W - MR) / 2}
            y={H - 18}
            textAnchor="middle"
            className="text-xs fill-lacuna-text-muted"
          >
            Deal Count
          </text>
          <text
            x={16}
            y={(MT + H - MB) / 2}
            textAnchor="middle"
            transform={`rotate(-90 16 ${(MT + H - MB) / 2})`}
            className="text-xs fill-lacuna-text-muted"
          >
            Average Valuation
          </text>

          {/* legend */}
          <g transform={`translate(${ML + 8}, ${MT + 8})`}>
            <circle
              cx={7}
              cy={0}
              r={5}
              fill="url(#ws-grad-accent)"
              stroke={CHART.accent}
              strokeWidth={1.5}
            />
            <text
              x={18}
              y={4}
              className="text-[10px] font-semibold"
              fill={CHART.accent}
            >
              White Space
            </text>
            <circle
              cx={107}
              cy={0}
              r={5}
              fill="url(#ws-grad-secondary)"
              stroke={CHART.secondary}
              strokeWidth={1.5}
            />
            <text
              x={118}
              y={4}
              className="text-[10px] font-semibold"
              fill={CHART.axis}
            >
              Active M&amp;A
            </text>
          </g>

          {/* bubbles */}
          {sectorPoints.map((p) => {
            const isH = hovered === p.sector;
            const { lx, ly, outside } = labelPosition(p);
            const lines = splitLabel(p.sector);
            return (
              <g
                key={p.sector}
                onMouseEnter={() => handleEnter(p.sector)}
                onMouseLeave={handleLeave}
                style={{ cursor: "pointer" }}
              >
                {/* outer glow on hover */}
                {isH && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={p.radius + 6}
                    fill="none"
                    stroke={p.isWhiteSpace ? CHART.accent : CHART.secondary}
                    strokeWidth={2}
                    opacity={0.35}
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={p.radius}
                  fill={
                    p.isWhiteSpace
                      ? "url(#ws-grad-accent)"
                      : "url(#ws-grad-secondary)"
                  }
                  stroke={p.isWhiteSpace ? CHART.accent : CHART.secondary}
                  strokeWidth={isH ? 2.5 : 1.8}
                  filter="url(#ws-shadow)"
                  opacity={hovered && !isH ? 0.45 : 1}
                />
                {/* leader line */}
                {outside && (
                  <line
                    x1={p.x}
                    y1={ly > p.y ? p.y + p.radius + 1 : p.y - p.radius - 1}
                    x2={lx}
                    y2={ly > p.y ? ly - 10 : ly + 4}
                    stroke={CHART.axis}
                    strokeWidth={0.8}
                    opacity={hovered && !isH ? 0.3 : 0.55}
                  />
                )}
                {/* label */}
                <text
                  x={lx}
                  y={ly - (lines.length - 1) * 5}
                  textAnchor="middle"
                  className="fill-lacuna-text-primary text-[9px] font-semibold pointer-events-none"
                  opacity={hovered && !isH ? 0.4 : 1}
                >
                  {lines.map((line, i) => (
                    <tspan key={line} x={lx} dy={i === 0 ? 0 : 11}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>

        {/* tooltip */}
        <AnimatePresence>
          {hoveredPoint && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-2 right-2 rounded-lg border border-lacuna-border bg-white/95 backdrop-blur-sm shadow-md px-4 py-3 text-xs pointer-events-none z-10"
            >
              <p className="font-semibold text-lacuna-text-primary text-sm mb-1.5">
                {hoveredPoint.sector}
              </p>
              <div className="space-y-0.5 text-lacuna-text-secondary">
                <p>
                  <span className="text-lacuna-text-muted">Companies:</span>{" "}
                  {hoveredPoint.companyCount}
                </p>
                <p>
                  <span className="text-lacuna-text-muted">Deals:</span>{" "}
                  {hoveredPoint.dealCount}
                </p>
                <p>
                  <span className="text-lacuna-text-muted">Avg valuation:</span>{" "}
                  {fmtVal(hoveredPoint.avgValuation)}
                </p>
                <p>
                  <span className="text-lacuna-text-muted">Market share:</span>{" "}
                  {(hoveredPoint.companyShare * 100).toFixed(1)}%
                </p>
              </div>
              {hoveredPoint.isWhiteSpace && (
                <p className="mt-1.5 text-[10px] text-lacuna-plum font-medium">
                  High density, low M&amp;A — potential white space
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── sector list ────────────────────────────────── */}
      <div className="mt-6 space-y-3">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-lacuna-text-primary">
          White-space sectors
        </h4>
        {whiteSpaceSectors.length > 0 ? (
          whiteSpaceSectors.map((p) => (
            <div
              key={p.sector}
              className="rounded-lg border border-lacuna-border-subtle bg-lacuna-surface-muted p-3 text-sm text-lacuna-text-secondary"
            >
              <span className="font-semibold text-lacuna-text-primary">
                {p.sector}
              </span>
              {": "}
              {p.companyCount} companies tracked, {p.dealCount} acquisitions
              &mdash; underrepresented in M&amp;A relative to market presence.
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-lacuna-border-subtle bg-lacuna-surface-muted p-3 text-sm text-lacuna-text-muted">
            No sector currently screens as white space on the verified dataset
            mix.
          </div>
        )}
        {unplottedSectors.length > 0 && (
          <p className="text-xs text-lacuna-text-muted">
            Not plotted (single tracked company, no recorded deals):{" "}
            {unplottedSectors.map((p) => p.sector).join(", ")}.
          </p>
        )}
      </div>
    </motion.div>
  );
}
