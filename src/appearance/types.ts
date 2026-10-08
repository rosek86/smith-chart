/** Resolved appearance shared by charts and independent scales. Lengths are positive. */
export interface SmithTheme {
  background: string;
  fontFamily: string;
  grid: {
    stroke: string;
    textColor: string;
    majorWidth: number;
    minorWidth: number;
    fontSize: number;
  };
  boundary: { stroke: string; width: number };
  circles: { q: string; vswr: string; width: number };
  scales: {
    stroke: string;
    boundaryColor: string;
    textColor: string;
    valueColor: string;
    indicatorColor: string;
    indicatorOutline: string;
    fontSize: number;
    titleFontSize: number;
    valueFontSize: number;
    peripheralFontSize: number;
  };
  cursor: {
    pointColor: string;
    impedanceColor: string;
    admittanceColor: string;
    pointSize: number;
    lineWidth: number;
  };
  marker: { outlineColor: string; textColor: string; focusColor: string; focusHaloColor: string };
  traceColors: readonly string[];
}

export type SmithThemeOverrides = {
  [K in keyof SmithTheme]?: SmithTheme[K] extends readonly string[]
    ? readonly string[]
    : SmithTheme[K] extends object
      ? Partial<SmithTheme[K]>
      : SmithTheme[K];
};

/** Each application replaces the previous appearance, starting from the named preset. */
export interface SmithAppearance {
  theme?: 'light' | 'dark';
  overrides?: SmithThemeOverrides;
}
