"use client";

import {
  argbFromHex,
  hexFromArgb,
  themeFromSourceColor,
  type Theme,
} from "@material/material-color-utilities";
import type { Scheme as ThemeScheme } from "./theme-pref";

// Default M3 baseline indigo seed. Change here to re-skin the entire palette.
export const DEFAULT_SEED = argbFromHex("#6750A4");

const COLOR_KEYS = [
  "primary",
  "onPrimary",
  "primaryContainer",
  "onPrimaryContainer",
  "secondary",
  "onSecondary",
  "secondaryContainer",
  "onSecondaryContainer",
  "tertiary",
  "onTertiary",
  "tertiaryContainer",
  "onTertiaryContainer",
  "error",
  "onError",
  "errorContainer",
  "onErrorContainer",
  "background",
  "onBackground",
  "surface",
  "onSurface",
  "surfaceVariant",
  "onSurfaceVariant",
  "outline",
  "outlineVariant",
  "shadow",
  "scrim",
  "inverseSurface",
  "inverseOnSurface",
  "inversePrimary",
] as const;

// M3 surface-container tones come from the neutral palette per the spec.
const SURFACE_CONTAINER_TONES = {
  light: {
    surfaceContainerLowest: 100,
    surfaceContainerLow: 96,
    surfaceContainer: 94,
    surfaceContainerHigh: 92,
    surfaceContainerHighest: 90,
    surfaceBright: 98,
    surfaceDim: 87,
  },
  dark: {
    surfaceContainerLowest: 4,
    surfaceContainerLow: 10,
    surfaceContainer: 12,
    surfaceContainerHigh: 17,
    surfaceContainerHighest: 22,
    surfaceBright: 24,
    surfaceDim: 6,
  },
} as const;

function camelToKebab(camel: string): string {
  return camel.replace(/([A-Z])/g, "-$1").toLowerCase();
}

function applyColorScheme(theme: Theme, scheme: ThemeScheme): void {
  const target = document.documentElement;
  const schemeObj = scheme === "dark" ? theme.schemes.dark : theme.schemes.light;

  for (const key of COLOR_KEYS) {
    const argb = (schemeObj as unknown as Record<string, number>)[key];
    if (typeof argb !== "number") continue;
    target.style.setProperty(`--md-sys-color-${camelToKebab(key)}`, hexFromArgb(argb));
  }

  // Surface containers (derived from the neutral palette per M3 spec).
  const tones = SURFACE_CONTAINER_TONES[scheme];
  for (const [name, tone] of Object.entries(tones)) {
    const argb = theme.palettes.neutral.tone(tone);
    target.style.setProperty(`--md-sys-color-${camelToKebab(name)}`, hexFromArgb(argb));
  }
}

/**
 * Generate the M3 theme from `seed` and apply the given scheme to <html>.
 * Idempotent — call again on every preference change.
 */
export function applyM3Theme(seed: number, scheme: ThemeScheme): void {
  if (typeof document === "undefined") return;
  const theme = themeFromSourceColor(seed);
  applyColorScheme(theme, scheme);
  document.documentElement.dataset.theme = scheme;
}
