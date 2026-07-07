/**
 * Cosmetics domain (spec §10, adapted to the pre-rendered character):
 * the portraits are offline-rendered art, so code-side customization is
 * the *presentation* of the figure — gallery lighting over the blurred
 * backdrop and the display-case surface. Appearance variants (outfits,
 * features) are portrait packs: new art through the existing pipeline,
 * slotting into this same config later.
 */

export interface Ambiance {
  id: string;
  name: string;
  blurb: string;
  /** CSS background layered over the blurred backdrop. */
  wash: string;
  /** How the wash mixes with the backdrop. */
  blend: "soft-light" | "overlay" | "multiply" | "screen";
  washOpacity: number;
  /** The display-case card behind the portrait. */
  cardBg: string;
  /** Swatch preview color for the picker. */
  swatch: string;
}

export const AMBIANCES: Ambiance[] = [
  {
    id: "studio",
    name: "Studio",
    blurb: "Neutral daylight — the reference look.",
    wash: "none",
    blend: "soft-light",
    washOpacity: 0,
    cardBg: "#e9eaec",
    swatch: "#e9eaec",
  },
  {
    id: "dawn",
    name: "Dawn",
    blurb: "Warm early light for the morning check-in.",
    wash: "linear-gradient(160deg, #ffb457 0%, #ff7e5f 55%, #f7c9a3 100%)",
    blend: "soft-light",
    washOpacity: 0.55,
    cardBg: "#f3e6da",
    swatch: "#ffb457",
  },
  {
    id: "neon",
    name: "Neon",
    blurb: "Late-night shipping under city glow.",
    wash: "linear-gradient(200deg, #5e5ce6 0%, #30b0c7 60%, #bf5af2 100%)",
    blend: "overlay",
    washOpacity: 0.45,
    cardBg: "#e3e2f4",
    swatch: "#5e5ce6",
  },
  {
    id: "forest",
    name: "Forest",
    blurb: "Deep greens for deep work.",
    wash: "linear-gradient(180deg, #1fa347 0%, #0e6537 70%, #30d158 100%)",
    blend: "soft-light",
    washOpacity: 0.5,
    cardBg: "#e0ecdf",
    swatch: "#1fa347",
  },
  {
    id: "noir",
    name: "Noir",
    blurb: "Low-key light, all business.",
    wash: "linear-gradient(180deg, #17181c 0%, #3a3d45 100%)",
    blend: "multiply",
    washOpacity: 0.38,
    cardBg: "#d7d9de",
    swatch: "#3a3d45",
  },
];

export const DEFAULT_AMBIANCE_ID = "studio";

export interface Cosmetics {
  ambiance: string;
}

export function ambianceById(id: string): Ambiance {
  return AMBIANCES.find((a) => a.id === id) ?? AMBIANCES[0];
}

/** Tolerant read of the stored JSON — unknown shapes fall back to defaults. */
export function parseCosmetics(raw: unknown): Cosmetics {
  const obj = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const ambiance =
    typeof obj.ambiance === "string" &&
    AMBIANCES.some((a) => a.id === obj.ambiance)
      ? obj.ambiance
      : DEFAULT_AMBIANCE_ID;
  return { ambiance };
}
