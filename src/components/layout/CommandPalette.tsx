"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import InsufficientDataEmpty from "@/components/ui/InsufficientDataEmpty";
import {
  buildCommandItems,
  type CommandDealRef,
  type CommandItem,
  filterCommandItems,
} from "@/lib/ui/commandPalette";

interface CommandPaletteContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  query: string;
  setQuery: (query: string) => void;
  active: number;
  setActive: (active: number | ((current: number) => number)) => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null,
);

export function CommandPaletteProvider({
  deals,
  children,
}: {
  deals: readonly CommandDealRef[];
  children: ReactNode;
}) {
  const [open, setOpenState] = useState(false);
  const [query, setQueryState] = useState("");
  const [active, setActive] = useState(0);
  const items = useMemo(() => buildCommandItems(deals), [deals]);

  function setOpen(next: boolean) {
    setOpenState(next);
    setQueryState("");
    setActive(0);
  }

  function setQuery(next: string) {
    setQueryState(next);
    setActive(0);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpenState((current) => !current);
        setQueryState("");
        setActive(0);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <CommandPaletteContext.Provider
      value={{ open, setOpen, query, setQuery, active, setActive }}
    >
      {children}
      <CommandPaletteDialog items={items} />
    </CommandPaletteContext.Provider>
  );
}

export function CommandPaletteButton() {
  const palette = useContext(CommandPaletteContext);
  if (!palette) return null;

  return (
    <button
      type="button"
      onClick={() => palette.setOpen(true)}
      className="touch-target-inline inline-flex items-center gap-2 rounded-full border border-lacuna-lavender/50 bg-white/70 px-3 py-1.5 text-sm font-medium text-lacuna-plum transition-colors hover:bg-lacuna-lavender/20"
    >
      <Search className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="hidden sm:inline">Search</span>
      <kbd className="hidden rounded border border-lacuna-lavender/40 bg-lacuna-lavender/10 px-1.5 py-0.5 font-mono text-[10px] text-lacuna-plum sm:inline">
        ⌘K
      </kbd>
    </button>
  );
}

function CommandPaletteDialog({ items }: { items: readonly CommandItem[] }) {
  const palette = useContext(CommandPaletteContext);
  const router = useRouter();
  const query = palette?.query ?? "";
  const active = palette?.active ?? 0;
  const open = palette?.open ?? false;
  const results = useMemo(
    () => filterCommandItems(items, query),
    [items, query],
  );
  const selected = results.length === 0
    ? 0
    : Math.min(active, results.length - 1);

  if (!palette) return null;

  function go(item: CommandItem) {
    palette?.setOpen(false);
    router.push(item.href);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={palette.setOpen}
    >
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Search Lacuna</DialogTitle>
          <DialogDescription>
            Jump to a workspace, section, or verified deal.
          </DialogDescription>
        </DialogHeader>
        <div className="border-b border-lacuna-lavender/40 px-4 py-3 pr-12">
          <label className="block">
            <span className="sr-only">
              Search workspaces and verified deals
            </span>
            <input
              autoFocus
              value={query}
              onChange={(event) => palette.setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  palette.setActive(
                    Math.min(selected + 1, Math.max(results.length - 1, 0)),
                  );
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  palette.setActive(Math.max(selected - 1, 0));
                } else if (event.key === "Enter" && results[selected]) {
                  event.preventDefault();
                  go(results[selected]);
                }
              }}
              placeholder="Search workspaces and verified deals"
              className="w-full bg-transparent text-sm text-lacuna-plum placeholder:text-lacuna-blue/40 focus:outline-none"
              role="combobox"
              aria-expanded={open}
              aria-controls="command-palette-results"
              aria-activedescendant={results[selected]
                ? `command-item-${results[selected].id}`
                : undefined}
            />
          </label>
        </div>
        <ul
          id="command-palette-results"
          role="listbox"
          aria-label="Search results"
          className="max-h-80 overflow-y-auto p-2"
        >
          {results.length === 0
            ? (
              <li className="p-2">
                <InsufficientDataEmpty
                  title="No matches"
                  description="Nothing in the verified deals or workspaces matches that search."
                />
              </li>
            )
            : results.map((item, index) => (
              <li key={item.id} role="presentation">
                <button
                  id={`command-item-${item.id}`}
                  type="button"
                  role="option"
                  aria-selected={index === selected}
                  onMouseEnter={() =>
                    palette.setActive(index)}
                  onClick={() =>
                    go(item)}
                  className={`flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left ${
                    index === selected
                      ? "bg-lacuna-lavender/25"
                      : "hover:bg-lacuna-pink/10"
                  }`}
                >
                  <span>
                    <span className="block text-sm font-medium text-lacuna-plum">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-lacuna-blue/75">
                      {item.detail}
                    </span>
                  </span>
                  <span className="lacuna-kicker shrink-0 pt-1 text-[10px] text-lacuna-blue/70">
                    {item.group}
                  </span>
                </button>
              </li>
            ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
