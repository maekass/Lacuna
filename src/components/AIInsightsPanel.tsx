"use client";

/**
 * Optional LLM-generated narrative blurbs (Vercel AI Gateway). Exploratory copy only —
 * not validated analysis; parent panels use the curated verified dataset.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  ClipboardCopy,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";

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

type InsightType = "acquisition" | "evidence" | "reimbursement";

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
  className = "",
}: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<Record<InsightType, InsightState>>({
    acquisition: { type: "acquisition", content: "", loading: false },
    evidence: { type: "evidence", content: "", loading: false },
    reimbursement: { type: "reimbursement", content: "", loading: false },
  });

  const [expanded, setExpanded] = useState<InsightType | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [copiedType, setCopiedType] = useState<InsightType | null>(null);
  const abortRefs = useRef<Partial<Record<InsightType, AbortController>>>({});

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/insights")
      .then((res) => res.json())
      .then((data: { configured?: boolean }) => {
        if (!cancelled) setConfigured(Boolean(data.configured));
      })
      .catch(() => {
        if (!cancelled) setConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const generateInsight = useCallback(async (type: InsightType) => {
    if (insights[type].loading) return;

    // Cancel any in-flight request for this type
    abortRefs.current[type]?.abort();
    const controller = new AbortController();
    abortRefs.current[type] = controller;

    setInsights((prev) => ({
      ...prev,
      [type]: { ...prev[type], content: "", loading: true, error: undefined },
    }));
    setExpanded(type);

    try {
      const payload: Record<string, unknown> = { type, companyName, sector };

      switch (type) {
        case "acquisition":
          if (!analysis) throw new Error("Acquisition analysis data required");
          payload.analysis = analysis;
          if (evidence?.overallScore !== undefined) {
            payload.evidenceScore = evidence.overallScore;
          }
          break;
        case "evidence":
          if (!evidence) throw new Error("Evidence data required");
          payload.evidence = evidence;
          break;
        case "reimbursement":
          if (!reimbursement) throw new Error("Reimbursement data required");
          payload.reimbursement = reimbursement;
          break;
      }

      const response = await fetch("/api/ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        // Fall back to non-streaming endpoint
        const fallback = await fetch("/api/ai/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await fallback.json()) as {
          content?: string;
          error?: string;
        };
        if (!fallback.ok) {
          throw new Error(data.error ?? `Request failed (${fallback.status})`);
        }
        setInsights((prev) => ({
          ...prev,
          [type]: { type, content: data.content ?? "", loading: false },
        }));
        return;
      }

      // Stream text chunks into state
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const snapshot = accumulated;
        setInsights((prev) => ({
          ...prev,
          [type]: { ...prev[type], content: snapshot, loading: true },
        }));
      }

      setInsights((prev) => ({
        ...prev,
        [type]: { type, content: accumulated, loading: false },
      }));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setInsights((prev) => ({
        ...prev,
        [type]: {
          type,
          content: "",
          loading: false,
          error: error instanceof Error
            ? error.message
            : "Failed to generate insight",
        },
      }));
    }
  }, [companyName, sector, analysis, evidence, reimbursement, insights]);

  const citeInsight = useCallback(async (type: InsightType) => {
    const content = insights[type].content;
    if (!content) return;
    const date = new Date().toISOString().split("T")[0];
    const citation =
      `Lacuna AI · ${companyName} ${type} insight · ${date} · https://lacuna-maekass.vercel.app`;
    await navigator.clipboard.writeText(citation);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  }, [insights, companyName]);

  if (configured === null) {
    return (
      <div
        className={`bg-lacuna-surface-muted border border-lacuna-border rounded-lg p-4 ${className}`}
      >
        <div className="flex items-center gap-2 text-sm text-lacuna-text-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Checking AI configuration…</span>
        </div>
      </div>
    );
  }

  if (!configured) {
    return (
      <div
        className={`bg-amber-50 border border-amber-200 rounded-lg p-4 ${className}`}
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800">
              AI Insights Not Configured
            </h4>
            <p className="text-sm text-amber-700 mt-1">
              Enable Vercel AI Gateway (OIDC on Vercel or AI_GATEWAY_API_KEY) or
              set OPENAI_API_KEY for optional narrative blurbs.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const insightCards: {
    type: InsightType;
    title: string;
    available: boolean;
  }[] = [
    {
      type: "acquisition",
      title: "Acquisition Strategy",
      available: !!analysis,
    },
    { type: "evidence", title: "Evidence Assessment", available: !!evidence },
    {
      type: "reimbursement",
      title: "Reimbursement Impact",
      available: !!reimbursement,
    },
  ];

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 text-sm text-lacuna-text-muted mb-2">
        <Sparkles className="w-4 h-4" />
        <span>Exploratory LLM narrative (not validated research)</span>
      </div>

      {insightCards.filter((c) => c.available).map(({ type, title }) => {
        const insight = insights[type];
        const isExpanded = expanded === type;
        const isCopied = copiedType === type;

        return (
          <div
            key={type}
            className={`bg-white border rounded-lg overflow-hidden transition-all ${
              isExpanded
                ? "border-lacuna-lavender shadow-md"
                : "border-lacuna-border hover:border-lacuna-lavender/50"
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
              disabled={insight.loading && !insight.content}
              className="w-full px-4 py-3 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                {insight.loading
                  ? (
                    <Loader2 className="w-4 h-4 text-lacuna-plum animate-spin" />
                  )
                  : insight.content
                  ? <Sparkles className="w-4 h-4 text-green-600" />
                  : <Sparkles className="w-4 h-4 text-lacuna-text-muted" />}
                <span
                  className={`font-medium ${
                    insight.content
                      ? "text-lacuna-plum"
                      : "text-lacuna-text-secondary"
                  }`}
                >
                  {title}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {insight.content && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        citeInsight(type);
                      }}
                      className="p-1 hover:bg-lacuna-surface-subtle rounded text-lacuna-text-muted hover:text-lacuna-plum transition-colors"
                      title="Copy citation"
                    >
                      {isCopied
                        ? <Check className="w-4 h-4 text-green-600" />
                        : <ClipboardCopy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        generateInsight(type);
                      }}
                      className="p-1 hover:bg-lacuna-surface-subtle rounded text-lacuna-text-muted hover:text-lacuna-plum transition-colors"
                      title="Regenerate insight"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </>
                )}
                <svg
                  className={`w-4 h-4 text-lacuna-text-muted transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-lacuna-border-subtle"
                >
                  <div className="p-4 bg-lacuna-surface-muted/50">
                    {insight.error
                      ? (
                        <div className="flex items-start gap-2 text-sm text-red-600">
                          <AlertCircle className="w-4 h-4 mt-0.5" />
                          <span>{insight.error}</span>
                        </div>
                      )
                      : insight.content
                      ? (
                        <div className="space-y-2">
                          <p className="text-sm text-lacuna-text-primary leading-relaxed whitespace-pre-wrap">
                            {insight.content}
                            {insight.loading && (
                              <span className="inline-block w-1 h-4 ml-0.5 bg-lacuna-plum/60 animate-pulse align-middle" />
                            )}
                          </p>
                          {!insight.loading && (
                            <p className="text-xs text-lacuna-text-muted mt-2">
                              Generated by Claude · May contain inaccuracies ·
                              Verify with primary data
                            </p>
                          )}
                        </div>
                      )
                      : insight.loading
                      ? (
                        <div className="flex items-center gap-2 text-sm text-lacuna-text-muted">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating insight…</span>
                        </div>
                      )
                      : null}
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
