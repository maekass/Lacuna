"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import ChartTooltip from "@/components/ui/ChartTooltip";
import {
  BURDEN_CAPITAL_GAP_DATA,
  BURDEN_CAPITAL_GAP_SOURCES,
  WEF_CATEGORY_LABELS,
  formatCapitalM,
  hasBurdenData,
  sortBurdenCapitalRows,
  type BurdenCapitalGapRow,
  type WefCategory,
} from "@/data/burdenCapitalGap";

const MARGIN = { top: 28, right: 108, bottom: 52, left: 196 };
const ROW_HEIGHT = 30;

const CATEGORY_VAR: Record<WefCategory, string> = {
  uniquely: "var(--lac-category-unique)",
  differently: "var(--lac-category-different)",
  disproportionately: "var(--lac-category-disprop)",
};

interface TooltipState {
  row: BurdenCapitalGapRow;
  x: number;
  y: number;
}

function readCssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback;
}

export default function BurdenCapitalGap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(720);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const rows = useMemo(() => sortBurdenCapitalRows(BURDEN_CAPITAL_GAP_DATA), []);
  const burdenMode = useMemo(() => hasBurdenData(BURDEN_CAPITAL_GAP_DATA), []);

  const chartHeight = rows.length * ROW_HEIGHT + MARGIN.top + MARGIN.bottom;
  const innerWidth = Math.max(280, width - MARGIN.left - MARGIN.right);
  const innerHeight = rows.length * ROW_HEIGHT;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth || 720);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const capitalColor = readCssVar("--lac-capital", "#10b981");
    const burdenColor = readCssVar("--lac-burden", "#ef4444");
    const axisColor = readCssVar("--lacuna-chart-axis", "#8a7d96");
    const gridColor = readCssVar("--lacuna-chart-grid", "rgba(184,169,201,0.35)");

    const g = svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const y = d3
      .scaleBand<string>()
      .domain(rows.map((r) => r.id))
      .range([0, innerHeight])
      .padding(0.22);

    const maxCapital = d3.max(rows, (r) => r.capitalRaisedM) ?? 1;
    const xCapital = d3
      .scaleLog()
      .domain([Math.max(1, d3.min(rows, (r) => r.capitalRaisedM) ?? 1), maxCapital * 1.4])
      .range([0, innerWidth])
      .nice();

    const maxBurden = d3.max(rows, (r) => r.burdenDALYsM ?? 0) ?? 1;
    const xBurden = burdenMode
      ? d3
        .scaleLinear()
        .domain([0, maxBurden * 1.1])
        .range([0, innerWidth])
      : null;

    g.append("g")
      .attr("class", "grid")
      .selectAll("line")
      .data(xCapital.ticks(5))
      .join("line")
      .attr("x1", (d) => xCapital(d))
      .attr("x2", (d) => xCapital(d))
      .attr("y1", 0)
      .attr("y2", innerHeight)
      .attr("stroke", gridColor)
      .attr("stroke-dasharray", "3,3");

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xCapital).ticks(5, (d: d3.NumberValue) => formatCapitalM(Number(d))),
      )
      .call((axis) => axis.selectAll("text").attr("fill", axisColor).attr("font-size", 10))
      .call((axis) => axis.selectAll("line, path").attr("stroke", axisColor));

    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", 44)
      .attr("text-anchor", "middle")
      .attr("fill", axisColor)
      .attr("font-size", 11)
      .text("Capital raised in women's health (2020–2025, log scale)");

    const rowGroups = g
      .selectAll<SVGGElement, BurdenCapitalGapRow>("g.row")
      .data(rows, (d) => d.id)
      .join("g")
      .attr("class", "row")
      .attr("transform", (d) => `translate(0,${y(d.id) ?? 0})`);

    rowGroups
      .append("circle")
      .attr("cx", -14)
      .attr("cy", (y.bandwidth() ?? 0) / 2)
      .attr("r", 5)
      .attr("fill", (d) => CATEGORY_VAR[d.wefCategory]);

    rowGroups
      .append("text")
      .attr("x", -26)
      .attr("y", (y.bandwidth() ?? 0) / 2)
      .attr("dy", "0.32em")
      .attr("text-anchor", "end")
      .attr("fill", axisColor)
      .attr("font-size", 11)
      .text((d) => d.therapeuticArea);

    rowGroups
      .append("rect")
      .attr("x", 0)
      .attr("y", 2)
      .attr("height", Math.max(8, (y.bandwidth() ?? 0) - 4))
      .attr("width", (d) => Math.max(2, xCapital(d.capitalRaisedM)))
      .attr("fill", capitalColor)
      .attr("rx", 3)
      .attr("opacity", (d) => (d.id === "cardiovascular" ? 1 : 0.88))
      .style("cursor", "pointer")
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("opacity", 1);
        const [mx, my] = d3.pointer(event, containerRef.current);
        setTooltip({ row: d, x: mx, y: my });
      })
      .on("mousemove", (event, d) => {
        const [mx, my] = d3.pointer(event, containerRef.current);
        setTooltip({ row: d, x: mx, y: my });
      })
      .on("mouseleave", function (_event, d) {
        d3.select(this).attr("opacity", d.id === "cardiovascular" ? 1 : 0.88);
        setTooltip(null);
      });

    if (xBurden) {
      rowGroups
        .filter((d) => d.burdenDALYsM !== null)
        .append("line")
        .attr("x1", (d) => xBurden(d.burdenDALYsM ?? 0))
        .attr("x2", (d) => xBurden(d.burdenDALYsM ?? 0))
        .attr("y1", 0)
        .attr("y2", y.bandwidth() ?? 0)
        .attr("stroke", burdenColor)
        .attr("stroke-width", 2.5)
        .attr("stroke-linecap", "round");
    }

    rowGroups
      .append("text")
      .attr("x", innerWidth + 8)
      .attr("y", (y.bandwidth() ?? 0) / 2)
      .attr("dy", "0.32em")
      .attr("fill", axisColor)
      .attr("font-size", 10)
      .text((d) => `${d.fundingEvents.toLocaleString()} events`);

    const cvdY = y("cardiovascular");
    if (cvdY !== undefined) {
      g.append("rect")
        .attr("x", -8)
        .attr("y", cvdY - 2)
        .attr("width", innerWidth + 16)
        .attr("height", (y.bandwidth() ?? 0) + 4)
        .attr("fill", "none")
        .attr("stroke", burdenColor)
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,3")
        .attr("rx", 4)
        .attr("opacity", 0.55);
    }
  }, [rows, innerWidth, innerHeight, burdenMode]);

  return (
    <div
      ref={containerRef}
      className="rounded-xl border border-lacuna-pink/30 bg-white p-5 shadow-sm"
    >
      <div className="mb-4 max-w-3xl">
        <h3 className="text-sm font-semibold text-lacuna-plum">
          Burden–Capital Gap (BCG View)
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-lacuna-blue/80">
          Capital raised vs. disease burden across women&apos;s-health therapeutic
          areas (WEF/BCG Figure 3, 2020–2025). The sharpest gap: cardiovascular
          disease — {BURDEN_CAPITAL_GAP_DATA.find((r) => r.id === "cardiovascular")
            ?.fundingEvents}{" "}
          funding events and ~{formatCapitalM(10)} raised, against the leading cause
          of death in women — a misclassification Lacuna exists to correct.
        </p>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg
          ref={svgRef}
          width={width}
          height={chartHeight}
          role="img"
          aria-label="Burden-capital gap chart comparing funding and burden by therapeutic area"
        />
        {tooltip && (
          <ChartTooltip
            className="absolute max-w-xs"
            style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
            title={tooltip.row.therapeuticArea}
          >
            <p>{WEF_CATEGORY_LABELS[tooltip.row.wefCategory]}</p>
            <p>Capital: {formatCapitalM(tooltip.row.capitalRaisedM)}</p>
            <p>Funding events: {tooltip.row.fundingEvents.toLocaleString()}</p>
            {tooltip.row.burdenDALYsM !== null && (
              <p>Burden: {tooltip.row.burdenDALYsM}M DALYs</p>
            )}
          </ChartTooltip>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-lacuna-blue/80">
        {(Object.keys(WEF_CATEGORY_LABELS) as WefCategory[]).map((key) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: CATEGORY_VAR[key] }}
            />
            {WEF_CATEGORY_LABELS[key]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-6 rounded-sm"
            style={{ background: "var(--lac-capital)" }}
          />
          Capital raised
        </span>
        {burdenMode && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-0.5 rounded"
              style={{ background: "var(--lac-burden)" }}
            />
            Disease burden (DALYs)
          </span>
        )}
      </div>

      <p
        className="mt-3 text-xs italic text-lacuna-blue/70"
        role="note"
      >
        {burdenMode
          ? "Sorted by burden–capital distance (IHME GBD 2023)."
          : "Burden: pending IHME GBD 2023 — chart sorted by funding events until DALY data lands."}
      </p>

      <div className="mt-4 border-t border-lacuna-pink/20 pt-3 space-y-1.5">
        <p className="text-xs font-semibold text-lacuna-plum">Sources</p>
        {BURDEN_CAPITAL_GAP_SOURCES.map((s) => (
          <p key={s.label} className="text-xs text-lacuna-blue/60 leading-relaxed">
            <span className="font-medium text-lacuna-blue/80">[{s.label}]</span>{" "}
            {s.reference}{" "}
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lacuna-plum underline underline-offset-2"
            >
              Link
            </a>
          </p>
        ))}
      </div>
    </div>
  );
}
