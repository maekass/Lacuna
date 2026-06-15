"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import { LACUNA_SEMANTIC } from "@/lib/theme/palette";

const CHART = LACUNA_SEMANTIC.chart;
const ACCENT_FILL = `${CHART.accent}33`;
const SECONDARY_FILL = `${CHART.secondary}33`;

interface WhiteSpaceAnalysisProps {
  /** When false (default), omit title — parent SectionHeader supplies it. */
  showHeader?: boolean;
}

const CHART_WIDTH = 680;
const CHART_HEIGHT = 420;
const LEFT_MARGIN = 72;
const RIGHT_MARGIN = 36;
const TOP_MARGIN = 36;
const BOTTOM_MARGIN = 72;

interface SectorPoint {
  readonly sector: string;
  readonly dealCount: number;
  readonly avgValuation: number;
  readonly companyCount: number;
  readonly companyShare: number;
  readonly dealShare: number;
  readonly radius: number;
  readonly x: number;
  readonly y: number;
  readonly isWhiteSpace: boolean;
}

function formatValuation(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${Math.round(value)}M`;
}

function sectorLabelLines(sector: string): string[] {
  return sector.split(" ");
}

export default function WhiteSpaceAnalysis(
  { showHeader = false }: WhiteSpaceAnalysisProps,
) {
  const { verifiedCompanies, verifiedAcquisitions } = useVerifiedDataset();

  const {
    sectorPoints,
    maxDealCount,
    maxAvgValuation,
    whiteSpaceSectors,
    unplottedSectors,
  } = useMemo(() => {
    const companyById = new Map(
      verifiedCompanies.map((company) => [company.id, company]),
    );
    const totalCompanies = Math.max(1, verifiedCompanies.length);
    const totalDeals = Math.max(1, verifiedAcquisitions.length);

    // Derive sectors from the dataset so every tracked company is covered.
    const sectors = [...new Set(verifiedCompanies.map((c) => c.sector))].sort();

    const rawPoints = sectors.map((sector) => {
      const sectorCompanies = verifiedCompanies.filter((company) =>
        company.sector === sector
      );
      const valuations = sectorCompanies
        .map((company) => company.lastKnownValuation)
        .filter((value): value is number => typeof value === "number");
      const avgValuation = valuations.length > 0
        ? valuations.reduce((sum, value) => sum + value, 0) / valuations.length
        : 0;
      const dealCount = verifiedAcquisitions.filter((acquisition) => {
        const target = companyById.get(acquisition.targetId);
        return target?.sector === sector;
      }).length;
      const companyCount = sectorCompanies.length;

      return {
        sector,
        dealCount,
        avgValuation,
        companyCount,
        companyShare: companyCount / totalCompanies,
        dealShare: dealCount / totalDeals,
      };
    });

    // Singleton sectors with no deal history would all stack at the chart
    // origin — list them separately instead of plotting an unreadable pile.
    const plottable = rawPoints.filter(
      (point) => point.companyCount >= 2 || point.dealCount >= 1,
    );
    const unplotted = rawPoints.filter(
      (point) => point.companyCount < 2 && point.dealCount === 0,
    );

    const maxDeals = Math.max(1, ...plottable.map((point) => point.dealCount));
    const maxValuation = Math.max(
      1,
      ...plottable.map((point) => point.avgValuation),
    );
    const plotWidth = CHART_WIDTH - LEFT_MARGIN - RIGHT_MARGIN;
    const plotHeight = CHART_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN;

    const plotted = plottable.map((point) => {
      const radius = Math.max(18, Math.sqrt(point.companyCount) * 10);
      const xRatio = maxDeals === 0 ? 0 : point.dealCount / maxDeals;
      const yRatio = maxValuation === 0 ? 0 : point.avgValuation / maxValuation;
      const rawX = LEFT_MARGIN + xRatio * plotWidth;
      const rawY = CHART_HEIGHT - BOTTOM_MARGIN - yRatio * plotHeight;
      const x = Math.min(
        CHART_WIDTH - RIGHT_MARGIN - radius,
        Math.max(LEFT_MARGIN + radius, rawX),
      );
      const y = Math.min(
        CHART_HEIGHT - BOTTOM_MARGIN - radius,
        Math.max(TOP_MARGIN + radius, rawY),
      );
      const isWhiteSpace = point.companyShare > point.dealShare;

      return {
        ...point,
        radius,
        x,
        y,
        isWhiteSpace,
      } satisfies SectorPoint;
    });

    return {
      sectorPoints: plotted,
      maxDealCount: maxDeals,
      maxAvgValuation: maxValuation,
      whiteSpaceSectors: plotted.filter((point) => point.isWhiteSpace),
      unplottedSectors: unplotted,
    };
  }, [verifiedCompanies, verifiedAcquisitions]);

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
              Deal activity vs. company density across the verified women&apos;s
              health landscape
            </p>
          </div>
        )}
        <span className="rounded-full bg-lacuna-pink/10 px-3 py-1 text-xs font-medium text-lacuna-plum">
          {whiteSpaceSectors.length}{" "}
          white-space sector{whiteSpaceSectors.length === 1 ? "" : "s"}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full h-auto"
      >
        <line
          x1={LEFT_MARGIN}
          y1={CHART_HEIGHT - BOTTOM_MARGIN}
          x2={CHART_WIDTH - RIGHT_MARGIN}
          y2={CHART_HEIGHT - BOTTOM_MARGIN}
          stroke={CHART.grid}
          strokeWidth={1.5}
        />
        <line
          x1={LEFT_MARGIN}
          y1={TOP_MARGIN}
          x2={LEFT_MARGIN}
          y2={CHART_HEIGHT - BOTTOM_MARGIN}
          stroke={CHART.grid}
          strokeWidth={1.5}
        />
        <line
          x1={LEFT_MARGIN}
          y1={CHART_HEIGHT - BOTTOM_MARGIN}
          x2={CHART_WIDTH - RIGHT_MARGIN}
          y2={TOP_MARGIN}
          stroke={CHART.axis}
          strokeWidth={1.5}
          strokeDasharray="6,6"
        />
        <text
          x={LEFT_MARGIN + 24}
          y={TOP_MARGIN + 18}
          fill={CHART.accent}
          className="text-xs font-semibold"
        >
          ⬦ White Space
        </text>
        {[0, 0.5, 1].map((tick) => {
          const x = LEFT_MARGIN +
            tick * (CHART_WIDTH - LEFT_MARGIN - RIGHT_MARGIN);
          const y = CHART_HEIGHT - BOTTOM_MARGIN -
            tick * (CHART_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN);
          return (
            <g key={tick}>
              <line
                x1={x}
                y1={CHART_HEIGHT - BOTTOM_MARGIN}
                x2={x}
                y2={CHART_HEIGHT - BOTTOM_MARGIN + 6}
                stroke={CHART.axis}
                strokeWidth={1}
              />
              <text
                x={x}
                y={CHART_HEIGHT - BOTTOM_MARGIN + 22}
                textAnchor="middle"
                className="text-xs fill-lacuna-text-muted"
              >
                {Math.round(maxDealCount * tick)}
              </text>
              <line
                x1={LEFT_MARGIN - 6}
                y1={y}
                x2={LEFT_MARGIN}
                y2={y}
                stroke={CHART.axis}
                strokeWidth={1}
              />
              <text
                x={LEFT_MARGIN - 10}
                y={y + 4}
                textAnchor="end"
                className="text-xs fill-lacuna-text-muted"
              >
                {formatValuation(maxAvgValuation * tick)}
              </text>
            </g>
          );
        })}
        <text
          x={(LEFT_MARGIN + CHART_WIDTH - RIGHT_MARGIN) / 2}
          y={CHART_HEIGHT - 20}
          textAnchor="middle"
          className="text-xs fill-lacuna-text-muted"
        >
          Deal Count
        </text>
        <text
          x={18}
          y={(TOP_MARGIN + CHART_HEIGHT - BOTTOM_MARGIN) / 2}
          textAnchor="middle"
          transform={`rotate(-90 18 ${
            (TOP_MARGIN + CHART_HEIGHT - BOTTOM_MARGIN) / 2
          })`}
          className="text-xs fill-lacuna-text-muted"
        >
          Average Valuation
        </text>
        {sectorPoints.map((point) => (
          <g key={point.sector}>
            <circle
              cx={point.x}
              cy={point.y}
              r={point.radius}
              fill={point.isWhiteSpace ? ACCENT_FILL : SECONDARY_FILL}
              stroke={point.isWhiteSpace ? CHART.accent : CHART.secondary}
              strokeWidth={2}
            />
            <text
              x={point.x}
              y={point.y - (sectorLabelLines(point.sector).length - 1) * 6}
              textAnchor="middle"
              className="fill-lacuna-text-primary text-[10px] font-semibold"
            >
              {sectorLabelLines(point.sector).map((line, index) => (
                <tspan
                  key={`${point.sector}-${line}`}
                  x={point.x}
                  dy={index === 0 ? 0 : 12}
                >
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        ))}
      </svg>

      <div className="mt-6 space-y-3">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-lacuna-text-primary">
          White-space sectors
        </h4>
        {whiteSpaceSectors.length > 0
          ? whiteSpaceSectors.map((point) => (
            <div
              key={point.sector}
              className="rounded-lg border border-lacuna-border-subtle bg-lacuna-surface-muted p-3 text-sm text-lacuna-text-secondary"
            >
              <span className="font-semibold text-lacuna-text-primary">
                {point.sector}
              </span>
              {": "}
              {point.companyCount} companies tracked, {point.dealCount}{" "}
              acquisitions — underrepresented in M&amp;A relative to market
              presence.
            </div>
          ))
          : (
            <div className="rounded-lg border border-lacuna-border-subtle bg-lacuna-surface-muted p-3 text-sm text-lacuna-text-muted">
              No sector currently screens as white space on the verified dataset
              mix.
            </div>
          )}
        {unplottedSectors.length > 0 && (
          <p className="text-xs text-lacuna-text-muted">
            Not plotted (single tracked company, no recorded deals):{" "}
            {unplottedSectors.map((point) => point.sector).join(", ")}.
          </p>
        )}
      </div>
    </motion.div>
  );
}
