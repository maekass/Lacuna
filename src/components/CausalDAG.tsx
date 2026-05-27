/**
 * Causal DAG Visualization with Assumption Documentation
 * 
 * Documents:
 * - Measured confounders (controlled for)
 * - Unmeasured confounders (worries + sensitivity)
 * - Identification strategy (backdoor criterion)
 * 
 * Based on Pearl (2009) backdoor criterion and Rubin causal model
 */

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface DAGNode {
  id: string;
  label: string;
  x: number;
  y: number;
  type: 'exposure' | 'outcome' | 'confounder' | 'mediator' | 'unmeasured';
}

interface DAGEdge {
  from: string;
  to: string;
  label?: string;
}

const DAG_NODES: DAGNode[] = [
  { id: 'founding', label: 'Founding Year', x: 100, y: 300, type: 'confounder' },
  { id: 'founder_quality', label: 'Founder Quality\n(UNMEASURED)', x: 100, y: 100, type: 'unmeasured' },
  { id: 'funding_stage', label: 'Funding Stage\n(EXPOSURE)', x: 350, y: 300, type: 'exposure' },
  { id: 'sector_momentum', label: 'Sector Momentum', x: 350, y: 150, type: 'confounder' },
  { id: 'valuation', label: 'Valuation', x: 350, y: 450, type: 'mediator' },
  { id: 'network_size', label: 'Network Size', x: 500, y: 250, type: 'confounder' },
  { id: 'acquirer_urgency', label: 'Acquirer Urgency\n(UNMEASURED)', x: 600, y: 100, type: 'unmeasured' },
  { id: 'acquisition', label: 'Acquisition\n(OUTCOME)', x: 600, y: 300, type: 'outcome' },
  { id: 'regulatory', label: 'Regulatory Shifts\n(UNMEASURED)', x: 600, y: 500, type: 'unmeasured' }
];

const DAG_EDGES: DAGEdge[] = [
  { from: 'founding', to: 'funding_stage', label: '→' },
  { from: 'founding', to: 'sector_momentum', label: '→' },
  { from: 'founder_quality', to: 'funding_stage', label: '→' },
  { from: 'founder_quality', to: 'acquisition', label: '→' },
  { from: 'funding_stage', to: 'valuation', label: '→' },
  { from: 'funding_stage', to: 'acquisition', label: 'CAUSAL? →' },
  { from: 'sector_momentum', to: 'funding_stage', label: '→' },
  { from: 'sector_momentum', to: 'acquisition', label: '→' },
  { from: 'valuation', to: 'acquisition', label: '→' },
  { from: 'network_size', to: 'acquisition', label: '→' },
  { from: 'network_size', to: 'funding_stage', label: '→' },
  { from: 'acquirer_urgency', to: 'acquisition', label: '→' },
  { from: 'regulatory', to: 'sector_momentum', label: '→' },
  { from: 'regulatory', to: 'acquisition', label: '→' }
];

const MEASURED_CONFOUNDERS = [
  { name: 'Founding Year', proxy: 'Company age at funding round', quality: 'good' },
  { name: 'Sector Momentum', proxy: 'Total sector funding in year prior', quality: 'moderate' },
  { name: 'Valuation', proxy: 'Last known valuation', quality: 'good' },
  { name: 'Network Size', proxy: 'Number of prior investors', quality: 'moderate' }
];

const UNMEASURED_CONFOUNDERS = [
  { 
    name: 'Founder Quality/Network', 
    concern: 'Exceptional founders attract both better funding AND acquirers independently',
    bias_direction: 'Overestimates funding stage effect',
    plausible_magnitude: 'Could double apparent effect size'
  },
  { 
    name: 'Acquirer Internal Urgency', 
    concern: 'Acquirer desperation drives both earlier acquisitions and willingness to pay premium',
    bias_direction: 'Confounds timing and probability',
    plausible_magnitude: 'Could flip sign of some sector effects'
  },
  { 
    name: 'Regulatory Shifts', 
    concern: 'FDA approval pathways affect both company trajectory AND acquirer interest',
    bias_direction: 'Sector-specific bias',
    plausible_magnitude: 'Could inflate health tech effects 20-40%'
  }
];

export default function CausalDAG() {
  const [showMeasured, setShowMeasured] = useState(true);
  const [showUnmeasured, setShowUnmeasured] = useState(true);
  const [showIdentification, setShowIdentification] = useState(false);

  const getNodeColor = (type: DAGNode['type']) => {
    switch (type) {
      case 'exposure': return '#4A5D8A'; // Cosmic Blue
      case 'outcome': return '#5D4E6D'; // Deep Plum
      case 'confounder': return '#B8A9C9'; // Lavender
      case 'mediator': return '#E8B4B8'; // Transcendent Pink
      case 'unmeasured': return '#e74c3c'; // Red for danger
      default: return '#95a5a6';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-2xl font-light tracking-tight" style={{ fontFamily: "'Bodoni MT', Didot, serif", textTransform: 'uppercase' }}>
          Causal DAG & Identification Strategy
        </h3>
        <p className="text-sm tracking-widest text-gray-500 mt-1" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase' }}>
          Pearl Backdoor Criterion | Measured & Unmeasured Confounders
        </p>
      </div>

      {/* DAG Visualization */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
            Causal Directed Acyclic Graph (DAG)
          </h4>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={showMeasured} 
                onChange={(e) => setShowMeasured(e.target.checked)}
              />
              <span style={{ fontFamily: "'Arial Narrow', sans-serif" }}>Measured</span>
            </label>
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={showUnmeasured} 
                onChange={(e) => setShowUnmeasured(e.target.checked)}
              />
              <span style={{ fontFamily: "'Arial Narrow', sans-serif" }} className="text-red-600">Unmeasured</span>
            </label>
          </div>
        </div>

        {/* SVG DAG */}
        <svg viewBox="0 0 800 600" className="w-full h-96 bg-gray-50 rounded border border-gray-200">
          {/* Edges */}
          {DAG_EDGES.map((edge, index) => {
            const fromNode = DAG_NODES.find(n => n.id === edge.from);
            const toNode = DAG_NODES.find(n => n.id === edge.to);
            if (!fromNode || !toNode) return null;
            
            // Hide edges connected to unmeasured if filtered
            if (!showUnmeasured && (fromNode.type === 'unmeasured' || toNode.type === 'unmeasured')) {
              return null;
            }
            
            return (
              <g key={index}>
                <line
                  x1={fromNode.x + 60}
                  y1={fromNode.y}
                  x2={toNode.x - 60}
                  y2={toNode.y}
                  stroke="#95a5a6"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
                {edge.label && (
                  <text
                    x={(fromNode.x + toNode.x) / 2}
                    y={(fromNode.y + toNode.y) / 2 - 10}
                    fontSize="10"
                    fill="#7f8c8d"
                    textAnchor="middle"
                    style={{ fontFamily: "'Arial Narrow', sans-serif" }}
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Arrow marker */}
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#95a5a6" />
            </marker>
          </defs>

          {/* Nodes */}
          {DAG_NODES.map((node) => {
            // Hide unmeasured nodes if filtered
            if (!showUnmeasured && node.type === 'unmeasured') return null;
            
            return (
              <g key={node.id}>
                <rect
                  x={node.x - 60}
                  y={node.y - 25}
                  width="120"
                  height="50"
                  rx="8"
                  fill={getNodeColor(node.type)}
                  opacity={node.type === 'unmeasured' ? 0.8 : 1}
                />
                <text
                  x={node.x}
                  y={node.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="11"
                  fontWeight="500"
                  style={{ fontFamily: "'Arial Narrow', sans-serif" }}
                >
                  {node.label.split('\n').map((line, i) => (
                    <tspan key={i} x={node.x} dy={i === 0 ? -5 : 14}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 text-xs" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
          {[
            { color: '#4A5D8A', label: 'Exposure (Funding Stage)' },
            { color: '#5D4E6D', label: 'Outcome (Acquisition)' },
            { color: '#B8A9C9', label: 'Measured Confounder' },
            { color: '#E8B4B8', label: 'Mediator' },
            { color: '#e74c3c', label: 'Unmeasured Confounder ⚠️' }
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Identification Strategy */}
      <div className="bg-gray-50 rounded-lg">
        <button
          onClick={() => setShowIdentification(!showIdentification)}
          className="w-full px-6 py-4 flex items-center justify-between text-left"
        >
          <span className="font-medium" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Identification Strategy: Pearl Backdoor Criterion
          </span>
          <span className="text-2xl">{showIdentification ? '−' : '+'}</span>
        </button>

        {showIdentification && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="px-6 pb-6"
          >
            <div className="bg-white p-4 rounded border border-gray-200 space-y-4">
              <div>
                <h5 className="font-medium mb-2" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
                  Backdoor Paths We Must Block
                </h5>
                <ul className="text-sm space-y-1 text-gray-700">
                  <li>• Founding Year → Funding Stage AND Founding Year → (Sector Momentum) → Acquisition</li>
                  <li>• Sector Momentum → Funding Stage AND Sector Momentum → Acquisition</li>
                  <li>• Network Size → Funding Stage AND Network Size → Acquisition</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium mb-2" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
                  Adjustment Set (Measured Confounders)
                </h5>
                <p className="text-sm text-gray-700">
                  We condition on: <strong>Founding Year, Sector Momentum, Network Size</strong>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  This blocks all backdoor paths from Funding Stage to Acquisition through measured variables.
                </p>
              </div>

              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r">
                <h5 className="font-medium text-red-800 mb-1" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                  ⚠️ UNBLOCKABLE BACKDOOR PATHS (Unmeasured)
                </h5>
                <p className="text-sm text-red-700">
                  • Founder Quality → Funding Stage AND Founder Quality → Acquisition<br />
                  • Acquirer Urgency → Acquisition (affects timing independently)<br />
                  • Regulatory Shifts → Sector Momentum AND Regulatory Shifts → Acquisition
                </p>
                <p className="text-xs text-red-600 mt-2">
                  These paths remain open. We rely on sensitivity analysis to assess their potential impact.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Measured Confounders Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-medium mb-4" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
          Measured Confounders (Included in All Models)
        </h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
              <th className="text-left py-2">Confounder</th>
              <th className="text-left py-2">Proxy/Measurement</th>
              <th className="text-left py-2">Data Quality</th>
            </tr>
          </thead>
          <tbody>
            {MEASURED_CONFOUNDERS.map((c) => (
              <tr key={c.name} className="border-t border-gray-100">
                <td className="py-2 font-medium">{c.name}</td>
                <td className="py-2 text-gray-600">{c.proxy}</td>
                <td className="py-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    c.quality === 'good' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {c.quality}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Unmeasured Confounders (The Danger Zone) */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h4 className="font-medium text-red-800 mb-4" style={{ fontFamily: "'Bodoni MT', Didot, serif" }}>
          Unmeasured Confounders: What Could Invalidate Our Claims?
        </h4>
        <div className="space-y-4">
          {UNMEASURED_CONFOUNDERS.map((c) => (
            <div key={c.name} className="bg-white p-4 rounded border border-red-100">
              <h5 className="font-medium text-red-700" style={{ fontFamily: "'Arial Narrow', sans-serif" }}>
                {c.name}
              </h5>
              <p className="text-sm text-gray-700 mt-1">
                <strong>Concern:</strong> {c.concern}
              </p>
              <p className="text-sm text-gray-700 mt-1">
                <strong>Bias Direction:</strong> {c.bias_direction}
              </p>
              <p className="text-sm text-red-600 mt-1">
                <strong>Plausible Magnitude:</strong> {c.plausible_magnitude}
              </p>
            </div>
          ))}
        </div>
        <p className="text-sm text-red-700 mt-4 p-3 bg-white rounded border border-red-200">
          <strong>Sensitivity Analysis Required:</strong> We calculate Oster's δ to determine 
          how strong these unmeasured confounders would need to be to flip our conclusions.
          See Sensitivity Analysis section for δ values.
        </p>
      </div>

      {/* Transparency Statement */}
      <div className="bg-gradient-to-r from-[#E8B4B8] via-[#B8A9C9] to-[#4A5D8A] p-6 rounded-lg text-white">
        <h4 className="font-medium mb-3" style={{ fontFamily: "'Arial Narrow', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Identification Assumptions Summary
        </h4>
        <div className="space-y-2 text-sm">
          <p>
            <strong>We assume:</strong> Conditioning on {MEASURED_CONFOUNDERS.length} measured confounders 
            blocks all backdoor paths, satisfying Pearl's backdoor criterion for measured variables.
          </p>
          <p>
            <strong>We acknowledge:</strong> {UNMEASURED_CONFOUNDERS.length} unmeasured confounders remain. 
            Our causal claims are valid ONLY IF these are weak relative to measured confounders.
          </p>
          <p>
            <strong>We test:</strong> Sensitivity analysis (Oster's δ) quantifies how strong unmeasured 
            confounding would need to be to invalidate our conclusions.
          </p>
          <p className="mt-3 pt-3 border-t border-white/30 font-medium">
            DO NOT interpret our results as causal without reviewing the sensitivity analysis.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
