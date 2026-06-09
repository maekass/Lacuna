"use client";

import { useEffect, useReducer } from "react";
import CuratedDatasetBanner from "@/components/CuratedDatasetBanner";

interface Callset {
  callsetId: string;
  sampleId: string;
  studyId: string;
  assembly: string;
  variantCount: number;
  bytes: number;
}

interface VariantRow {
  chrom: string;
  pos: number;
  ref: string;
  alt: string;
  geneSymbol: string;
  consequence: string;
  isPathogenic: boolean;
  qual: number;
}

interface State {
  status: "idle" | "disabled" | "loading" | "ready" | "error";
  callsets: Callset[];
  selectedId: string;
  geneFilter: string;
  variants: VariantRow[];
  total: number;
  presignedUrl: string | null;
  message: string;
}

type Action =
  | { type: "DISABLED" }
  | { type: "LOADING" }
  | { type: "CALLSETS"; callsets: Callset[] }
  | { type: "ERROR"; message: string }
  | { type: "SELECT"; callsetId: string }
  | { type: "GENE"; gene: string }
  | { type: "VARIANTS"; variants: VariantRow[]; total: number }
  | { type: "PRESIGN"; url: string | null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "DISABLED":
      return {
        ...state,
        status: "disabled",
        message: "Variant store is off on this deployment.",
      };
    case "LOADING":
      return { ...state, status: "loading", message: "" };
    case "CALLSETS":
      return {
        ...state,
        status: "ready",
        callsets: action.callsets,
        selectedId: action.callsets[0]?.callsetId ?? "",
      };
    case "ERROR":
      return { ...state, status: "error", message: action.message };
    case "SELECT":
      return {
        ...state,
        selectedId: action.callsetId,
        variants: [],
        total: 0,
        presignedUrl: null,
      };
    case "GENE":
      return { ...state, geneFilter: action.gene };
    case "VARIANTS":
      return { ...state, variants: action.variants, total: action.total };
    case "PRESIGN":
      return { ...state, presignedUrl: action.url };
  }
}

const INITIAL: State = {
  status: "idle",
  callsets: [],
  selectedId: "",
  geneFilter: "",
  variants: [],
  total: 0,
  presignedUrl: null,
  message: "",
};

export default function VariantCallsetBrowser() {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  useEffect(() => {
    dispatch({ type: "LOADING" });
    fetch("/api/genomics/callsets?limit=25")
      .then(async (res) => {
        if (res.status === 503) {
          dispatch({ type: "DISABLED" });
          return null;
        }
        if (!res.ok) throw new Error(`callsets ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        dispatch({ type: "CALLSETS", callsets: data.callsets ?? [] });
      })
      .catch(() =>
        dispatch({ type: "ERROR", message: "Could not load callsets." })
      );
  }, []);

  useEffect(() => {
    if (!state.selectedId || state.status !== "ready") return;

    const params = new URLSearchParams({
      callsetId: state.selectedId,
      limit: "50",
    });
    if (state.geneFilter.trim()) {
      params.set("gene", state.geneFilter.trim().toUpperCase());
    }

    fetch(`/api/genomics/variants?${params}`)
      .then((
        res,
      ) => (res.ok ? res.json() : Promise.reject(new Error("variants failed"))))
      .then((data) =>
        dispatch({
          type: "VARIANTS",
          variants: data.variants ?? [],
          total: data.meta?.total ?? 0,
        })
      )
      .catch(() =>
        dispatch({
          type: "ERROR",
          message: "Could not load variants for callset.",
        })
      );

    fetch(
      `/api/genomics/callsets/${encodeURIComponent(state.selectedId)}/object`,
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) =>
        dispatch({ type: "PRESIGN", url: data?.presignedUrl ?? null })
      );
  }, [state.selectedId, state.geneFilter, state.status]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-lacuna-lavender/40 p-4 sm:p-6">
      <CuratedDatasetBanner className="mb-4" />
      <h3 className="text-lg font-semibold text-lacuna-plum mb-1">
        Variant call-set browser
      </h3>
      <p className="text-sm text-lacuna-blue mb-4">
        Queryable variant summaries from ClickHouse; multi-GB VCF blobs stay in
        object storage.
      </p>

      {state.status === "disabled" && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          {state.message} Enable locally per{" "}
          <code className="text-xs">docs/GENOMICS_VARIANT_STORE.md</code>.
        </p>
      )}

      {state.status === "error" && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          {state.message}
        </p>
      )}

      {state.status === "ready" && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <label className="flex-1 text-sm text-lacuna-blue">
              Callset
              <select
                className="mt-1 w-full rounded-lg border border-lacuna-lavender/50 px-3 py-2 text-lacuna-plum"
                value={state.selectedId}
                onChange={(e) =>
                  dispatch({ type: "SELECT", callsetId: e.target.value })}
              >
                {state.callsets.map((c) => (
                  <option key={c.callsetId} value={c.callsetId}>
                    {c.callsetId} ({c.variantCount.toLocaleString()} variants)
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:w-48 text-sm text-lacuna-blue">
              Gene filter
              <input
                className="mt-1 w-full rounded-lg border border-lacuna-lavender/50 px-3 py-2 text-lacuna-plum"
                placeholder="e.g. BRCA1"
                value={state.geneFilter}
                onChange={(e) =>
                  dispatch({ type: "GENE", gene: e.target.value })}
              />
            </label>
          </div>

          {state.presignedUrl && (
            <p className="text-xs text-lacuna-blue mb-3">
              Raw VCF:{" "}
              <a
                href={state.presignedUrl}
                className="underline text-lacuna-plum"
                target="_blank"
                rel="noopener noreferrer"
              >
                presigned download
              </a>
            </p>
          )}

          <p className="text-xs text-lacuna-blue/80 mb-2">
            Showing {state.variants.length} of {state.total.toLocaleString()}
            {" "}
            matching variants
          </p>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-xs">
              <thead className="bg-lacuna-pink/10 text-lacuna-plum">
                <tr>
                  <th className="px-2 py-2 text-left">Chrom</th>
                  <th className="px-2 py-2 text-left">Pos</th>
                  <th className="px-2 py-2 text-left">Ref/Alt</th>
                  <th className="px-2 py-2 text-left">Gene</th>
                  <th className="px-2 py-2 text-left">Consequence</th>
                  <th className="px-2 py-2 text-left">Pathogenic</th>
                </tr>
              </thead>
              <tbody>
                {state.variants.map((v) => (
                  <tr
                    key={`${v.chrom}-${v.pos}-${v.ref}-${v.alt}`}
                    className="border-t border-slate-100"
                  >
                    <td className="px-2 py-1.5">{v.chrom}</td>
                    <td className="px-2 py-1.5">{v.pos.toLocaleString()}</td>
                    <td className="px-2 py-1.5">
                      {v.ref}&gt;{v.alt}
                    </td>
                    <td className="px-2 py-1.5">{v.geneSymbol || "—"}</td>
                    <td className="px-2 py-1.5 truncate max-w-[12rem]">
                      {v.consequence || "—"}
                    </td>
                    <td className="px-2 py-1.5">
                      {v.isPathogenic ? "Yes" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {state.status === "loading" && (
        <div
          className="h-32 animate-pulse rounded-lg bg-lacuna-pink/10"
          aria-hidden
        />
      )}
    </div>
  );
}
