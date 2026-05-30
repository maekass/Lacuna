'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: 'target' | 'acquirer';
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
}

import { LACUNA_PALETTE, LACUNA_SECTOR_COLORS } from '@/lib/theme/palette';

const sectorColors: Record<string, string> = {
  ...LACUNA_SECTOR_COLORS,
  Cardiovascular: LACUNA_PALETTE.cosmicBlue,
  Oncology: LACUNA_PALETTE.deepPlum,
  Menopause: LACUNA_PALETTE.softLavender,
  'Sexual Wellness': LACUNA_PALETTE.transcendentPink,
};

export default function ForceNetwork({ nodes, links, width = 800, height = 600 }: ForceNetworkProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create container group
    const g = svg.append('g');

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
      });

    svg.call(zoom);

    // Prepare nodes and links
    const simulationNodes: Node[] = nodes.map(n => ({ ...n }));
    const simulationLinks: Link[] = links.map(l => ({ ...l }));

    // Create force simulation
    const simulation = d3.forceSimulation<Node>(simulationNodes)
      .force('link', d3.forceLink<Node, Link>(simulationLinks)
        .id(d => d.id)
        .distance(d => 150 - (d.value / 10))
        .strength(0.5)
      )
      .force('charge', d3.forceManyBody().strength((d: d3.SimulationNodeDatum) => (d as Node).type === 'acquirer' ? -800 : -400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: d3.SimulationNodeDatum) => Math.sqrt((d as Node).valuation) / 2 + 20))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05));

    // Create links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(simulationLinks)
      .enter()
      .append('line')
      .attr('stroke', '#94a3b8')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', d => Math.sqrt(d.value / 10))
      .attr('stroke-dasharray', d => d.dealType === 'Strategic Investment' ? '5,5' : 'none');

    // Create nodes group
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(simulationNodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, Node>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Add circles to nodes
    node.append('circle')
      .attr('r', d => Math.sqrt(d.valuation) / 2 + 5)
      .attr('fill', d => d.type === 'acquirer' ? '#1e293b' : (sectorColors[d.sector] || '#64748b'))
      .attr('stroke', d => d.type === 'acquirer' ? '#fbbf24' : '#fff')
      .attr('stroke-width', d => d.type === 'acquirer' ? 3 : 2)
      .attr('opacity', 0.9);

    // Add labels
    node.append('text')
      .text(d => d.name.length > 15 ? d.name.substring(0, 12) + '...' : d.name)
      .attr('x', d => Math.sqrt(d.valuation) / 2 + 8)
      .attr('y', 4)
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .attr('fill', '#334155')
      .style('pointer-events', 'none');

    // Add interaction
    node
      .on('click', (event, d) => {
        setSelectedNode(d);
        event.stopPropagation();
      })
      .on('mouseenter', (event, d) => {
        setHoveredNode(d);
        d3.select(event.currentTarget).select('circle')
          .transition()
          .duration(200)
          .attr('r', Math.sqrt(d.valuation) / 2 + 10);
      })
      .on('mouseleave', (event, d) => {
        setHoveredNode(null);
        d3.select(event.currentTarget).select('circle')
          .transition()
          .duration(200)
          .attr('r', Math.sqrt(d.valuation) / 2 + 5);
      });

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as Node).x!)
        .attr('y1', d => (d.source as Node).y!)
        .attr('x2', d => (d.target as Node).x!)
        .attr('y2', d => (d.target as Node).y!);

      node
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links, width, height]);

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200"
      />
      
      {/* Legend */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 max-w-xs"
      >
        <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Sectors</h4>
        <div className="space-y-2">
          {Object.entries(sectorColors).map(([sector, color]) => (
            <div key={sector} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-slate-600">{sector}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-200">
            <div className="w-3 h-3 rounded-full bg-slate-800 border-2 border-amber-400" />
            <span className="text-xs text-slate-600">Acquirer</span>
          </div>
        </div>
      </motion.div>

      {/* Selected Node Info */}
      {selectedNode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 max-w-sm"
        >
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-slate-800">{selectedNode.name}</h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          </div>
          <div className="space-y-1 text-sm">
            <p><span className="text-slate-500">Type:</span> <span className="capitalize">{selectedNode.type}</span></p>
            <p><span className="text-slate-500">Sector:</span> {selectedNode.sector}</p>
            <p><span className="text-slate-500">Stage:</span> {selectedNode.stage}</p>
            {selectedNode.valuation > 1000 && (
              <p><span className="text-slate-500">Valuation:</span> ${(selectedNode.valuation / 1000).toFixed(1)}B</p>
            )}
            {selectedNode.valuation <= 1000 && selectedNode.valuation > 0 && (
              <p><span className="text-slate-500">Valuation:</span> ${selectedNode.valuation}M</p>
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
    </div>
  );
}
