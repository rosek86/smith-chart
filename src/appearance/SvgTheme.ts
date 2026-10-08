import type { SmithTheme } from './types.js';

/** Scope presentation tokens to one chart or scale component. Explicit SVG styles take priority. */
export class SvgTheme {
  private constructor() {}

  public static apply(element: HTMLElement | SVGElement, theme: SmithTheme): void {
    for (const [section, value] of Object.entries(theme)) {
      if (Array.isArray(value)) {
        continue;
      }
      if (typeof value === 'object') {
        for (const [key, entry] of Object.entries(value)) {
          const suffix = key.toLowerCase().endsWith('fontsize') ? 'px' : '';
          element.style.setProperty(`--smithkit-${section}-${key}`, String(entry) + suffix);
        }
      } else {
        element.style.setProperty(`--smithkit-${section}`, value);
      }
    }
    element.style.backgroundColor = theme.background;
  }
}
