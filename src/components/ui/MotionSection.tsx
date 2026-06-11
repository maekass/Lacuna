"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface MotionSectionProps {
  id?: string;
  className?: string;
  delay?: number;
  children: ReactNode;
}

/**
 * Section wrapper that respects prefers-reduced-motion.
 */
export default function MotionSection({
  id,
  className = "",
  delay = 0,
  children,
}: MotionSectionProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <section id={id} className={className}>
        {children}
      </section>
    );
  }

  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}
