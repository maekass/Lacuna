"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

/**
 * Ambient parallax depth field. A fixed plane of soft brand-colored orbs
 * that drift at different rates as the page scrolls, establishing a sense
 * of Z-axis depth behind the content strata.
 */
export default function AmbientDepth() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();

  const yLavender = useTransform(scrollY, [0, 2000], [0, -320]);
  const yBlue = useTransform(scrollY, [0, 2000], [0, 420]);
  const yPink = useTransform(scrollY, [0, 2000], [0, -230]);

  const orbs = [
    {
      key: "lavender",
      y: yLavender,
      style: {
        top: "-12%",
        left: "-8%",
        width: 760,
        height: 760,
        background: "linear-gradient(135deg, #b8a9c9, #e8b4b8)",
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
        background: "linear-gradient(135deg, #4a5d8a, #5d4e6d)",
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
        background: "linear-gradient(135deg, #e8b4b8, #b8a9c9)",
      },
    },
  ];

  return (
    <div className="ambient-field" aria-hidden="true">
      {orbs.map((orb) => (
        <motion.div
          key={orb.key}
          className="ambient-orb"
          style={reduce ? orb.style : { ...orb.style, y: orb.y }}
        />
      ))}
    </div>
  );
}
