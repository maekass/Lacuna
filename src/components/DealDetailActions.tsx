"use client";

import { useCallback, useState } from "react";
import Link from "next/link";

interface DealDetailActionsProps {
  targetId: string;
  briefMarkdown: string;
  downloadName: string;
}

export default function DealDetailActions({
  targetId,
  briefMarkdown,
  downloadName,
}: DealDetailActionsProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "ok" | "err">("idle");

  const flash = useCallback((ok: boolean) => {
    setCopyStatus(ok ? "ok" : "err");
    setTimeout(() => setCopyStatus("idle"), 2000);
  }, []);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      flash(true);
    } catch {
      flash(false);
    }
  }, [flash]);

  const copyBrief = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(briefMarkdown);
      flash(true);
    } catch {
      flash(false);
    }
  }, [briefMarkdown, flash]);

  const downloadBrief = useCallback(() => {
    const blob = new Blob([briefMarkdown], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = downloadName;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [briefMarkdown, downloadName]);

  const copyLabel = copyStatus === "ok"
    ? "Copied"
    : copyStatus === "err"
    ? "Copy failed"
    : "Copy link";

  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <button
        type="button"
        onClick={() => void copyLink()}
        className="min-h-10 w-full rounded-md border border-lacuna-lavender/50 px-3 py-2.5 text-xs font-medium text-lacuna-plum hover:bg-lacuna-lavender/20 sm:w-auto sm:py-1.5"
      >
        {copyLabel}
      </button>
      <button
        type="button"
        onClick={() => void copyBrief()}
        className="min-h-10 w-full rounded-md border border-lacuna-lavender/50 px-3 py-2.5 text-xs font-medium text-lacuna-plum hover:bg-lacuna-lavender/20 sm:w-auto sm:py-1.5"
      >
        Copy brief
      </button>
      <button
        type="button"
        onClick={downloadBrief}
        className="min-h-10 w-full rounded-md bg-lacuna-plum px-3 py-2.5 text-xs font-medium text-white hover:bg-lacuna-blue sm:w-auto sm:py-1.5"
      >
        Download brief
      </button>
      <Link
        href={`/deals?highlight=${encodeURIComponent(targetId)}#network`}
        className="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-lacuna-plum/30 bg-lacuna-plum/10 px-3 py-2.5 text-center text-xs font-medium text-lacuna-plum hover:bg-lacuna-plum/20 sm:w-auto sm:py-1.5"
      >
        View in network
      </Link>
    </div>
  );
}
