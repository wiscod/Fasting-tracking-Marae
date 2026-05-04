export type Theme = "light" | "dark";
export type Density = "compact" | "comfortable";

export type Tokens = {
  dark: boolean;
  accent: string;
  paper: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  density: Density;
};

export const ACCENT_OLIVE = "oklch(0.62 0.10 130)";
export const ACCENT_AMBER = "oklch(0.66 0.13 55)";

export function tokens(theme: Theme = "light", accent: string = ACCENT_OLIVE, density: Density = "compact"): Tokens {
  const dark = theme === "dark";
  return {
    dark,
    accent,
    paper: dark ? "oklch(0.18 0.012 60)" : "oklch(0.972 0.008 80)",
    surface: dark ? "oklch(0.22 0.014 60)" : "oklch(0.99 0.006 80)",
    ink: dark ? "oklch(0.94 0.01 80)" : "oklch(0.22 0.015 60)",
    muted: dark ? "oklch(0.62 0.012 70)" : "oklch(0.55 0.018 65)",
    line: dark ? "oklch(0.32 0.012 60)" : "oklch(0.88 0.008 70)",
    density,
  };
}

export const FONT_STACK = "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif";
