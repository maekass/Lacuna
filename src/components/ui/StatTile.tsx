"use client";

import { useEffect, useRef, useState } from "react";

interface StatTileProps {
  value: string;
  label: string;
}

interface AnimatableValue {
  target: number;
  suffix: string;
}

function parseAnimatableValue(value: string): AnimatableValue | null {
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

export default function StatTile({ value, label }: StatTileProps) {
  const animatable = parseAnimatableValue(value);
  const [displayValue, setDisplayValue] = useState(() =>
    animatable ? formatAnimatedValue(0, animatable.suffix) : value
  );
  const displayRef = useRef(displayValue);

  useEffect(() => {
    if (!animatable) return;

    const { target, suffix } = animatable;
    let frameId: number;
    const start = performance.now();
    const duration = 800;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const current = Math.round(target * progress);
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

    displayRef.current = formatAnimatedValue(0, suffix);
    setDisplayValue(formatAnimatedValue(0, suffix));
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [animatable, value]);

  const shown = animatable ? displayValue : value;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-lacuna-lavender/40 px-4 py-4 sm:p-6 hover:shadow-md transition-shadow">
      <p className="text-2xl sm:text-3xl font-bold text-lacuna-plum">
        {shown}
      </p>
      <p className="text-xs sm:text-sm text-lacuna-blue mt-1">{label}</p>
    </div>
  );
}
