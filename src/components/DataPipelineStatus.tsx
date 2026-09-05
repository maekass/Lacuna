"use client";

import DataQualityVisibility from "@/components/DataQualityVisibility";

/**
 * Intelligence "pipeline" panel — the previous stage list invented durations
 * and error counts. This surfaces the measurement-layer census instead.
 */
export default function DataPipelineStatus() {
  return <DataQualityVisibility />;
}
