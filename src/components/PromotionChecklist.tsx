"use client";

import { useEffect, useMemo, useState } from "react";
import type { PendingDealRow } from "@/lib/ingestion/pendingDeals";
import {
  allChecksPassed,
  getPromotionCheckItems,
  initialCheckState,
  type PromotionCheckState,
} from "@/lib/ingestion/promotionChecklist";

interface PromotionChecklistProps {
  deal: PendingDealRow;
  onReadyChange: (ready: boolean) => void;
}

export default function PromotionChecklist({
  deal,
  onReadyChange,
}: PromotionChecklistProps) {
  const items = useMemo(() => getPromotionCheckItems(deal), [deal]);
  const [state, setState] = useState<PromotionCheckState>(() =>
    initialCheckState(items)
  );

  const ready = allChecksPassed(state, items);

  useEffect(() => {
    onReadyChange(ready);
  }, [ready, onReadyChange]);

  const toggle = (id: string) => {
    setState((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const ready = allChecksPassed(state, items);

  return (
    <div className="rounded-lg border border-lacuna-lavender/50 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-lacuna-plum">
          Promotion checklist
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            ready
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {ready ? "Ready to promote" : "Complete gates to promote"}
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex gap-2 text-sm">
            <input
              id={`check-${deal.id}-${item.id}`}
              type="checkbox"
              checked={state[item.id] ?? false}
              onChange={() => toggle(item.id)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-lacuna-plum focus:ring-lacuna-plum"
            />
            <label htmlFor={`check-${deal.id}-${item.id}`} className="cursor-pointer">
              <span className="font-medium text-lacuna-text">{item.label}</span>
              <span className="mt-0.5 block text-xs text-lacuna-text-secondary">
                {item.hint}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
