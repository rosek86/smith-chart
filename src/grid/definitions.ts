import type { SmithArcDef, SmithTicksData } from './types.js';

// Each band lists grid values and the clipping circles shared by those values.
type ResistanceBand = [values: number[], from: number, to: number, largeArc: boolean];
type ReactanceBand = [values: number[], outer: number, inner: number];

function resistanceArcs(bands: ResistanceBand[]): SmithArcDef[] {
  return bands.flatMap(([values, from, to, largeArc]) =>
    values.map((value): SmithArcDef => [
      value,
      [
        [from, from < 0 ? 1 : 0],
        [to, to < 0 ? 1 : 0],
      ],
      [largeArc, from > to],
    ]),
  );
}

function reactanceArcs(bands: ReactanceBand[]): SmithArcDef[] {
  return bands.flatMap(([values, outer, inner]) =>
    values.flatMap((value): SmithArcDef[] => [
      [
        value,
        [
          [outer, 1],
          [inner, 1],
        ],
        [false, false],
      ],
      [
        -value,
        [
          [outer, 0],
          [inner, 0],
        ],
        [false, true],
      ],
    ]),
  );
}

const resistanceMajor: ResistanceBand[] = [
  [[0.05, 0.15], 0.2, -0.2, false],
  [[0.1, 0.3, 0.5, 0.7, 0.9], 2, -2, true],
  [[0.2, 0.4, 0.6, 0.8, 1.2, 1.4, 1.6, 1.8], 5, -5, true],
  [[1, 3, 5], 10, -10, true],
  [[2, 4], 20, -20, true],
  [[20], 50, -50, true],
];

const resistanceMinor: ResistanceBand[] = [
  [[0.02, 0.04, 0.06, 0.08, 0.12, 0.14, 0.16, 0.18], 0.2, 0.5, false],
  [[0.02, 0.04, 0.06, 0.08, 0.12, 0.14, 0.16, 0.18], -0.2, -0.5, false],
  [[0.05, 0.15, 0.25, 0.35, 0.45], 0.5, 1, false],
  [[0.05, 0.15, 0.25, 0.35, 0.45], -0.5, -1, false],
  [
    [
      0.01, 0.02, 0.03, 0.04, 0.06, 0.07, 0.08, 0.09, 0.11, 0.12, 0.13, 0.14, 0.16, 0.17, 0.18,
      0.19,
    ],
    0.2,
    -0.2,
    false,
  ],
  [[0.22, 0.24, 0.26, 0.28, 0.32, 0.34, 0.36, 0.38, 0.42, 0.44, 0.46, 0.48], 0.5, -0.5, false],
  [[0.55, 0.65, 0.75, 0.85, 0.95], 2, -2, true],
  [[1.1, 1.3, 1.5, 1.7, 1.9], 2, -2, false],
  [[2.2, 2.4, 2.6, 2.8, 3.2, 3.4, 3.6, 3.8], 5, -5, true],
  [[4.2, 4.4, 4.6, 4.8], 5, -5, false],
  [[6, 8, 12, 14, 16, 18], 20, -20, true],
  [[7, 9], 10, -10, true],
  [[30, 40], 50, -50, true],
];

const reactanceMajor: ReactanceBand[] = [
  [[0.05, 0.15], 0.2, 0],
  [[0.1, 0.3, 0.5, 0.7, 0.9], 2, 0],
  [[0.2, 0.4, 0.6, 0.8, 1.2, 1.4, 1.6, 1.8], 5, 0],
  [[1, 3, 5], 10, 0],
  [[2, 4, 10], 20, 0],
  [[20], 50, 0],
];

const reactanceMinor: ReactanceBand[] = [
  [
    [
      0.01, 0.02, 0.03, 0.04, 0.06, 0.07, 0.08, 0.09, 0.11, 0.12, 0.13, 0.14, 0.16, 0.17, 0.18,
      0.19,
    ],
    0.2,
    0,
  ],
  [[0.02, 0.04, 0.06, 0.08, 0.12, 0.14, 0.16, 0.18], 0.5, 0.2],
  [[0.22, 0.24, 0.26, 0.28, 0.32, 0.34, 0.36, 0.38, 0.42, 0.44, 0.46, 0.48], 0.5, 0],
  [[0.05, 0.15, 0.25, 0.35, 0.45], 1, 0.5],
  [[0.55, 0.65, 0.75, 0.85, 0.95], 1, 0],
  [[1.1, 1.3, 1.5, 1.7, 1.9], 2, 0],
  [[2.2, 2.4, 2.6, 2.8, 3.2, 3.4, 3.6, 3.8, 4.2, 4.4, 4.6, 4.8], 5, 0],
  [[6, 8, 14, 16, 18], 20, 0],
  [[7, 9], 10, 0],
  [[12, 30, 40], 50, 0],
];

/** Build fresh definitions so callers cannot mutate another chart's grid. */
export function createGridDefinitions(): SmithTicksData {
  return {
    resistance: {
      major: { lines: [], circles: [10, 50], arcs: resistanceArcs(resistanceMajor) },
      minor: { lines: [], circles: [], arcs: resistanceArcs(resistanceMinor) },
    },
    reactance: {
      major: {
        lines: [{ p1: [-1, 0], p2: [1, 0] }],
        circles: [],
        arcs: [
          ...reactanceArcs(reactanceMajor),
          [
            50,
            [
              [0, 0],
              [0, 1],
            ],
            [false, false],
          ],
          [
            -50,
            [
              [0, 1],
              [0, 0],
            ],
            [false, true],
          ],
        ],
      },
      minor: { lines: [], circles: [], arcs: reactanceArcs(reactanceMinor) },
    },
  };
}
