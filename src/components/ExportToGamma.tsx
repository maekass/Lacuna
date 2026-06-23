"use client";

import { useCallback, useReducer, useState } from "react";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";
import {
  ExportScope,
  formatLacunaForGamma,
} from "@/lib/gamma/formatLacunaData";

interface GenerationState {
  status: "idle" | "submitting" | "polling" | "completed" | "error";
  generationId: string | null;
  gammaUrl: string | null;
  exportUrl: string | null;
  error: string | null;
}

type GenerationAction =
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_OK"; generationId: string }
  | { type: "POLL_OK"; gammaUrl: string; exportUrl?: string }
  | { type: "ERROR"; message: string }
  | { type: "RESET" };

function generationReducer(
  state: GenerationState,
  action: GenerationAction,
): GenerationState {
  switch (action.type) {
    case "SUBMIT_START":
      return { ...state, status: "submitting", error: null };
    case "SUBMIT_OK":
      return { ...state, status: "polling", generationId: action.generationId };
    case "POLL_OK":
      return {
        ...state,
        status: "completed",
        gammaUrl: action.gammaUrl,
        exportUrl: action.exportUrl || null,
      };
    case "ERROR":
      return { ...state, status: "error", error: action.message };
    case "RESET":
      return {
        status: "idle",
        generationId: null,
        gammaUrl: null,
        exportUrl: null,
        error: null,
      };
    default:
      return state;
  }
}

const FORMAT_OPTIONS = [
  { value: "presentation", label: "Presentation" },
  { value: "document", label: "Document" },
  { value: "webpage", label: "Webpage" },
] as const;

const SCOPE_OPTIONS = [
  { value: "full", label: "Full report" },
  { value: "deals-only", label: "Deals only" },
  { value: "analytics-only", label: "Analytics only" },
] as const;

const EXPORT_OPTIONS = [
  { value: "", label: "None (view online)" },
  { value: "pptx", label: "PowerPoint (.pptx)" },
  { value: "pdf", label: "PDF" },
] as const;

export default function ExportToGamma() {
  const { verifiedCompanies, verifiedAcquisitions } = useVerifiedDataset();
  const dataset = useVerifiedDataset();

  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("lacuna_gamma_key") || "";
    }
    return "";
  });
  const [format, setFormat] = useState<"presentation" | "document" | "webpage">(
    "presentation",
  );
  const [scope, setScope] = useState<ExportScope>("full");
  const [exportAs, setExportAs] = useState<"" | "pptx" | "pdf">("");
  const [saveKey, setSaveKey] = useState(true);

  const [state, dispatch] = useReducer(generationReducer, {
    status: "idle",
    generationId: null,
    gammaUrl: null,
    exportUrl: null,
    error: null,
  });

  const pollStatus = useCallback(async (generationId: string, key: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts += 1;
      await new Promise((resolve) => setTimeout(resolve, 3000));

      try {
        const res = await fetch(`/api/gamma/status/${generationId}`, {
          headers: { "x-gamma-key": key },
        });

        if (!res.ok) {
          const err = await res.json();
          dispatch({
            type: "ERROR",
            message: err.error || "Status check failed",
          });
          return;
        }

        const data = await res.json();

        if (data.status === "completed") {
          dispatch({
            type: "POLL_OK",
            gammaUrl: data.gammaUrl,
            exportUrl: data.exportUrl,
          });
          return;
        }

        if (data.status === "failed") {
          dispatch({
            type: "ERROR",
            message: data.error || "Generation failed",
          });
          return;
        }
      } catch {
        dispatch({ type: "ERROR", message: "Network error while polling" });
        return;
      }
    }

    dispatch({
      type: "ERROR",
      message: "Generation timed out after 3 minutes",
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!apiKey.trim()) {
      dispatch({ type: "ERROR", message: "Please enter your Gamma API key" });
      return;
    }

    dispatch({ type: "SUBMIT_START" });

    if (saveKey) {
      localStorage.setItem("lacuna_gamma_key", apiKey);
    }

    const rawDataset = {
      companies: dataset.verifiedCompanies.map((c) => ({ ...c, hq: c.hq ?? "" })),
      acquirers: dataset.verifiedAcquirers.map((a) => ({ ...a, hq: a.hq ?? "" })),
      acquisitions: dataset.verifiedAcquisitions,
    };

    const inputText = formatLacunaForGamma(rawDataset, scope);

    const body: Record<string, unknown> = {
      apiKey,
      inputText,
      title:
        `Lacuna — Women's Health M&A Intelligence (${verifiedAcquisitions.length} deals)`,
      format,
      textMode: "generate",
      numCards: scope === "full" ? 12 : 8,
      additionalInstructions:
        "Create a professional, data-driven presentation. Use clean charts where possible. Include source attribution noting SEC EDGAR filings and ClinicalTrials.gov. Keep a healthcare/biotech visual tone.",
    };

    if (exportAs) {
      body.exportAs = exportAs;
    }

    try {
      const res = await fetch("/api/gamma/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        dispatch({
          type: "ERROR",
          message: err.error || `Request failed: ${res.status}`,
        });
        return;
      }

      const data = await res.json();
      dispatch({ type: "SUBMIT_OK", generationId: data.generationId });
      pollStatus(data.generationId, apiKey);
    } catch {
      dispatch({
        type: "ERROR",
        message: "Network error — check your connection",
      });
    }
  }, [
    apiKey,
    saveKey,
    format,
    scope,
    exportAs,
    dataset,
    verifiedAcquisitions.length,
    pollStatus,
  ]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-lacuna-lavender/40 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-lacuna-lavender/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-lacuna-plum">
              Export to Gamma
            </p>
            <p className="text-xs text-lacuna-blue">
              Generate a presentation from {verifiedCompanies.length}{" "}
              companies · {verifiedAcquisitions.length} deals
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-lacuna-blue transition-transform ${
            isOpen ? "rotate-180" : ""
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
      </button>

      {isOpen && (
        <div className="px-5 pb-5 border-t border-lacuna-lavender/30 pt-4 space-y-4">
          {/* API Key */}
          <div>
            <label className="block text-xs font-medium text-lacuna-plum mb-1">
              Gamma API Key
              <a
                href="https://gamma.app/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-violet-600 hover:underline"
              >
                Get key →
              </a>
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) =>
                  setApiKey(e.target.value)}
                placeholder="gma_..."
                className="flex-1 px-3 py-2 text-sm border border-lacuna-lavender/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
              />
              <label className="flex items-center gap-1.5 text-xs text-lacuna-blue whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={saveKey}
                  onChange={(e) => setSaveKey(e.target.checked)}
                  className="rounded border-lacuna-lavender/50"
                />
                Remember
              </label>
            </div>
            <p className="mt-1 text-[11px] text-lacuna-blue/60">
              Requires Gamma Pro, Ultra, Teams, or Business plan. Key stored in
              browser only.
            </p>
          </div>

          {/* Options row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-lacuna-plum mb-1">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as typeof format)}
                className="w-full px-3 py-2 text-sm border border-lacuna-lavender/50 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
              >
                {FORMAT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-lacuna-plum mb-1">
                Scope
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as ExportScope)}
                className="w-full px-3 py-2 text-sm border border-lacuna-lavender/50 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
              >
                {SCOPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-lacuna-plum mb-1">
                Export file
              </label>
              <select
                value={exportAs}
                onChange={(e) => setExportAs(e.target.value as typeof exportAs)}
                className="w-full px-3 py-2 text-sm border border-lacuna-lavender/50 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
              >
                {EXPORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Generate button / status */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={state.status === "submitting" ||
                state.status === "polling"}
              className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {state.status === "submitting" && "Starting…"}
              {state.status === "polling" && "Generating…"}
              {(state.status === "idle" || state.status === "error" ||
                state.status === "completed") && "Generate with Gamma"}
            </button>

            {state.status === "polling" && (
              <span className="flex items-center gap-2 text-xs text-lacuna-blue">
                <span className="w-2 h-2 bg-violet-500 rounded-full animate-pulse">
                </span>
                Processing — typically 15–60 seconds
              </span>
            )}

            {state.status === "completed" && state.gammaUrl && (
              <div className="flex items-center gap-3">
                <a
                  href={state.gammaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-violet-600 hover:underline"
                >
                  Open in Gamma ↗
                </a>
                {state.exportUrl && (
                  <a
                    href={state.exportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-indigo-600 hover:underline"
                  >
                    Download export ↗
                  </a>
                )}
                <button
                  onClick={() => dispatch({ type: "RESET" })}
                  className="text-xs text-lacuna-blue hover:text-lacuna-plum"
                >
                  Reset
                </button>
              </div>
            )}
          </div>

          {/* Error display */}
          {state.error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {state.error}
            </div>
          )}

          {/* Info footer */}
          <p className="text-[11px] text-lacuna-blue/50 leading-relaxed">
            Generates a Gamma {format}{" "}
            from Lacuna&apos;s verified dataset. Credits are charged to your
            Gamma account. Data sourced from SEC EDGAR + ClinicalTrials.gov —
            see provenance banner above.{" "}
            <a
              href="https://developers.gamma.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-500 hover:underline"
            >
              Gamma API docs
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
