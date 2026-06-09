"use client";

/**
 * Evidence Timeline Visualization
 *
 * D3.js-based timeline showing clinical trial phases, FDA approvals,
 * publications, and acquisition dates for each company.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import * as d3 from "d3";
import {
  EvidenceMaturityScore,
  TimelineInsight,
} from "@/data/evidence-maturity-calculator";
import { CompanyTrialProfile } from "@/data/clinicaltrials-mcp-connector";
import { CompanyFDAProfile } from "@/data/openfda-mcp-connector";

interface EvidenceTimelineProps {
  companyName: string;
  acquisitionDate?: string;
  trialProfile: CompanyTrialProfile;
  fdaProfile: CompanyFDAProfile;
  evidenceScore: EvidenceMaturityScore;
  width?: number;
  height?: number;
}

interface TimelineEvent {
  date: Date;
  type:
    | "trial_start"
    | "trial_complete"
    | "fda_approval"
    | "publication"
    | "acquisition";
  title: string;
  description: string;
  phase?: string;
  clearanceType?: string;
  journal?: string;
  y: number;
}

const PHASE_COLORS: Record<string, string> = {
  "PRECLINICAL": "#94a3b8",
  "EARLY_PHASE_1": "#60a5fa",
  "PHASE_1": "#3b82f6",
  "PHASE_1_2": "#2563eb",
  "PHASE_2": "#7c3aed",
  "PHASE_2_3": "#6d28d9",
  "PHASE_3": "#dc2626",
  "PHASE_4": "#16a34a",
};

const FDA_COLORS: Record<string, string> = {
  "510k": "#3b82f6",
  "DENovo": "#8b5cf6",
  "PMA": "#dc2626",
  "NDA": "#16a34a",
  "ANDA": "#22c55e",
  "BLA": "#15803d",
};

export default function EvidenceTimeline({
  companyName,
  acquisitionDate,
  trialProfile,
  fdaProfile,
  evidenceScore,
  width = 800,
  height = 300,
}: EvidenceTimelineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredEvent, setHoveredEvent] = useState<TimelineEvent | null>(null);

  // Prepare timeline events
  const events = useMemo(() => {
    const allEvents: TimelineEvent[] = [];

    // Trial events
    trialProfile.trials.forEach((trial) => {
      if (trial.startDate) {
        allEvents.push({
          date: new Date(trial.startDate),
          type: "trial_start",
          title: `${trial.phase} Trial Started`,
          description: trial.title.substring(0, 60) + "...",
          phase: trial.phase,
          y: 0,
        });
      }
      if (trial.completionDate) {
        allEvents.push({
          date: new Date(trial.completionDate),
          type: "trial_complete",
          title: `${trial.phase} Trial Completed`,
          description: trial.postedResults
            ? "Results posted"
            : "Results pending",
          phase: trial.phase,
          y: trial.postedResults ? 1 : 0.5,
        });
      }
    });

    // FDA approval events
    fdaProfile.products.forEach((product) => {
      allEvents.push({
        date: new Date(product.approvalDate),
        type: "fda_approval",
        title: `FDA ${product.clearanceType} Approval`,
        description: product.productName,
        clearanceType: product.clearanceType,
        y: 2,
      });
    });

    // Publication events
    trialProfile.trials.filter((t) => t.hasPublishedResults).forEach(
      (trial) => {
        // Estimate publication date (6 months after completion)
        const completion = trial.completionDate
          ? new Date(trial.completionDate)
          : new Date();
        const pubDate = new Date(completion);
        pubDate.setMonth(pubDate.getMonth() + 6);

        allEvents.push({
          date: pubDate,
          type: "publication",
          title: trial.isFlagshipJournal
            ? "Flagship Journal Publication"
            : "Publication",
          description: trial.journalName || "Peer-reviewed publication",
          journal: trial.journalName,
          y: 3,
        });
      },
    );

    // Acquisition event
    if (acquisitionDate) {
      allEvents.push({
        date: new Date(acquisitionDate),
        type: "acquisition",
        title: "Company Acquired",
        description: "Acquisition date",
        y: 4,
      });
    }

    return allEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [trialProfile, fdaProfile, acquisitionDate]);

  // D3 rendering
  useEffect(() => {
    if (!svgRef.current || events.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Scales
    const timeExtent = d3.extent(events, (d) => d.date) as [Date, Date];
    // Add padding
    const timePadding = (timeExtent[1].getTime() - timeExtent[0].getTime()) *
      0.1;
    timeExtent[0] = new Date(timeExtent[0].getTime() - timePadding);
    timeExtent[1] = new Date(timeExtent[1].getTime() + timePadding);

    const xScale = d3.scaleTime()
      .domain(timeExtent)
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([-0.5, 4.5])
      .range([innerHeight, 0]);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // X axis
    const xAxis = d3.axisBottom(xScale)
      .ticks(5)
      .tickFormat((d) => d3.timeFormat("%b %Y")(d as Date));

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll("text")
      .style("font-size", "10px")
      .style("fill", "#6b7280");

    // Timeline baseline
    g.append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", innerHeight / 2)
      .attr("y2", innerHeight / 2)
      .attr("stroke", "#e5e7eb")
      .attr("stroke-width", 2);

    // Event markers
    const eventGroup = g.selectAll(".event")
      .data(events)
      .enter()
      .append("g")
      .attr("class", "event")
      .attr("transform", (d) => `translate(${xScale(d.date)}, ${yScale(d.y)})`)
      .style("cursor", "pointer")
      .on("mouseenter", (event, d) => setHoveredEvent(d))
      .on("mouseleave", () => setHoveredEvent(null));

    // Event circles
    eventGroup.append("circle")
      .attr("r", (d) => d.type === "acquisition" ? 10 : 7)
      .attr("fill", (d) => {
        if (d.type === "trial_start" || d.type === "trial_complete") {
          return PHASE_COLORS[d.phase || "PHASE_1"];
        }
        if (d.type === "fda_approval") {
          return FDA_COLORS[d.clearanceType || "510k"];
        }
        if (d.type === "publication") {
          return d.journal?.includes("Nature") || d.journal?.includes("NEJM") ||
              d.journal?.includes("JAMA")
            ? "#dc2626" // Flagship
            : "#3b82f6"; // Regular
        }
        if (d.type === "acquisition") {
          return "#1f2937";
        }
        return "#6b7280";
      })
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .style("filter", "drop-shadow(0 1px 2px rgba(0,0,0,0.1))");

    // Add icons/labels for key events
    const acquisitionEvent = events.find((e) => e.type === "acquisition");
    if (acquisitionEvent) {
      g.append("text")
        .attr("x", xScale(acquisitionEvent.date))
        .attr("y", yScale(acquisitionEvent.y) - 15)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("font-weight", "bold")
        .style("fill", "#1f2937")
        .text("ACQUIRED");

      // Acquisition annotation line
      g.append("line")
        .attr("x1", xScale(acquisitionEvent.date))
        .attr("x2", xScale(acquisitionEvent.date))
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .attr("stroke", "#1f2937")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,4")
        .attr("opacity", 0.5);
    }

    // Legend
    const legend = g.append("g")
      .attr("transform", `translate(${innerWidth - 150}, 10)`);

    legend.append("text")
      .attr("x", 0)
      .attr("y", 0)
      .style("font-size", "10px")
      .style("font-weight", "bold")
      .style("fill", "#374151")
      .text("Trial Phases");

    const phaseLegend = [
      { phase: "PHASE_1", label: "Phase 1" },
      { phase: "PHASE_2", label: "Phase 2" },
      { phase: "PHASE_3", label: "Phase 3" },
    ];

    phaseLegend.forEach((item, i) => {
      const row = legend.append("g")
        .attr("transform", `translate(0, ${15 + i * 12})`);

      row.append("circle")
        .attr("r", 4)
        .attr("fill", PHASE_COLORS[item.phase]);

      row.append("text")
        .attr("x", 10)
        .attr("y", 3)
        .style("font-size", "9px")
        .style("fill", "#6b7280")
        .text(item.label);
    });
  }, [events, width, height]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-lacuna-plum">
            {companyName}
          </h3>
          <p className="text-sm text-lacuna-blue">
            Evidence Maturity Score:{" "}
            <span className="font-semibold">
              {evidenceScore.overallScore}/100
            </span>
          </p>
        </div>
        <div className="text-right">
          <div
            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
              evidenceScore.overallScore >= 75
                ? "bg-green-100 text-green-800"
                : evidenceScore.overallScore >= 50
                ? "bg-blue-100 text-blue-800"
                : evidenceScore.overallScore >= 25
                ? "bg-yellow-100 text-yellow-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {evidenceScore.maxPhase}
          </div>
        </div>
      </div>

      {/* Timeline SVG */}
      <div className="relative">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="overflow-visible"
        />

        {/* Hover tooltip */}
        {hoveredEvent && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bg-gray-900 text-white p-3 rounded-lg shadow-xl text-xs z-10 pointer-events-none"
            style={{
              left: "50%",
              bottom: "100%",
              transform: "translateX(-50%)",
              marginBottom: "8px",
              minWidth: "200px",
            }}
          >
            <div className="font-semibold mb-1">{hoveredEvent.title}</div>
            <div className="text-gray-300 mb-1">
              {hoveredEvent.date.toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </div>
            <div className="text-gray-400">{hoveredEvent.description}</div>
          </motion.div>
        )}
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <div className="text-lg font-bold text-lacuna-plum">
            {trialProfile.totalTrials}
          </div>
          <div className="text-xs text-lacuna-blue">Trials</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-lacuna-plum">
            {fdaProfile.totalProducts}
          </div>
          <div className="text-xs text-lacuna-blue">FDA Products</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-lacuna-plum">
            {evidenceScore.phaseScore}
          </div>
          <div className="text-xs text-lacuna-blue">Phase Score</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-lacuna-plum">
            {evidenceScore.fdaStatusScore}
          </div>
          <div className="text-xs text-lacuna-blue">FDA Score</div>
        </div>
      </div>

      {/* Acquisition context */}
      {acquisitionDate && (
        <div className="mt-4 p-3 bg-lacuna-lavender/10 rounded-lg">
          <div className="text-xs font-medium text-lacuna-plum mb-1">
            At Acquisition
          </div>
          <div className="text-sm text-lacuna-blue">
            {evidenceScore.atAcquisition.description}
          </div>
          <div className="text-xs text-lacuna-blue mt-1">
            Evidence Score:{" "}
            {evidenceScore.atAcquisition.evidenceScore}/100 | Phase:{" "}
            {evidenceScore.atAcquisition.phase} | FDA:{" "}
            {evidenceScore.atAcquisition.hadFDAApproval ? "Yes" : "No"}
          </div>
        </div>
      )}
    </div>
  );
}
