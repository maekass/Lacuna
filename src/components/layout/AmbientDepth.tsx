"use client";

import {
  motion,
  type MotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import type { CSSProperties } from "react";

interface AmbientOrb {
  key: string;
  y: MotionValue<number>;
  style: CSSProperties;
}

/**
 * Fixed, non-interactive depth plane behind the application content.
 */
export default function AmbientDepth() {
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();

  const yLavender = useTransform(scrollY, [0, 2000], [0, -320]);
  const yBlue = useTransform(scrollY, [0, 2000], [0, 420]);
  const yPink = useTransform(scrollY, [0, 2000], [0, -230]);

  const orbs: AmbientOrb[] = [
    {
      key: "lavender",
      y: yLavender,
      style: {
        top: "-12%",
        left: "-8%",
        width: 760,
        height: 760,
        background:
          "linear-gradient(135deg, var(--lacuna-lavender), var(--lacuna-pink))",
      },
    },
    {
      key: "blue",
      y: yBlue,
      style: {
        top: "10%",
        right: "-12%",
        width: 680,
        height: 680,
        background:
          "linear-gradient(135deg, var(--lacuna-blue), var(--lacuna-plum))",
        opacity: 0.46,
      },
    },
    {
      key: "pink",
      y: yPink,
      style: {
        bottom: "-14%",
        left: "28%",
        width: 620,
        height: 620,
        background:
          "linear-gradient(135deg, var(--lacuna-pink), var(--lacuna-lavender))",
      },
    },
  ];

  return (
    <div className="ambient-field" aria-hidden="true">
      {orbs.map((orb) => (
        <motion.div
          key={orb.key}
          className="ambient-orb"
          style={reduceMotion ? orb.style : { ...orb.style, y: orb.y }}
        />
      ))}
    </div>
  );
}
