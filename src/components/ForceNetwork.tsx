"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { motion } from "framer-motion";
import AcquirerProfile from "@/components/AcquirerProfile";
import ChartTooltip from "@/components/ui/ChartTooltip";
import { INVESTOR_PORTFOLIOS, type PortfolioKey } from "@/lib/data/portfolios";

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
  highlightPortfolios?: boolean;
}

import {
  LACUNA_PALETTE,
  LACUNA_SECTOR_COLORS,
  LACUNA_SEMANTIC,
} from "@/lib/theme/palette";

const sectorColors: Record<string, string> = {
  Fertility: "#EC4899",
  "Mental Health": "#8B5CF6",
  "General Wellness": "#0EA5E9",
  Wearables: "#10B981",
  "Pelvic Health": "#7C3AED",
  Cardiovascular: "#EF4444",
  Oncology: "#F59E0B",
  Menopause: "#6366F1",
  "Sexual Wellness": "#14B8A6",
  Diagnostics: "#84CC16",
  "Digital Health": "#06B6D4",
  Therapeutics: "#A855F7",
  "Reproductive": "#F43F5E",
  "Medical Device": "#0EA5E9",
  "Consumer": "#EA580C",
  Biotech: "#059669",
  "Maternal Health": "#DB2777"
};

const PORTFOLIO_STYLES: Record<PortfolioKey, { color: string; badge: string }> =
  {
    foreground: { color: "#DC2626", badge: "FG" },
    amboy: { color: "#0D9488", badge: "AS" },
    fund: { color: "#F97316", badge: "PT" },
  };

// Updated: Three distinct portfolio colors - FG (pink), AS (teal), PT (blue)
export default function ForceNetwork(
  {
    nodes,
    links,
    width: widthProp,
    height: heightProp,
    highlightPortfolios = true,
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
  const [enabledPortfolios, setEnabledPortfolios] = useState<
    Record<PortfolioKey, boolean>
  >({
    foreground: highlightPortfolios,
    amboy: highlightPortfolios,
    fund: highlightPortfolios,
  });
  const [isTransitioning, setIsTransitioning] = useState<PortfolioKey | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedPortfolio, setFocusedPortfolio] = useState<PortfolioKey | null>(null);
  const portfolioNameSets = useMemo(
    () =>
      new Map<PortfolioKey, ReadonlySet<string>>(
        INVESTOR_PORTFOLIOS.map((p) => [p.key, new Set<string>(p.companies)]),
      ),
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

  const selectNode = useCallback((node: Node) => {
    if (node.type === "acquirer") {
      setSelectedAcquirerId(node.id);
      setSelectedNode(null);
    } else {
      setSelectedAcquirerId(null);
      setSelectedNode(node);
    }
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg.append("style").text(`
      @keyframes lacuna-portfolio-pulse {
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

      @keyframes node-entrance {
        0% {
          opacity: 0;
          transform: scale(0);
        }
        50% {
          opacity: 0.8;
          transform: scale(1.1);
        }
        100% {
          opacity: 0.9;
          transform: scale(1);
        }
      }

      .lacuna-portfolio-pulse-ring {
        animation: lacuna-portfolio-pulse 2s ease-out infinite;
      }

      .node-circle {
        animation: node-entrance 0.6s ease-out;
        transition: fill 0.3s ease, stroke 0.3s ease;
      }

      .node-circle:hover {
        filter: brightness(1.1);
        cursor: pointer;
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
    const nodePortfolioKeys = (d: Node): PortfolioKey[] =>
      INVESTOR_PORTFOLIOS
        .filter((p) =>
          enabledPortfolios[p.key] && portfolioNameSets.get(p.key)?.has(d.name)
        )
        .map((p) => p.key);

    node.filter((d) => nodePortfolioKeys(d).length > 0)
      .append("circle")
      .attr("class", "lacuna-portfolio-pulse-ring")
      .attr("r", (d) => getNodeRadius(d) + 6)
      .attr("fill", "none")
      .attr("stroke", (d) => PORTFOLIO_STYLES[nodePortfolioKeys(d)[0]].color)
      .attr("stroke-opacity", 0.7)
      .style("pointer-events", "none");

    // Add circles to nodes with entrance animation
    node.append("circle")
      .attr("class", "node-circle")
      .attr("r", 0) // Start with radius 0 for entrance animation
      .attr(
        "fill",
        (d) => {
          const portfolioKeys = nodePortfolioKeys(d);
          if (portfolioKeys.length > 0) {
            return PORTFOLIO_STYLES[portfolioKeys[0]].color;
          }

          return d.type === "acquirer"
            ? "#1e293b"
            : (sectorColors[d.sector] || "#64748b");
        },
      )
      .attr("stroke", (d) => d.type === "acquirer" ? "#fbbf24" : "#fff")
      .attr("stroke-width", (d) => d.type === "acquirer" ? 3 : 2)
      .attr("opacity", 0)
      .transition()
      .duration(600)
      .delay((d, i) => i * 20) // Stagger entrance
      .attr("r", (d) => getNodeRadius(d))
      .attr("opacity", 0.9);

    node.each(function (d) {
      const portfolioKeys = nodePortfolioKeys(d);
      if (portfolioKeys.length === 0) return;

      const badgeGroup = d3.select<SVGGElement, Node>(this)
        .append("g")
        .attr("transform", `translate(0, ${getNodeRadius(d) + 14})`)
        .style("pointer-events", "none");

      portfolioKeys.forEach((key, index) => {
        const x = (index - (portfolioKeys.length - 1) / 2) * 28;
        const { color, badge } = PORTFOLIO_STYLES[key];

        badgeGroup.append("rect")
          .attr("x", x - 12)
          .attr("y", -7)
          .attr("width", 24)
          .attr("height", 14)
          .attr("rx", 7)
          .attr("fill", "#ffffff")
          .attr("stroke", color)
          .attr("stroke-width", 1.5);

        badgeGroup.append("text")
          .text(badge)
          .attr("x", x)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("y", 0.5)
          .attr("font-size", "9px")
          .attr("font-weight", "700")
          .attr("fill", color);
      });
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
        selectNode(d);
        event.stopPropagation();
      })
      .on("mouseenter", (event, d) => {
        setHoveredNode(d);
        d3.select(event.currentTarget)
          .select("circle:not(.lacuna-portfolio-pulse-ring)")
          .transition()
          .duration(200)
          .attr("r", getNodeRadius(d) + 5);
      })
      .on("mouseleave", (event, d) => {
        setHoveredNode(null);
        d3.select(event.currentTarget)
          .select("circle:not(.lacuna-portfolio-pulse-ring)")
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
    enabledPortfolios,
    portfolioNameSets,
    selectNode,
  ]);

  const graphLabel =
    `M&A network graph showing ${nodes.length} companies and ${links.length} verified deal relationships.`;

  return (
    <div ref={containerRef} className="relative w-full">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-lacuna-plum border-t-transparent" />
            <p className="text-sm text-lacuna-text-secondary">Loading network visualization...</p>
          </div>
        </div>
      )}
      
      <div className="mb-4 flex flex-wrap justify-end gap-2 sm:gap-3">
        {INVESTOR_PORTFOLIOS.map((portfolio) => (
          <motion.button
            key={portfolio.key}
            type="button"
            onClick={() => {
              setIsTransitioning(portfolio.key);
              setTimeout(() => setIsTransitioning(null), 300);
              setEnabledPortfolios((value) => ({
                ...value,
                [portfolio.key]: !value[portfolio.key],
              }));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsTransitioning(portfolio.key);
                setTimeout(() => setIsTransitioning(null), 300);
                setEnabledPortfolios((value) => ({
                  ...value,
                  [portfolio.key]: !value[portfolio.key],
                }));
              } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const currentIndex = INVESTOR_PORTFOLIOS.findIndex(p => p.key === portfolio.key);
                const nextIndex = e.key === 'ArrowRight' 
                  ? (currentIndex + 1) % INVESTOR_PORTFOLIOS.length
                  : (currentIndex - 1 + INVESTOR_PORTFOLIOS.length) % INVESTOR_PORTFOLIOS.length;
                const nextButton = document.querySelector(`[data-portfolio-key="${INVESTOR_PORTFOLIOS[nextIndex].key}"]`) as HTMLElement;
                nextButton?.focus();
              }
            }}
            onFocus={() => setFocusedPortfolio(portfolio.key)}
            onBlur={() => setFocusedPortfolio(null)}
            data-portfolio-key={portfolio.key}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`relative inline-flex items-center gap-2 rounded-lg sm:rounded-xl border px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              enabledPortfolios[portfolio.key]
                ? `border-transparent shadow-lg text-white`
                : `border-lacuna-lavender/40 bg-white text-lacuna-blue hover:border-lacuna-lavender/60 hover:shadow-md`
            } ${isTransitioning === portfolio.key ? 'animate-pulse' : ''}`}
            style={{
              backgroundColor: enabledPortfolios[portfolio.key] 
                ? PORTFOLIO_STYLES[portfolio.key].color 
                : undefined,
            }}
            disabled={isLoading}
            aria-label={`Toggle ${portfolio.shortName} portfolio ${enabledPortfolios[portfolio.key] ? 'off' : 'on'}. Press Enter or Space to toggle, arrow keys to navigate.`}
            aria-pressed={enabledPortfolios[portfolio.key]}
            tabIndex={0}
          >
            <motion.span
              className={`h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full ${
                enabledPortfolios[portfolio.key] ? 'bg-white/90' : ''
              }`}
              animate={{
                scale: enabledPortfolios[portfolio.key] ? [1, 1.2, 1] : 1,
                opacity: enabledPortfolios[portfolio.key] ? 1 : 0.3,
              }}
              transition={{ duration: 0.3 }}
              style={{
                backgroundColor: enabledPortfolios[portfolio.key] 
                  ? undefined 
                  : PORTFOLIO_STYLES[portfolio.key].color,
              }}
            />
            <span className="font-medium hidden sm:inline">{portfolio.shortName}</span>
            <span className="font-medium sm:hidden">{portfolio.shortName.slice(0, 2)}</span>
            {isTransitioning === portfolio.key && (
              <motion.div
                className="absolute -top-1 -right-1 h-3 w-3"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <div className="h-full w-full rounded-full border-2 border-white/50 border-t-transparent" />
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>

      <div
        className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_240px]"
        aria-live="polite"
      >
        <div className="relative">
          {nodes.length === 0 ? (
            <div className="flex h-64 sm:h-96 items-center justify-center rounded-lg sm:rounded-xl border-2 border-dashed border-lacuna-lavender/40 bg-gradient-to-br from-lacuna-pink/10 to-lacuna-lavender/15">
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <div className="h-12 w-12 rounded-full bg-lacuna-lavender/20 flex items-center justify-center">
                    <div className="h-6 w-6 rounded-full bg-lacuna-lavender/40" />
                  </div>
                </div>
                <h3 className="text-lg font-medium text-lacuna-text-primary mb-2">No network data available</h3>
                <p className="text-sm text-lacuna-text-secondary">Try adjusting your filters or check back later.</p>
              </div>
            </div>
          ) : (
            <svg
              ref={svgRef}
              width={width}
              height={height}
              role="img"
              aria-label={graphLabel}
              className="w-full rounded-lg sm:rounded-xl border border-lacuna-lavender/40 bg-gradient-to-br from-lacuna-pink/10 to-lacuna-lavender/15"
              style={{ maxHeight: "80vh" }}
            />
          )}

          {/* Legend — collapsible on small screens */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-2 left-2 sm:top-4 sm:left-4 max-w-[10rem] rounded-lg bg-white/95 p-2 shadow-lg backdrop-blur-sm sm:max-w-xs sm:p-4"
          >
            <h4 className="text-[10px] sm:text-xs font-semibold text-lacuna-text-secondary uppercase tracking-wider mb-2 sm:mb-3">
              Sectors
            </h4>
            <div className="space-y-1 sm:space-y-2">
              {Object.entries(sectorColors).map(([sector, color]) => (
                <div
                  key={sector}
                  className="flex items-center gap-1.5 sm:gap-2"
                >
                  <div
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[10px] sm:text-xs text-lacuna-text-secondary truncate">
                    {sector}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3 pt-1.5 sm:pt-2 border-t border-lacuna-border-subtle">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-lacuna-surface-inverse border-2 border-amber-400 shrink-0" />
                <span className="text-[10px] sm:text-xs text-lacuna-text-secondary">
                  Acquirer
                </span>
              </div>
              {INVESTOR_PORTFOLIOS.filter((p) => enabledPortfolios[p.key]).map(
                (portfolio) => (
                  <div
                    key={portfolio.key}
                    className="flex items-center gap-1.5 sm:gap-2"
                  >
                    <div
                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0"
                      style={{
                        backgroundColor: PORTFOLIO_STYLES[portfolio.key].color,
                      }}
                    />
                    <span className="text-[10px] sm:text-xs text-lacuna-text-secondary truncate">
                      {portfolio.shortName}
                    </span>
                  </div>
                ),
              )}
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
                <h3 className="font-semibold text-lacuna-text-primary">
                  {selectedNode.name}
                </h3>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-lacuna-text-muted hover:text-lacuna-text-secondary"
                >
                  ×
                </button>
              </div>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-lacuna-text-muted">Type:</span>{" "}
                  <span className="capitalize">{selectedNode.type}</span>
                </p>
                <p>
                  <span className="text-lacuna-text-muted">Sector:</span>{" "}
                  {selectedNode.sector}
                </p>
                <p>
                  <span className="text-lacuna-text-muted">Stage:</span>{" "}
                  {selectedNode.stage}
                </p>
                {selectedNode.valuation > 1000 && (
                  <p>
                    <span className="text-lacuna-text-muted">Valuation:</span>
                    {" "}
                    ${(selectedNode.valuation / 1000).toFixed(1)}B
                  </p>
                )}
                {selectedNode.valuation <= 1000 && selectedNode.valuation > 0 &&
                  (
                    <p>
                      <span className="text-lacuna-text-muted">Valuation:</span>
                      {" "}
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
              className="absolute top-4 right-4"
            >
              <ChartTooltip title={hoveredNode.name}>
                <p>
                  <span className="text-lacuna-text-inverse/70">Type:</span>
                  {" "}
                  {hoveredNode.type}
                </p>
                <p>
                  <span className="text-lacuna-text-inverse/70">Sector:</span>
                  {" "}
                  {hoveredNode.sector}
                </p>
              </ChartTooltip>
            </motion.div>
          )}
        </div>

        <aside
          className="max-h-[480px] overflow-y-auto rounded-xl border border-lacuna-lavender/40 bg-white p-3 shadow-sm"
          aria-label="Network nodes list"
        >
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-lacuna-blue/70">
            Keyboard-friendly list
          </p>
          <ul className="space-y-1">
            {nodes.map((node) => (
              <li key={node.id}>
                <button
                  type="button"
                  onClick={() => selectNode(node)}
                  className={`w-full rounded-lg px-2 py-2 text-left text-xs transition-colors ${
                    selectedNode?.id === node.id ||
                      selectedAcquirerId === node.id
                      ? "bg-lacuna-lavender/25 font-medium text-lacuna-plum"
                      : "text-lacuna-blue hover:bg-lacuna-pink/10"
                  }`}
                >
                  <span className="block truncate">{node.name}</span>
                  <span className="text-[10px] capitalize text-lacuna-blue/70">
                    {node.type} · {node.sector}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <AcquirerProfile
        acquirerId={selectedAcquirerId}
        onClose={() => setSelectedAcquirerId(null)}
      />
    </div>
  );
}
