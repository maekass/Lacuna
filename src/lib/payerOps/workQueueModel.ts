import {
  WORK_QUEUE_VOLUME_WEIGHTS,
  workQueues,
  type WorkQueue,
} from "@/data/payerOpsData";

function formatQueueImpact(monthlySavings: number): string {
  return `$${new Intl.NumberFormat("en-US").format(monthlySavings)}/mo`;
}

/**
 * Allocates modeled avoidable denials across triage queues using
 * {@link WORK_QUEUE_VOLUME_WEIGHTS}, then computes monthly admin savings
 * per queue from the active segment's cost-per-touch.
 */
export function computeWorkQueueVolumes(
  avoidableDenials: number,
  adminCostPerTouch: number,
): WorkQueue[] {
  return workQueues.map((queue) => {
    const volume = Math.round(
      avoidableDenials * WORK_QUEUE_VOLUME_WEIGHTS[queue.key],
    );
    const monthlySavings = Math.round(volume * adminCostPerTouch);
    return {
      ...queue,
      volume,
      impact: formatQueueImpact(monthlySavings),
    };
  });
}

export const WORK_QUEUE_MODEL_FOOTNOTE =
  "Derived · src/lib/payerOps/workQueueModel.ts · queue volumes follow WORK_QUEUE_VOLUME_WEIGHTS; impact = queue volume × simulator admin cost per touch.";
