export type WearableFormFactor =
  | "wrist_band"
  | "smart_ring"
  | "wearable_earrings"
  | "other";

export interface WearableCategoryMeta {
  id: WearableFormFactor;
  label: string;
  shortLabel: string;
  description: string;
}

export const WEARABLE_CATEGORIES: WearableCategoryMeta[] = [
  {
    id: "wrist_band",
    label: "Wrist & Band",
    shortLabel: "Wrist",
    description: "Bands and watches with continuous physiological monitoring",
  },
  {
    id: "smart_ring",
    label: "Smart Ring",
    shortLabel: "Ring",
    description: "Finger-worn sensors for sleep, cycle, and recovery metrics",
  },
  {
    id: "wearable_earrings",
    label: "Wearable Earrings",
    shortLabel: "Earrings",
    description:
      "Ear-worn and smart-jewelry form factors — hearables, temperature, and discreet wellness tracking",
  },
  {
    id: "other",
    label: "Other Wearables",
    shortLabel: "Other",
    description: "Patch, clip, and other verified wearable form factors",
  },
];

const KEYWORDS: Record<WearableFormFactor, string[]> = {
  wrist_band: [
    "wrist",
    "band",
    "watch",
    "bracelet",
    "fitness wearable",
    "whoop",
  ],
  smart_ring: ["ring", "oura", "finger"],
  wearable_earrings: [
    "earring",
    "earrings",
    "ear-worn",
    "ear worn",
    "hearable",
    "in-ear",
    "earable",
    "smart jewelry",
    "jewelry",
    "ear bud",
    "earbud",
  ],
  other: [],
};

export function classifyWearableFormFactor(
  description: string,
): WearableFormFactor {
  const d = description.toLowerCase();

  for (const id of ["wearable_earrings", "smart_ring", "wrist_band"] as const) {
    if (KEYWORDS[id].some((kw) => d.includes(kw))) return id;
  }
  return "other";
}

export function getCategoryMeta(id: WearableFormFactor): WearableCategoryMeta {
  return WEARABLE_CATEGORIES.find((c) => c.id === id) ?? WEARABLE_CATEGORIES[3];
}
