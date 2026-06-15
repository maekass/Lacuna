"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import { useVerifiedDataset } from "@/lib/data/VerifiedDatasetContext";

type ExportFormat = "json" | "csv" | "parquet";

interface ExportOption {
  format: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
  extension: string;
  mimeType: string;
}

const FileJsonIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const FileSpreadsheetIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const FileCodeIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
    />
  </svg>
);

const DownloadIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

const EXPORT_OPTIONS: ExportOption[] = [
  {
    format: "json",
    label: "JSON",
    description: "Full dataset with nested structures",
    icon: <FileJsonIcon />,
    extension: "json",
    mimeType: "application/json",
  },
  {
    format: "csv",
    label: "CSV",
    description: "Flat table format for spreadsheets",
    icon: <FileSpreadsheetIcon />,
    extension: "csv",
    mimeType: "text/csv",
  },
  {
    format: "parquet",
    label: "Parquet",
    description: "Columnar format for analytics (metadata only)",
    icon: <FileCodeIcon />,
    extension: "parquet",
    mimeType: "application/octet-stream",
  },
];

function convertToCSV(data: unknown[]): string {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0] as Record<string, unknown>);
  const escapeCell = (val: unknown): string => {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = data.map((row) =>
    headers.map((h) => escapeCell((row as Record<string, unknown>)[h])).join(
      ",",
    )
  );

  return [headers.join(","), ...rows].join("\n");
}

export default function DataExport() {
  const {
    verifiedCompanies,
    verifiedAcquisitions,
    verifiedAcquirers,
    dataProvenance,
  } = useVerifiedDataset();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("json");
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState<
    { format: string; recordCount: number; timestamp: Date } | null
  >(null);

  const handleExport = useCallback(() => {
    setIsExporting(true);

    const option = EXPORT_OPTIONS.find((o) => o.format === selectedFormat)!;
    let content: string;
    let filename: string;

    if (selectedFormat === "json") {
      const exportData = {
        provenance: dataProvenance,
        companies: verifiedCompanies,
        acquirers: verifiedAcquirers,
        acquisitions: verifiedAcquisitions,
        _meta: {
          exportedAt: new Date().toISOString(),
          version: "1.0",
          recordCount: verifiedCompanies.length + verifiedAcquisitions.length,
        },
      };
      content = JSON.stringify(exportData, null, 2);
      filename = `lacuna_dataset_${dataProvenance.datasetVersion}.json`;
    } else if (selectedFormat === "csv") {
      // Export acquisitions as primary CSV
      const flatAcquisitions = verifiedAcquisitions.map((a) => ({
        id: a.id,
        targetName: a.targetName,
        targetId: a.targetId,
        acquirerName: a.acquirerName,
        acquirerId: a.acquirerId,
        dealValue: a.dealValue,
        dealValueNote: a.dealValueNote,
        announcedDate: a.announcedDate,
        closedDate: a.closedDate,
        dealType: a.dealType,
        strategicRationale: a.strategicRationale,
        source: a.source,
      }));
      content = convertToCSV(flatAcquisitions);
      filename = `lacuna_acquisitions_${dataProvenance.datasetVersion}.csv`;
    } else {
      // Parquet - just metadata for now
      content = JSON.stringify(
        {
          format: "parquet",
          note:
            "Parquet export requires server-side processing. Use JSON or CSV for direct download.",
          recordCount: verifiedCompanies.length + verifiedAcquisitions.length,
          schema: {
            companies: ["id", "name", "sector", "stage", "description"],
            acquisitions: [
              "id",
              "target",
              "acquirer",
              "value",
              "announcedDate",
            ],
          },
        },
        null,
        2,
      );
      filename = `lacuna_metadata_${dataProvenance.datasetVersion}.json`;
    }

    // Create and trigger download
    const blob = new Blob([content], { type: option.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setLastExport({
      format: option.label,
      recordCount: verifiedCompanies.length + verifiedAcquisitions.length,
      timestamp: new Date(),
    });

    setIsExporting(false);
  }, [
    selectedFormat,
    verifiedCompanies,
    verifiedAcquisitions,
    verifiedAcquirers,
    dataProvenance,
  ]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-lacuna-plum">
            Data Export
          </h3>
          <p className="text-sm text-lacuna-blue">
            Download the verified dataset in multiple formats for analysis
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div className="text-2xl font-bold text-slate-700">
              {verifiedCompanies.length}
            </div>
            <div className="text-xs text-slate-600">Companies</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div className="text-2xl font-bold text-slate-700">
              {verifiedAcquisitions.length}
            </div>
            <div className="text-xs text-slate-600">Acquisitions</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div className="text-2xl font-bold text-slate-700">
              {verifiedAcquirers.length}
            </div>
            <div className="text-xs text-slate-600">Acquirers</div>
          </div>
        </div>

        {/* Format Selection */}
        <div className="space-y-2 mb-4">
          {EXPORT_OPTIONS.map((option) => (
            <motion.button
              key={option.format}
              onClick={() => setSelectedFormat(option.format)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                selectedFormat === option.format
                  ? "border-lacuna-plum bg-lacuna-lavender/10"
                  : "border-slate-200 hover:border-lacuna-lavender/50"
              }`}
              whileHover={{ scale: 1.005 }}
              whileTap={{ scale: 0.995 }}
            >
              <div
                className={`p-2 rounded-lg ${
                  selectedFormat === option.format
                    ? "bg-lacuna-plum text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {option.icon}
              </div>
              <div className="flex-1">
                <div className="font-medium text-lacuna-plum">
                  {option.label}
                </div>
                <div className="text-xs text-lacuna-blue">
                  {option.description}
                </div>
              </div>
              {selectedFormat === option.format && (
                <div className="w-2 h-2 rounded-full bg-lacuna-plum" />
              )}
            </motion.button>
          ))}
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-lacuna-plum text-white rounded-lg font-medium hover:bg-lacuna-plum/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <DownloadIcon />
          {isExporting
            ? "Preparing..."
            : `Export as ${selectedFormat.toUpperCase()}`}
        </button>

        {/* Last Export Info */}
        {lastExport && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200"
          >
            <p className="text-sm text-emerald-800">
              <strong>Last export:</strong> {lastExport.format} ·{" "}
              {lastExport.recordCount} records ·{" "}
              {lastExport.timestamp.toLocaleTimeString()}
            </p>
          </motion.div>
        )}

        {/* Schema Info */}
        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-600">
            <strong>Dataset Schema:</strong>{" "}
            Companies (id, name, sector, stage, description, funding),
            Acquisitions (id, target, acquirer, value, announcedDate,
            closedDate, strategicRationale).
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Version: {dataProvenance.datasetVersion} · Updated:{" "}
            {dataProvenance.lastUpdated}
          </p>
        </div>
      </Card>
    </div>
  );
}
