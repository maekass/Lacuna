"use client";

/**
 * Kaplan-Meier time-to-acquisition survival curve.
 *
 * Origin: company founding year.
 * Event: acquisition announcement date.
 * Censoring: companies still active (unacquired) are right-censored at
 *   the dataset reference date (2026).
 *
 * Stratified by sector (top 4 by acquisition count).
 * Log-rank test p-value reported with BH correction noted.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import { type KMResult, stratifiedKM } from "@/lib/stats/survival";
import { benjaminiHochberg } from "@/lib/stats/fdr";

const REFERENCE_YEAR = 2026;
const MAX_GROUPS = 4;

const PALETTE = [
  "#7c5cbf", // lacuna-plum
  "#e879a0", // lacuna-pink
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
];

function pLabel(p: number): string {
  if (p < 0.001) return "p < 0.001";
  if (p < 0.01) return `p = ${p.toFixed(3)}`;
  return `p = ${p.toFixed(2)}`;
}

export default function SurvivalCurve() {
  const { verifiedCompanies, verifiedAcquisitions } = useVerifiedDataset();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  const { kmResults, logRank, topGroups } = useMemo(() => {
    // Build acquisition lookup: targetId → earliest acquisition year
    const acqYearByTarget = new Map<string, number>();
    for (const acq of verifiedAcquisitions) {
      const year = new Date(acq.announcedDate).getFullYear();
      const existing = acqYearByTarget.get(acq.targetId);
      if (!existing || year < existing) acqYearByTarget.set(acq.targetId, year);
    }

    // Count acquisitions per sector to pick top groups
    const sectorAcqCount: Record<string, number> = {};
    for (const [targetId, _] of acqYearByTarget) {
      const company = verifiedCompanies.find((c) => c.id === targetId);
      if (!company) continue;
      sectorAcqCount[company.sector] = (sectorAcqCount[company.sector] ?? 0) +
        1;
    }

    const topSectors = Object.entries(sectorAcqCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_GROUPS)
      .map(([s]) => s);

    // Build observations — only companies with known founding year
    const obs = verifiedCompanies
      .filter((c) =>
        typeof c.founded === "number" && c.founded > 1990 &&
        topSectors.includes(c.sector)
      )
      .map((c) => {
        const founded = c.founded as number;
        const acqYear = acqYearByTarget.get(c.id);
        const event = acqYear !== undefined ? (1 as const) : (0 as const);
        const time = Math.max(0.5, (acqYear ?? REFERENCE_YEAR) - founded);
        return { time, event, group: c.sector };
      });

    const { groups, logRank } = stratifiedKM(obs);
    // Sort groups to match topSectors order
    const sorted = topSectors.map((s) => groups.find((g) => g.group === s))
      .filter((g): g is KMResult => !!g);

    return { kmResults: sorted, logRank, topGroups: topSectors };
  }, [verifiedCompanies, verifiedAcquisitions]);

  useEffect(() => {
    if (!svgRef.current || kmResults.length === 0) return;

    const margin = { top: 24, right: 32, bottom: 64, left: 56 };
    const width = svgRef.current.clientWidth || 640;
    const height = 300;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g").attr(
      "transform",
      `translate(${margin.left},${margin.top})`,
    );

    // Scales
    const maxTime = d3.max(kmResults.flatMap((r) =>
      r.steps.map((s) => s.time)
    )) ?? 20;
    const xScale = d3.scaleLinear().domain([0, maxTime]).range([0, innerW]);
    const yScale = d3.scaleLinear().domain([0, 1]).range([innerH, 0]);

    // Grid
    g.append("g").attr("class", "grid")
      .selectAll("line").data(yScale.ticks(5))
      .join("line")
      .attr("x1", 0).attr("x2", innerW)
      .attr("y1", (d) => yScale(d)).attr("y2", (d) => yScale(d))
      .attr("stroke", "#e8e0f5").attr("stroke-width", 1);

    // CI bands
    kmResults.forEach((km, gi) => {
      const color = PALETTE[gi % PALETTE.length];
      const active = !hoveredGroup || hoveredGroup === km.group;

      const stepsWithEvents = km.steps.filter((s) => s.nEvents > 0);
      if (stepsWithEvents.length < 2) return;

      const areaData: [number, number, number][] = [[0, 1, 1]];
      for (const s of stepsWithEvents) {
        areaData.push([s.time, s.lower95, s.upper95]);
      }

      g.append("path")
        .datum(areaData)
        .attr("fill", color)
        .attr("fill-opacity", active ? 0.08 : 0.02)
        .attr(
          "d",
          d3.area<[number, number, number]>()
            .x((d) => xScale(d[0]))
            .y0((d) => yScale(d[1]))
            .y1((d) => yScale(d[2]))
            .curve(d3.curveStepAfter),
        );
    });

    // KM step lines
    kmResults.forEach((km, gi) => {
      const color = PALETTE[gi % PALETTE.length];
      const active = !hoveredGroup || hoveredGroup === km.group;
      const opacity = active ? 1 : 0.2;

      const lineData: [number, number][] = [
        [0, 1],
        ...km.steps.filter((s) => s.nEvents > 0).map((
          s,
        ): [number, number] => [s.time, s.survival]),
      ];

      g.append("path")
        .datum(lineData)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", active ? 2.5 : 1)
        .attr("stroke-opacity", opacity)
        .attr(
          "d",
          d3.line<[number, number]>()
            .x((d) => xScale(d[0]))
            .y((d) => yScale(d[1]))
            .curve(d3.curveStepAfter),
        );

      // Censoring tick-marks
      km.steps.filter((s) => s.nCensored > 0 && s.nEvents === 0).forEach(
        (s) => {
          g.append("line")
            .attr("x1", xScale(s.time)).attr("x2", xScale(s.time))
            .attr("y1", yScale(s.survival) - 5).attr(
              "y2",
              yScale(s.survival) + 5,
            )
            .attr("stroke", color).attr("stroke-width", 2).attr(
              "stroke-opacity",
              opacity * 0.6,
            );
        },
      );
    });

    // Median line at S=0.5
    g.append("line")
      .attr("x1", 0).attr("x2", innerW)
      .attr("y1", yScale(0.5)).attr("y2", yScale(0.5))
      .attr("stroke", "#9aa3b5").attr("stroke-dasharray", "4,3").attr(
        "stroke-width",
        1,
      );

    g.append("text")
      .attr("x", innerW + 4).attr("y", yScale(0.5) + 4)
      .attr("font-size", 9).attr("fill", "#9aa3b5").text("50%");

    // Axes
    g.append("g").attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat((d) => `${d}y`))
      .call((ax) => ax.select(".domain").attr("stroke", "#c4b5d4"))
      .call((ax) =>
        ax.selectAll("text").attr("fill", "#5b6a8a").attr("font-size", 11)
      );

    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format(".0%")))
      .call((ax) => ax.select(".domain").attr("stroke", "#c4b5d4"))
      .call((ax) =>
        ax.selectAll("text").attr("fill", "#5b6a8a").attr("font-size", 11)
      );

    // Y-axis label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerH / 2).attr("y", -44)
      .attr("text-anchor", "middle").attr("font-size", 11).attr(
        "fill",
        "#5b6a8a",
      )
      .text("Proportion unacquired");

    // X-axis label
    g.append("text")
      .attr("x", innerW / 2).attr("y", innerH + 44)
      .attr("text-anchor", "middle").attr("font-size", 11).attr(
        "fill",
        "#5b6a8a",
      )
      .text("Years from founding");
  }, [kmResults, hoveredGroup]);

  const totalN = kmResults.reduce((s, r) => s + r.n, 0);
  const totalEvents = kmResults.reduce((s, r) => s + r.nEvents, 0);

  // BH-correct the log-rank p (single test here; shown for methodological transparency)
  const logRankCorrected = logRank
    ? benjaminiHochberg([{ label: "log-rank", pValue: logRank.pValue }])
    : null;

  return (
    <div className="rounded-xl border border-lacuna-lavender/40 bg-white p-6 shadow-sm">
      <CuratedDatasetBanner className="mb-4" />

      <div className="mb-4">
        <h3 className="text-lg font-semibold text-lacuna-plum">
          Time-to-Acquisition Survival Analysis
        </h3>
        <p className="mt-1 text-sm text-lacuna-blue">
          Kaplan-Meier estimator · origin = founding year · event = acquisition
          announcement · right-censored at {REFERENCE_YEAR}{" "}
          for unacquired companies · Greenwood 95% CI bands · tick-marks =
          censoring times
        </p>
      </div>

      {/* Legend — clickable for dim/highlight */}
      <div className="mb-3 flex flex-wrap gap-3">
        {kmResults.map((km, gi) => (
          <button
            key={km.group}
            type="button"
            onClick={() =>
              setHoveredGroup((v) => (v === km.group ? null : km.group))}
            className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-opacity"
            style={{
              borderColor: PALETTE[gi % PALETTE.length] + "60",
              color: PALETTE[gi % PALETTE.length],
              opacity: !hoveredGroup || hoveredGroup === km.group ? 1 : 0.35,
            }}
          >
            <span
              className="inline-block h-2 w-5 rounded-sm"
              style={{ background: PALETTE[gi % PALETTE.length] }}
            />
            {km.group}
            <span className="text-lacuna-blue/60 font-normal">
              n={km.n}, {km.nEvents} acq.
            </span>
          </button>
        ))}
      </div>

      <svg
        ref={svgRef}
        className="w-full"
        style={{ height: 300 }}
        role="img"
        aria-label="Kaplan-Meier time-to-acquisition survival curves"
      />

      {/* At-risk table */}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-xs text-lacuna-blue">
          <thead>
            <tr>
              <th className="pr-4 text-left font-medium text-lacuna-plum/70">
                At risk at year
              </th>
              {[0, 2, 5, 10, 15].map((t) => (
                <th
                  key={t}
                  className="px-2 text-center font-medium text-lacuna-plum/70"
                >
                  {t}y
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-lacuna-lavender/20">
            {kmResults.map((km, gi) => (
              <tr key={km.group}>
                <td
                  className="py-1 pr-4 font-medium truncate max-w-[120px]"
                  style={{ color: PALETTE[gi % PALETTE.length] }}
                >
                  {km.group}
                </td>
                {[0, 2, 5, 10, 15].map((t) => {
                  const step = [...km.steps].reverse().find((s) => s.time <= t);
                  const nRisk = t === 0 ? km.n : (step?.nRisk ?? 0);
                  return (
                    <td key={t} className="px-2 py-1 text-center">
                      {nRisk}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stats footer */}
      <div className="mt-4 flex flex-wrap gap-4 border-t border-lacuna-lavender/20 pt-4 text-xs">
        <div>
          <span className="font-medium text-lacuna-plum">n = {totalN}</span>
          <span className="text-lacuna-blue/60 ml-1">
            companies with known founding year
          </span>
        </div>
        <div>
          <span className="font-medium text-lacuna-plum">
            {totalEvents} acquisitions
          </span>
          <span className="text-lacuna-blue/60 ml-1">observed events</span>
        </div>

        {/* Median survival per group */}
        {kmResults.filter((r) => r.medianSurvival !== null).map((km, gi) => (
          <div key={km.group}>
            <span
              className="font-medium"
              style={{ color: PALETTE[gi % PALETTE.length] }}
            >
              {km.group}
            </span>
            <span className="text-lacuna-blue/60 ml-1">
              median {km.medianSurvival?.toFixed(1)}y
              {km.medianCI
                ? ` (95% CI ${km.medianCI[0].toFixed(1)}–${
                  isFinite(km.medianCI[1]) ? km.medianCI[1].toFixed(1) : "NR"
                })`
                : ""}
            </span>
          </div>
        ))}

        {/* Log-rank */}
        {logRank && (
          <div className="text-lacuna-blue/60">
            Log-rank χ²({logRank.df}) = {logRank.chiSquared.toFixed(2)},{" "}
            <span
              className={logRankCorrected?.[0].significant
                ? "text-lacuna-plum font-medium"
                : ""}
            >
              {pLabel(logRank.pValue)}
            </span>
            {logRankCorrected && (
              <span className="ml-1">
                (BH adj. p = {logRankCorrected[0].pAdjusted})
              </span>
            )}
          </div>
        )}
      </div>

      <p className="mt-3 text-[11px] text-lacuna-blue/40 leading-relaxed">
        Interpretation caveat: n is small and sector stratification reduces
        power further. Log-rank test has low power for early crossings.
        Greenwood CIs assume independent censoring. Treat as exploratory.
      </p>
    </div>
  );
}
