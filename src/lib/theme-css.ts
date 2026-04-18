const HEX6 = /^#?([0-9a-fA-F]{6})$/;

/**
 * Tailwind v4 utilities like `bg-primary`, `text-primary`, `shadow-primary/*` compile to
 * `hsl(var(--primary))` / `hsl(var(--primary-foreground))`, where the vars are space-separated
 * H S% L% (no `hsl()` wrapper). Admin theme stores #RRGGBB — convert so those utilities follow settings.
 */
export function hexToHslSpaceForTailwind(hex: string): string | null {
  const m = HEX6.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  const H = Math.round(h * 3600) / 10;
  const S = Math.round(s * 1000) / 10;
  const L = Math.round(l * 1000) / 10;
  return `${H} ${S}% ${L}%`;
}

/** Sets or clears inline `--primary` / `--primary-foreground` on `document.documentElement`. */
export function applyTailwindPrimaryFromHex(
  style: CSSStyleDeclaration,
  buttonColorHex: string | null | undefined,
  buttonTextHex: string | null | undefined
): void {
  const bg = buttonColorHex?.trim();
  const fg = buttonTextHex?.trim();
  if (bg) {
    const t = hexToHslSpaceForTailwind(bg);
    if (t) style.setProperty("--primary", t);
    else style.removeProperty("--primary");
  } else {
    style.removeProperty("--primary");
  }
  if (fg) {
    const t = hexToHslSpaceForTailwind(fg);
    if (t) style.setProperty("--primary-foreground", t);
    else style.removeProperty("--primary-foreground");
  } else {
    style.removeProperty("--primary-foreground");
  }
}
