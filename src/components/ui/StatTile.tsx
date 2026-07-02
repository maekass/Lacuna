"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ModelProvenanceHint } from "@/components/ui/ModelProvenanceHint";
import type { ModelProvenance } from "@/lib/provenance/modelProvenance";

interface StatTileProps {
  value: string;
  label: string;
  model?: ModelProvenance;
}

interface AnimatableValue {
  target: number;
  suffix: string;
}

function parseAnimatableValue(value: string): AnimatableValue | null {
  if (value.startsWith("$")) return null;

  const match = value.match(/^[\d,]+/);
  if (!match) return null;

  const numericPart = match[0];
  const target = parseInt(numericPart.replace(/,/g, ""), 10);
  if (Number.isNaN(target)) return null;

  return {
    target,
    suffix: value.slice(numericPart.length),
  };
}

function formatAnimatedValue(current: number, suffix: string): string {
  return `${new Intl.NumberFormat("en-US").format(current)}${suffix}`;
}

export default function StatTile({ value, label, model }: StatTileProps) {
  const animatable = useMemo(() => parseAnimatableValue(value), [value]);
  const [displayValue, setDisplayValue] = useState(() =>
    animatable
      ? formatAnimatedValue(animatable.target, animatable.suffix)
      : value
  );
  const displayRef = useRef(displayValue);
  const prevValueRef = useRef(value);

  useEffect(() => {
    displayRef.current = displayValue;
  }, [displayValue]);

  useEffect(() => {
    if (!animatable) return;

    if (prevValueRef.current === value) return;
    prevValueRef.current = value;

    const { target, suffix } = animatable;
    const fromMatch = displayRef.current.match(/^[\d,]+/);
    const from = fromMatch ? parseInt(fromMatch[0].replace(/,/g, ""), 10) : 0;

    let frameId: number;
    const start = performance.now();
    const duration = 800;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const current = Math.round(from + (target - from) * progress);
      const next = formatAnimatedValue(current, suffix);
      displayRef.current = next;
      setDisplayValue(next);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        const final = formatAnimatedValue(target, suffix);
        displayRef.current = final;
        setDisplayValue(final);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [animatable, value]);

  const shown = animatable ? displayValue : value;

  const tile = (
    <div
      className={`bg-white rounded-xl shadow-sm border border-lacuna-lavender/40 px-4 py-4 sm:p-6 hover:shadow-md transition-shadow ${
        model ? "cursor-help" : ""
      }`}
    >
      <p className="text-2xl sm:text-3xl font-bold text-lacuna-plum">
        {shown}
      </p>
      <p className="text-xs sm:text-sm text-lacuna-blue mt-1">{label}</p>
    </div>
  );

  if (!model) return tile;

  return <ModelProvenanceHint model={model}>{tile}</ModelProvenanceHint>;
}
