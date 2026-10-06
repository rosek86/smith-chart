import type { Line } from '../math/geometry.js';

export enum SmithArcEntry {
  circle,
  clipCircles,
  arcOptions,
}

export type SmithArcDef = [number, [number, number][], [boolean, boolean]];

export type SmithTickDef = [
  number,
  number,
  {
    dx?: string;
    dy?: string;
  },
];

export interface SmithTicksShapes {
  lines: Line[];
  circles: number[];
  arcs: SmithArcDef[];
}

export interface SmithTicksData {
  resistance: {
    major: SmithTicksShapes;
    minor: SmithTicksShapes;
  };
  reactance: {
    major: SmithTicksShapes;
    minor: SmithTicksShapes;
  };
}
