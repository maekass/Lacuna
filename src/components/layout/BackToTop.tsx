"use client";

import { useEffect, useState } from "react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 1.5);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <a
      href="#main-content"
      className="fixed bottom-6 right-6 z-40 touch-target rounded-full bg-lacuna-plum px-4 py-2 text-sm font-medium text-white shadow-lg transition-opacity hover:bg-lacuna-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lacuna-lavender"
    >
      Back to top
    </a>
  );
}
