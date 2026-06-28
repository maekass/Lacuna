"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

const SHORTCUTS = [
  { keys: ["?"], label: "Toggle this panel" },
  { keys: ["G", "H"], label: "Go to Hub" },
  { keys: ["G", "D"], label: "Go to Deals" },
  { keys: ["G", "R"], label: "Go to Research" },
  { keys: ["G", "M"], label: "Go to Methods" },
  { keys: ["G", "I"], label: "Go to Intelligence" },
  { keys: ["Esc"], label: "Close panel" },
];

const NAV_MAP: Record<string, string> = {
  h: "/",
  d: "/deals",
  r: "/research",
  m: "/methods",
  i: "/intelligence",
};

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  const [awaitingG, setAwaitingG] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let gTimer: ReturnType<typeof setTimeout>;

    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "Escape") {
        setOpen(false);
        setAwaitingG(false);
        return;
      }

      if (e.key === "?") {
        setOpen((v) => !v);
        return;
      }

      if (awaitingG) {
        clearTimeout(gTimer);
        setAwaitingG(false);
        const dest = NAV_MAP[e.key.toLowerCase()];
        if (dest) router.push(dest);
        return;
      }

      if (e.key.toLowerCase() === "g") {
        setAwaitingG(true);
        gTimer = setTimeout(() => setAwaitingG(false), 1500);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearTimeout(gTimer);
    };
  }, [awaitingG, router]);

  return (
    <>
      {awaitingG && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[150] rounded-full bg-lacuna-plum/90 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
          G — press a key to navigate
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-lacuna-lavender/40 bg-white p-6 shadow-2xl"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-base font-semibold text-lacuna-plum">
                  Keyboard shortcuts
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1 text-lacuna-blue hover:bg-lacuna-pink/10 transition-colors"
                  aria-label="Close shortcuts panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <ul className="space-y-2.5">
                {SHORTCUTS.map(({ keys, label }) => (
                  <li
                    key={label}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-sm text-lacuna-blue">{label}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {keys.map((k, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <kbd className="rounded-md border border-lacuna-lavender/40 bg-lacuna-lavender/10 px-2 py-0.5 font-mono text-xs text-lacuna-plum">
                            {k}
                          </kbd>
                          {i < keys.length - 1 && (
                            <span className="text-xs text-lacuna-blue/40">
                              then
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>

              <p className="mt-4 text-[11px] text-lacuna-blue/50">
                Press <kbd className="font-mono">?</kbd>{" "}
                anywhere to open this panel.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
