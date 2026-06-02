'use client';

/**
 * AI Insights Panel
 * 
 * Displays LLM-generated investment insights for acquisitions.
 * Generates insights on-demand using Claude API.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import {
  generateAcquisitionInsights,
  generateEvidenceSummary,
  generateReimbursementInsights,
  isAIConfigured
} from '@/lib/ai/anthropic';

interface AIInsightsPanelProps {
  companyName: string;
  sector: string;
  analysis?: {
    topAcquirer: string;
    matchScore: number;
    estimatedValue: number;
    competitiveThreat: string;
  };
  evidence?: {
    phase: string;
    fdaStatus: string;
    trialCount: number;
    overallScore: number;
  };
  reimbursement?: {
    businessModel: string;
    insuranceRevenue: number;
    valuationMultiple: number;
    sectorBenchmark: number;
  };
  className?: string;
}

type InsightType = 'acquisition' | 'evidence' | 'reimbursement';

interface InsightState {
  type: InsightType;
  content: string;
  loading: boolean;
  error?: string;
}

export default function AIInsightsPanel({
  companyName,
  sector,
  analysis,
  evidence,
  reimbursement,
  className = ''
}: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<Record<InsightType, InsightState>>({
    acquisition: { type: 'acquisition', content: '', loading: false },
    evidence: { type: 'evidence', content: '', loading: false },
    reimbursement: { type: 'reimbursement', content: '', loading: false }
  });

  const [expanded, setExpanded] = useState<InsightType | null>(null);

  const generateInsight = useCallback(async (type: InsightType) => {
    if (insights[type].loading) return;

    // Update loading state
    setInsights(prev => ({
      ...prev,
      [type]: { ...prev[type], loading: true, error: undefined }
    }));

    try {
      let content = '';

      switch (type) {
        case 'acquisition':
          if (!analysis) {
            throw new Error('Acquisition analysis data required');
          }
          content = await generateAcquisitionInsights(
            companyName,
            sector,
            analysis.topAcquirer,
            analysis.matchScore,
            analysis.estimatedValue,
            analysis.competitiveThreat,
            evidence?.overallScore
          );
          break;

        case 'evidence':
          if (!evidence) {
            throw new Error('Evidence data required');
          }
          content = await generateEvidenceSummary(
            companyName,
            evidence.phase,
            evidence.fdaStatus,
            evidence.trialCount,
            evidence.overallScore
          );
          break;

        case 'reimbursement':
          if (!reimbursement) {
            throw new Error('Reimbursement data required');
          }
          content = await generateReimbursementInsights(
            companyName,
            reimbursement.businessModel,
            reimbursement.insuranceRevenue,
            reimbursement.valuationMultiple,
            reimbursement.sectorBenchmark
          );
          break;
      }

      setInsights(prev => ({
        ...prev,
        [type]: { type, content, loading: false }
      }));
      setExpanded(type);

    } catch (error) {
      setInsights(prev => ({
        ...prev,
        [type]: {
          type,
          content: '',
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to generate insight'
        }
      }));
    }
  }, [companyName, sector, analysis, evidence, reimbursement, insights]);

  const configStatus = isAIConfigured();

  if (!configStatus) {
    return (
      <div className={`bg-amber-50 border border-amber-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800">AI Insights Not Configured</h4>
            <p className="text-sm text-amber-700 mt-1">
              Add ANTHROPIC_API_KEY to environment variables to enable AI-generated insights.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const insightCards: { type: InsightType; title: string; available: boolean }[] = [
    {
      type: 'acquisition',
      title: 'Acquisition Strategy',
      available: !!analysis
    },
    {
      type: 'evidence',
      title: 'Evidence Assessment',
      available: !!evidence
    },
    {
      type: 'reimbursement',
      title: 'Reimbursement Impact',
      available: !!reimbursement
    }
  ];

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Sparkles className="w-4 h-4" />
        <span>AI-Generated Insights (Claude 3)</span>
      </div>

      {insightCards.filter(c => c.available).map(({ type, title }) => {
        const insight = insights[type];
        const isExpanded = expanded === type;

        return (
          <div
            key={type}
            className={`bg-white border rounded-lg overflow-hidden transition-all ${
              isExpanded ? 'border-lacuna-lavender shadow-md' : 'border-gray-200 hover:border-lacuna-lavender/50'
            }`}
          >
            <button
              onClick={() => {
                if (!insight.content && !insight.loading) {
                  generateInsight(type);
                } else {
                  setExpanded(isExpanded ? null : type);
                }
              }}
              disabled={insight.loading}
              className="w-full px-4 py-3 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                {insight.loading ? (
                  <Loader2 className="w-4 h-4 text-lacuna-plum animate-spin" />
                ) : insight.content ? (
                  <Sparkles className="w-4 h-4 text-green-600" />
                ) : (
                  <Sparkles className="w-4 h-4 text-gray-400" />
                )}
                <span className={`font-medium ${insight.content ? 'text-lacuna-plum' : 'text-gray-600'}`}>
                  {title}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {insight.content && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      generateInsight(type);
                    }}
                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-lacuna-plum"
                    title="Regenerate insight"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-100"
                >
                  <div className="p-4 bg-gray-50/50">
                    {insight.loading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating insight...</span>
                      </div>
                    ) : insight.error ? (
                      <div className="flex items-start gap-2 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4 mt-0.5" />
                        <span>{insight.error}</span>
                      </div>
                    ) : insight.content ? (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {insight.content}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          Generated by Claude 3 • May contain inaccuracies • Verify with primary data
                        </p>
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
