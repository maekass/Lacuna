/**
 * Contribution Skyline — dates, grid, stats, levels, camera, and colour maths.
 *
 * Lifted out of the 21st.dev canvas component so the same functions can be
 * unit-tested without a browser. The React/canvas view lives in
 * `src/components/ui/contribution-skyline.tsx`.
 */

export interface ContributionDay {
  date: string;
  count: number;
}

export interface Cell {
  date: string;
  count: number;
  level: number;
  week: number;
  day: number;
}

export interface Streak {
  days: number;
  start: string | null;
  end: string | null;
}

export interface ContributionStats {
  total: number;
  first: string | null;
  last: string | null;
  busiest: { count: number; date: string | null };
  longest: Streak;
  current: Streak;
}

export type RGB = [number, number, number];

export const DAY_MS = 86400000;

/** Clamp `v` into [0, 1]. */
export const clamp01 = (v: number): number => (v > 0 ? (v < 1 ? v : 1) : 0);

/** Linear interpolate `a` → `b` by `t`. */
export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

/** Smooth cubic ease that is 0 at 0 and 1 at 1. */
export const easeInOutCubic = (x: number): number => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/** Cubic ease-out. */
export const easeOutCubic = (x: number): number =>
  1 - Math.pow(1 - clamp01(x), 3);

/** Hermite smoothstep from `a` to `b`. */
export const smoothstep = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** UTC midnight → "YYYY-MM-DD". */
export const toKey = (ms: number): string =>
  new Date(ms).toISOString().slice(0, 10);

/**
 * Any date-ish value → UTC midnight of its calendar day. "YYYY-MM-DD" strings
 * are read literally (no timezone drift), Date objects by their local day,
 * numbers as UTC timestamps.
 */
export const dayMs = (v: string | number | Date): number => {
  if (typeof v === "number") return Math.floor(v / DAY_MS) * DAY_MS;
  if (typeof v === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
    v = new Date(v);
  }
  return Date.UTC(v.getFullYear(), v.getMonth(), v.getDate());
};

/** mulberry32 — small, fast, deterministic. */
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * A believable year for demos: quiet weekends, a few busy seasons, a mood that
 * drifts week to week, and the odd enormous day.
 */
export const generateContributions = (
  endMs: number,
  seed = 7,
  days = 371,
): ContributionDay[] => {
  const r = rng(seed);
  const bursts = Array.from({ length: 4 }, () => ({
    at: r(),
    width: 0.035 + r() * 0.07,
    gain: 0.6 + r() * 1.1,
  }));
  const out: ContributionDay[] = [];
  let mood = 0.5;
  for (let i = 0; i < days; i++) {
    const ms = endMs - (days - 1 - i) * DAY_MS;
    const x = i / Math.max(1, days - 1);
    const dow = new Date(ms).getUTCDay();
    const weekend = dow === 0 || dow === 6;
    let heat = 0.2;
    for (const b of bursts) {
      heat += b.gain * Math.exp(-((x - b.at) ** 2) / (2 * b.width ** 2));
    }
    mood = mood * 0.85 + r() * 0.15;
    heat *= 0.55 + mood * 0.9;
    const pActive = Math.min(0.94, (weekend ? 0.22 : 0.5) + heat * 0.4);
    let count = 0;
    if (r() < pActive) {
      count = 1 +
        Math.floor(-Math.log(1 - r()) * (1.2 + heat * 7) * (weekend ? 0.5 : 1));
    }
    if (r() < 0.01) count += 18 + Math.floor(r() * 24);
    out.push({ date: toKey(ms), count });
  }
  return out;
};

/**
 * The grid: columns are weeks, rows are weekdays (row 0 = `weekStart`). It
 * ends on `endMs` and starts on the week containing the day one year earlier.
 * Levels 1–4 split the non-zero days by their share of a busy day — the 95th
 * percentile, so one freak day can't wash every other day out to level 1.
 */
export const buildGrid = (
  data: ContributionDay[],
  endMs: number,
  weekStart = 0,
) => {
  const counts = new Map<string, number>();
  for (const d of data) {
    if (!d || typeof d.date !== "string") continue;
    const ms = dayMs(d.date);
    const c = Number(d.count);
    if (!Number.isFinite(ms) || !(c > 0) || !Number.isFinite(c)) continue;
    const k = toKey(ms);
    counts.set(k, (counts.get(k) ?? 0) + c);
  }
  let start = endMs - 364 * DAY_MS;
  start -= ((new Date(start).getUTCDay() - weekStart + 7) % 7) * DAY_MS;
  const cells: Cell[] = [];
  for (let ms = start, i = 0; ms <= endMs; ms += DAY_MS, i++) {
    const date = toKey(ms);
    cells.push({
      date,
      count: counts.get(date) ?? 0,
      level: 0,
      week: Math.floor(i / 7),
      day: i % 7,
    });
  }
  const nz = cells.map((c) => c.count).filter((c) => c > 0).sort((a, b) =>
    a - b
  );
  const busy = nz.length ? nz[Math.floor(0.95 * (nz.length - 1))] : 0;
  for (const c of cells) c.level = levelOf(c.count, busy ?? 0);
  return {
    cells,
    weeks: cells.length ? cells[cells.length - 1]!.week + 1 : 0,
    max: nz.length ? nz[nz.length - 1]! : 0,
  };
};

/** 0 for an empty day, else 1–4 by quarters of `busy`. Anything at or past `busy` is 4. */
export const levelOf = (count: number, busy: number): number =>
  count <= 0
    ? 0
    : busy <= 0
    ? 4
    : 1 + Math.min(3, Math.floor((count / busy) * 4));

/**
 * Total, busiest day, longest run, and the run that reaches today (or
 * yesterday — today isn't over).
 */
export const computeStats = (cells: Cell[]): ContributionStats => {
  let total = 0;
  let best = 0;
  let bestDate: string | null = null;
  let run = 0;
  let runStart: string | null = null;
  let longest: Streak = { days: 0, start: null, end: null };
  for (const c of cells) {
    total += c.count;
    if (c.count > best) {
      best = c.count;
      bestDate = c.date;
    }
    if (c.count > 0) {
      if (run === 0) runStart = c.date;
      run++;
      if (run > longest.days) {
        longest = { days: run, start: runStart, end: c.date };
      }
    } else run = 0;
  }
  let j = cells.length - 1;
  if (j >= 0 && cells[j]!.count === 0) j--;
  const endAt = j;
  while (j >= 0 && cells[j]!.count > 0) j--;
  const days = endAt - j;
  const current: Streak = days > 0
    ? { days, start: cells[j + 1]!.date, end: cells[endAt]!.date }
    : { days: 0, start: null, end: null };
  return {
    total,
    first: cells.length ? cells[0]!.date : null,
    last: cells.length ? cells[cells.length - 1]!.date : null,
    busiest: { count: best, date: bestDate },
    longest,
    current,
  };
};

/** A label on each week whose first day starts a new month; a cramped first label is dropped. */
export const monthLabels = (cells: Cell[], weeks: number, locale = "en-US") => {
  const fmt = new Intl.DateTimeFormat(locale, {
    month: "short",
    timeZone: "UTC",
  });
  const out: { week: number; label: string }[] = [];
  let prev = -1;
  for (let w = 0; w < weeks; w++) {
    const c = cells[w * 7];
    if (!c) break;
    const m = +c.date.slice(5, 7);
    if (m !== prev) out.push({ week: w, label: fmt.format(dayMs(c.date)) });
    prev = m;
  }
  if (out.length > 1 && out[1]!.week - out[0]!.week < 3) out.shift();
  return out;
};

/** Box height in grid units. Empty days are thin slabs; the busiest day is ~7.6 cells tall. */
export const barHeight = (count: number, max: number, scale = 1): number =>
  count > 0 && max > 0 ? 0.4 + Math.pow(count / max, 0.85) * 7.2 * scale : 0.2;

/** Share of the morph each bar spends waiting — the wave sweeps oldest week → newest. */
export const WAVE = 0.42;

/** 0 → 1 as a bar rises during the morph. Every bar is flat at t=0 and fully up at t=1. */
export const riseAt = (
  t: number,
  week: number,
  weeks: number,
  day: number,
): number => {
  const d = (weeks > 1 ? week / (weeks - 1) : 0) * 0.36 + (day / 6) * 0.06;
  return easeOutCubic((t - d) / (1 - WAVE));
};

export const YAW_3D = Math.PI / 4;
export const ELEV_3D = (34 * Math.PI) / 180;
export const YAW_RANGE: [number, number] = [
  (8 * Math.PI) / 180,
  (82 * Math.PI) / 180,
];
export const ELEV_RANGE: [number, number] = [
  (18 * Math.PI) / 180,
  (62 * Math.PI) / 180,
];

export interface Cam {
  cs: number;
  sn: number;
  se: number;
  ce: number;
}

/**
 * e=0 looks straight down (yaw 0, elevation 90°): x across, y down, height
 * invisible — a plain heat map. e=1 is the isometric corner view. Orbit
 * offsets only apply in proportion to e, so the flat view never tilts.
 */
export const camera = (e: number, dYaw = 0, dElev = 0): Cam => {
  const yaw = Math.min(YAW_RANGE[1], Math.max(0, lerp(0, YAW_3D + dYaw, e)));
  const elev = lerp(
    Math.PI / 2,
    Math.min(ELEV_RANGE[1], Math.max(ELEV_RANGE[0], ELEV_3D + dElev)),
    e,
  );
  return {
    cs: Math.cos(yaw),
    sn: Math.sin(yaw),
    se: Math.sin(elev),
    ce: Math.cos(elev),
  };
};

/** World (x = week, y = weekday, z = up) → screen, before scale/offset. */
export const project = (
  c: Cam,
  x: number,
  y: number,
  z: number,
): [number, number] => [
  x * c.cs - y * c.sn,
  (x * c.sn + y * c.cs) * c.se - z * c.ce,
];

/** Painter's depth for yaw in [0°, 90°]: larger is nearer the viewer, so draw ascending. */
export const depthOf = (c: Cam, x: number, y: number): number =>
  x * c.sn + y * c.cs;

export const mixRGB = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

export const luminance = (c: RGB): number =>
  (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;

export type PaletteName =
  | "github"
  | "halloween"
  | "ocean"
  | "ember"
  | "grape"
  | "mono";
export type PaletteInput =
  | PaletteName
  | string[]
  | { light: string[]; dark: string[] };

/** Four colours per theme, lightest activity → heaviest. */
export const PALETTES: Record<
  PaletteName,
  { light: string[]; dark: string[] }
> = {
  github: {
    light: ["#c6e48b", "#7bc96f", "#239a3b", "#196127"],
    dark: ["#0e4429", "#006d32", "#26a641", "#39d353"],
  },
  halloween: {
    light: ["#ffee4a", "#ffc501", "#fe9600", "#b33c00"],
    dark: ["#631c03", "#bd561d", "#fa7a18", "#fddf68"],
  },
  ocean: {
    light: ["#b8e3f5", "#6ec3eb", "#2a8fd1", "#0b4f8a"],
    dark: ["#0c2d4a", "#12508a", "#2a88d8", "#7cc7ff"],
  },
  ember: {
    light: ["#fde2c4", "#fbad6e", "#f06b3a", "#b3261e"],
    dark: ["#4a1a10", "#8f2f16", "#e0572a", "#ffa46b"],
  },
  grape: {
    light: ["#e4d4fb", "#b794f4", "#805ad5", "#44337a"],
    dark: ["#2d1f4f", "#553c9a", "#8b5cf6", "#c4b5fd"],
  },
  mono: {
    light: ["#d4d4d4", "#a3a3a3", "#525252", "#171717"],
    dark: ["#333333", "#5c5c5c", "#a3a3a3", "#fafafa"],
  },
};

/** Resolve a palette name, four colours, or `{ light, dark }` into four hex strings. */
export const resolvePalette = (
  p: PaletteInput | undefined,
  dark: boolean,
): string[] => {
  const fallback = PALETTES.github[dark ? "dark" : "light"];
  let pick: string[];
  if (Array.isArray(p)) {
    pick = p;
  } else if (p && typeof p === "object") {
    pick = dark ? p.dark : p.light;
  } else if (typeof p === "string" && p in PALETTES) {
    pick = PALETTES[p][dark ? "dark" : "light"];
  } else {
    pick = fallback;
  }
  return [0, 1, 2, 3].map((i) =>
    pick[i] ?? pick[pick.length - 1] ?? fallback[i]!
  );
};
