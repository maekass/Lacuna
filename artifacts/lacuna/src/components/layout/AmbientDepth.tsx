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

  const yLavender = useTransform(scrollY, [0, 2000], [0, -160]);
  const yBlue = useTransform(scrollY, [0, 2000], [0, 220]);
  const yPink = useTransform(scrollY, [0, 2000], [0, -110]);

  const orbs = [
    {
      key: "lavender",
      y: yLavender,
      style: {
        top: "-10%",
        left: "-8%",
        width: 640,
        height: 640,
        background: "linear-gradient(135deg, #b8a9c9, #e8b4b8)",
      },
    },
    {
      key: "blue",
      y: yBlue,
      style: {
        top: "12%",
        right: "-10%",
        width: 560,
        height: 560,
        background: "linear-gradient(135deg, #4a5d8a, #5d4e6d)",
        opacity: 0.3,
      },
    },
    {
      key: "pink",
      y: yPink,
      style: {
        bottom: "-12%",
        left: "30%",
        width: 520,
        height: 520,
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
