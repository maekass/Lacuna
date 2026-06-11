"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { motion } from "framer-motion";
import AcquirerProfile from "@/components/AcquirerProfile";
import { foregroundPortfolio } from "@/data/verifiedData";

interface Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: "target" | "acquirer";
  sector: string;
  stage: string;
  valuation: number;
}

interface Link {
  source: string | Node;
  target: string | Node;
  value: number;
  dealType: string;
  date: string;
}

interface ForceNetworkProps {
  nodes: Node[];
  links: Link[];
  width?: number;
  height?: number;
  highlightForeground?: boolean;
}

import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";
import { LACUNA_PALETTE, LACUNA_SECTOR_COLORS } from "@/lib/theme/palette";

const sectorColors: Record<string, string> = {
  ...LACUNA_SECTOR_COLORS,
  Cardiovascular: LACUNA_PALETTE.cosmicBlue,
  Oncology: LACUNA_PALETTE.deepPlum,
  Menopause: LACUNA_PALETTE.softLavender,
  "Sexual Wellness": LACUNA_PALETTE.transcendentPink,
};

const FOREGROUND_COLOR = "#7C3AED";

export default function ForceNetwork(
  {
    nodes,
    links,
    width: widthProp,
    height: heightProp,
    highlightForeground = true,
  }: ForceNetworkProps,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedAcquirerId, setSelectedAcquirerId] = useState<string | null>(
    null,
  );
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [dims, setDims] = useState({
    w: widthProp ?? 800,
    h: heightProp ?? 600,
  });
  const [isForegroundHighlightEnabled, setIsForegroundHighlightEnabled] =
    useState(highlightForeground);
  const foregroundPortfolioSet = useMemo(
    () => new Set<string>(foregroundPortfolio),
    [],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let debounceId: ReturnType<typeof setTimeout> | undefined;
    const measure = () => {
      const w = el.clientWidth;
      const h = Math.max(400, Math.min(w * 0.6, 700));
      setDims({ w, h });
    };
    const scheduleMeasure = () => {
      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(measure, 150);
    };
    measure();
    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(el);
    return () => {
      if (debounceId) clearTimeout(debounceId);
      ro.disconnect();
    };
  }, []);

  const width = widthProp ?? dims.w;
  const height = heightProp ?? dims.h;

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg.append("style").text(`
      @keyframes lacuna-foreground-pulse {
        0% {
          opacity: 0.85;
          stroke-width: 2;
          transform: scale(1);
          transform-origin: center;
        }
        70% {
          opacity: 0;
          stroke-width: 1;
          transform: scale(1.6);
          transform-origin: center;
        }
        100% {
          opacity: 0;
          stroke-width: 1;
          transform: scale(1.6);
          transform-origin: center;
        }
      }

      .lacuna-foreground-pulse-ring {
        animation: lacuna-foreground-pulse 2s ease-out infinite;
      }
    `);

    // Create container group
    const g = svg.append("g");

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString());
      });

    svg.call(zoom);

    // Prepare nodes and links
    const simulationNodes: Node[] = nodes.map((n) => ({ ...n }));
    const simulationLinks: Link[] = links.map((l) => ({ ...l }));

    // Create force simulation
    const simulation = d3.forceSimulation<Node>(simulationNodes)
      .force(
        "link",
        d3.forceLink<Node, Link>(simulationLinks)
          .id((d) => d.id)
          .distance((d) => 150 - (d.value / 10))
          .strength(0.5),
      )
      .force(
        "charge",
        d3.forceManyBody().strength((d: d3.SimulationNodeDatum) =>
          (d as Node).type === "acquirer" ? -800 : -400
        ),
      )
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide().radius((d: d3.SimulationNodeDatum) =>
          Math.sqrt((d as Node).valuation) / 2 + 20
        ),
      )
      .force("x", d3.forceX(width / 2).strength(0.05))
      .force("y", d3.forceY(height / 2).strength(0.05));

    // Create links
    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(simulationLinks)
      .enter()
      .append("line")
      .attr("stroke", "#94a3b8")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", (d) => Math.sqrt(d.value / 10))
      .attr(
        "stroke-dasharray",
        (d) => d.dealType === "Strategic Investment" ? "5,5" : "none",
      );

    // Create nodes group
    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(simulationNodes)
      .enter()
      .append("g")
      .attr("cursor", "pointer")
      .call(
        d3.drag<SVGGElement, Node>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    const getNodeRadius = (d: Node) => Math.sqrt(d.valuation) / 2 + 5;
    const isForegroundNode = (d: Node) =>
      isForegroundHighlightEnabled && foregroundPortfolioSet.has(d.name);

    node.filter((d) => isForegroundNode(d))
      .append("circle")
      .attr("class", "lacuna-foreground-pulse-ring")
      .attr("r", (d) => getNodeRadius(d) + 6)
      .attr("fill", "none")
      .attr("stroke", FOREGROUND_COLOR)
      .attr("stroke-opacity", 0.7)
      .style("pointer-events", "none");

    // Add circles to nodes
    node.append("circle")
      .attr("r", (d) => getNodeRadius(d))
      .attr(
        "fill",
        (d) => {
          if (isForegroundNode(d)) {
            return FOREGROUND_COLOR;
          }

          return d.type === "acquirer"
            ? "#1e293b"
            : (sectorColors[d.sector] || "#64748b");
        },
      )
      .attr("stroke", (d) => d.type === "acquirer" ? "#fbbf24" : "#fff")
      .attr("stroke-width", (d) => d.type === "acquirer" ? 3 : 2)
      .attr("opacity", 0.9);

    node.filter((d) => isForegroundNode(d))
      .append("g")
      .attr("transform", (d) => `translate(0, ${getNodeRadius(d) + 14})`)
      .style("pointer-events", "none")
      .call((group) => {
        group.append("rect")
          .attr("x", -12)
          .attr("y", -7)
          .attr("width", 24)
          .attr("height", 14)
          .attr("rx", 7)
          .attr("fill", "#ffffff")
          .attr("stroke", FOREGROUND_COLOR)
          .attr("stroke-width", 1.5);

        group.append("text")
          .text("FG")
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("y", 0.5)
          .attr("font-size", "9px")
          .attr("font-weight", "700")
          .attr("fill", FOREGROUND_COLOR);
      });

    // Add labels
    node.append("text")
      .text((d) =>
        d.name.length > 15 ? d.name.substring(0, 12) + "..." : d.name
      )
      .attr("x", (d) => getNodeRadius(d) + 8)
      .attr("y", 4)
      .attr("font-size", "10px")
      .attr("font-weight", "500")
      .attr("fill", "#334155")
      .style("pointer-events", "none");

    // Add interaction
    node
      .on("click", (event, d) => {
        if (d.type === "acquirer") {
          setSelectedAcquirerId(d.id);
          setSelectedNode(null);
        } else {
          setSelectedAcquirerId(null);
          setSelectedNode(d);
        }
        event.stopPropagation();
      })
      .on("mouseenter", (event, d) => {
        setHoveredNode(d);
        d3.select(event.currentTarget)
          .select("circle:not(.lacuna-foreground-pulse-ring)")
          .transition()
          .duration(200)
          .attr("r", getNodeRadius(d) + 5);
      })
      .on("mouseleave", (event, d) => {
        setHoveredNode(null);
        d3.select(event.currentTarget)
          .select("circle:not(.lacuna-foreground-pulse-ring)")
          .transition()
          .duration(200)
          .attr("r", getNodeRadius(d));
      });

    // Update positions on tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as Node).x!)
        .attr("y1", (d) => (d.source as Node).y!)
        .attr("x2", (d) => (d.target as Node).x!)
        .attr("y2", (d) => (d.target as Node).y!);

      node
        .attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [
    nodes,
    links,
    width,
    height,
    isForegroundHighlightEnabled,
    foregroundPortfolioSet,
  ]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CuratedDatasetBanner className="mb-0" />
        <button
          type="button"
          onClick={() => setIsForegroundHighlightEnabled((value) => !value)}
          className={`bg-white rounded-xl border border-lacuna-lavender/40 px-4 py-2 text-sm font-medium transition-colors ${
            isForegroundHighlightEnabled
              ? "text-lacuna-plum shadow-sm"
              : "text-lacuna-blue hover:text-lacuna-plum"
          }`}
        >
          Foreground Portfolio
        </button>
      </div>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200"
        style={{ maxHeight: "80vh" }}
      />

      {/* Legend — collapsible on small screens */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-2 sm:p-4 max-w-[10rem] sm:max-w-xs"
      >
        <h4 className="text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 sm:mb-3">
          Sectors
        </h4>
        <div className="space-y-1 sm:space-y-2">
          {Object.entries(sectorColors).map(([sector, color]) => (
            <div key={sector} className="flex items-center gap-1.5 sm:gap-2">
              <div
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-[10px] sm:text-xs text-slate-600 truncate">
                {sector}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3 pt-1.5 sm:pt-2 border-t border-slate-100">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-slate-800 border-2 border-amber-400 shrink-0" />
            <span className="text-[10px] sm:text-xs text-slate-600">
              Acquirer
            </span>
          </div>
        </div>
      </motion.div>

      {/* Selected Node Info */}
      {selectedNode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 sm:p-4 max-w-[14rem] sm:max-w-sm"
        >
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-slate-800">
              {selectedNode.name}
            </h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          </div>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-slate-500">Type:</span>{" "}
              <span className="capitalize">{selectedNode.type}</span>
            </p>
            <p>
              <span className="text-slate-500">Sector:</span>{" "}
              {selectedNode.sector}
            </p>
            <p>
              <span className="text-slate-500">Stage:</span>{" "}
              {selectedNode.stage}
            </p>
            {selectedNode.valuation > 1000 && (
              <p>
                <span className="text-slate-500">Valuation:</span>{" "}
                ${(selectedNode.valuation / 1000).toFixed(1)}B
              </p>
            )}
            {selectedNode.valuation <= 1000 && selectedNode.valuation > 0 && (
              <p>
                <span className="text-slate-500">Valuation:</span>{" "}
                ${selectedNode.valuation}M
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Hover tooltip */}
      {hoveredNode && !selectedNode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-4 right-4 bg-slate-800 text-white text-xs px-3 py-2 rounded-md"
        >
          {hoveredNode.name}
        </motion.div>
      )}

      <AcquirerProfile
        acquirerId={selectedAcquirerId}
        onClose={() => setSelectedAcquirerId(null)}
      />
    </div>
  );
}
