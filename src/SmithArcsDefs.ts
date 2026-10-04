import { Tick } from './arcs/Tick.js';
import { Line } from './shapes/Line.js';

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

export class SmithArcsDefs {
  private constructor() {}

  public static getData(): SmithTicksData {
    return {
      resistance: {
        major: {
          lines: [],
          circles: [10, 50],
          arcs: SmithArcsDefs.resistanceMajor(),
        },
        minor: {
          lines: [],
          circles: [],
          arcs: SmithArcsDefs.resistanceMinor(),
        },
      },
      reactance: {
        major: {
          lines: [{ p1: [-1, 0], p2: [1, 0] }],
          circles: [],
          arcs: SmithArcsDefs.reactanceMajor(),
        },
        minor: {
          lines: [],
          circles: [],
          arcs: SmithArcsDefs.reactanceMinor(),
        },
      },
    };
  }

  public static resistanceLabels(): Tick[] {
    return [
      new Tick({
        point: { r: 0.0, i: 0.0 },
        dp: 0,
        transform: { dx: 0.005, dy: 0.005, rotate: 0 },
        textAnchor: 'start',
        dominantBaseline: 'hanging',
      }),
      new Tick({
        point: { r: 0.1, i: 0.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.2, i: 0.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.3, i: 0.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.4, i: 0.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.5, i: 0.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.6, i: 0.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.7, i: 0.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.8, i: 0.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.9, i: 0.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 1.0, i: 0.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 1.2, i: 0.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 1.4, i: 0.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 1.6, i: 0.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 1.8, i: 0.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 2.0, i: 0.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 3.0, i: 0.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 4.0, i: 0.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 5.0, i: 0.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 10.0, i: 0.0 },
        dp: 0,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 20.0, i: 0.0 },
        dp: 0,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 50.0, i: 0.0 },
        dp: 0,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 1.0, i: 1.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.8, i: 1.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.6, i: 1.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.4, i: 1.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.2, i: 1.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 1.0, i: -1.0 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 0.8, i: -1.0 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 0.6, i: -1.0 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 0.4, i: -1.0 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 0.2, i: -1.0 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'end',
      }),
    ];
  }

  public static reactanceLabels(): Tick[] {
    return [
      new Tick({
        point: { r: 1.0, i: 0.2 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 1.0, i: 0.4 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 1.0, i: 0.6 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 1.0, i: 0.8 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 1.0, i: 1.0 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 0.0, i: 0.1 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 0.0, i: 0.2 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 0.0, i: 0.3 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 0.0, i: 0.4 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 0.0, i: 0.5 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 0.0, i: 0.6 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 0.0, i: 0.7 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 0.0, i: 0.8 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 0.0, i: 0.9 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 0.0, i: 1.0 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 0.0, i: 1.2 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 0.0, i: 1.4 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 0.0, i: 1.6 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 0.0, i: 1.8 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 0.0, i: 2.0 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 0.0, i: 3.0 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 0.0, i: 4.0 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 0.0, i: 5.0 },
        dp: 1,
        transform: { dx: -0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 0.0, i: 10.0 },
        dp: 0,
        transform: { dx: -0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 0.0, i: 20.0 },
        dp: 0,
        transform: { dx: -0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 0.0, i: 50.0 },
        dp: 0,
        transform: { dx: -0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'end',
      }),
      new Tick({
        point: { r: 1.0, i: -0.2 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 1.0, i: -0.4 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 1.0, i: -0.6 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 1.0, i: -0.8 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 1.0, i: -1.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.0, i: -0.1 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.0, i: -0.2 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.0, i: -0.3 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.0, i: -0.4 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.0, i: -0.5 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.0, i: -0.6 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.0, i: -0.7 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.0, i: -0.8 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.0, i: -0.9 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.0, i: -1.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 0 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.0, i: -1.2 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.0, i: -1.4 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.0, i: -1.6 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.0, i: -1.8 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.0, i: -2.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.0, i: -3.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.0, i: -4.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.0, i: -5.0 },
        dp: 1,
        transform: { dx: 0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.0, i: -10.0 },
        dp: 0,
        transform: { dx: 0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.0, i: -20.0 },
        dp: 0,
        transform: { dx: 0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'start',
      }),
      new Tick({
        point: { r: 0.0, i: -50.0 },
        dp: 0,
        transform: { dx: 0.005, dy: -0.005, rotate: 180 },
        textAnchor: 'start',
      }),
    ];
  }

  public static resistanceMajor(): SmithArcDef[] {
    return [
      [
        0.05,
        [
          [0.2, 0],
          [-0.2, 1],
        ],
        [false, true],
      ],
      [
        0.1,
        [
          [2.0, 0],
          [-2.0, 1],
        ],
        [true, true],
      ],
      [
        0.15,
        [
          [0.2, 0],
          [-0.2, 1],
        ],
        [false, true],
      ],
      [
        0.2,
        [
          [5.0, 0],
          [-5.0, 1],
        ],
        [true, true],
      ],
      [
        0.3,
        [
          [2.0, 0],
          [-2.0, 1],
        ],
        [true, true],
      ],
      [
        0.4,
        [
          [5.0, 0],
          [-5.0, 1],
        ],
        [true, true],
      ],
      [
        0.5,
        [
          [2.0, 0],
          [-2.0, 1],
        ],
        [true, true],
      ],
      [
        0.6,
        [
          [5.0, 0],
          [-5.0, 1],
        ],
        [true, true],
      ],
      [
        0.7,
        [
          [2.0, 0],
          [-2.0, 1],
        ],
        [true, true],
      ],
      [
        0.8,
        [
          [5.0, 0],
          [-5.0, 1],
        ],
        [true, true],
      ],
      [
        0.9,
        [
          [2.0, 0],
          [-2.0, 1],
        ],
        [true, true],
      ],
      [
        1.0,
        [
          [10.0, 0],
          [-10.0, 1],
        ],
        [true, true],
      ],
      [
        1.2,
        [
          [5.0, 0],
          [-5.0, 1],
        ],
        [true, true],
      ],
      [
        1.4,
        [
          [5.0, 0],
          [-5.0, 1],
        ],
        [true, true],
      ],
      [
        1.6,
        [
          [5.0, 0],
          [-5.0, 1],
        ],
        [true, true],
      ],
      [
        1.8,
        [
          [5.0, 0],
          [-5.0, 1],
        ],
        [true, true],
      ],
      [
        2.0,
        [
          [20.0, 0],
          [-20.0, 1],
        ],
        [true, true],
      ],
      [
        3.0,
        [
          [10.0, 0],
          [-10.0, 1],
        ],
        [true, true],
      ],
      [
        4.0,
        [
          [20.0, 0],
          [-20.0, 1],
        ],
        [true, true],
      ],
      [
        5.0,
        [
          [10.0, 0],
          [-10.0, 1],
        ],
        [true, true],
      ],
      [
        20.0,
        [
          [50.0, 0],
          [-50.0, 1],
        ],
        [true, true],
      ],
    ];
  }

  public static resistanceMinor(): SmithArcDef[] {
    return [
      [
        0.02,
        [
          [0.2, 0],
          [0.5, 0],
        ],
        [false, false],
      ],
      [
        0.04,
        [
          [0.2, 0],
          [0.5, 0],
        ],
        [false, false],
      ],
      [
        0.06,
        [
          [0.2, 0],
          [0.5, 0],
        ],
        [false, false],
      ],
      [
        0.08,
        [
          [0.2, 0],
          [0.5, 0],
        ],
        [false, false],
      ],
      [
        0.02,
        [
          [-0.2, 1],
          [-0.5, 1],
        ],
        [false, true],
      ],
      [
        0.04,
        [
          [-0.2, 1],
          [-0.5, 1],
        ],
        [false, true],
      ],
      [
        0.05,
        [
          [0.5, 0],
          [1.0, 0],
        ],
        [false, false],
      ],
      [
        0.05,
        [
          [-0.5, 1],
          [-1.0, 1],
        ],
        [false, true],
      ],
      [
        0.06,
        [
          [-0.2, 1],
          [-0.5, 1],
        ],
        [false, true],
      ],
      [
        0.08,
        [
          [-0.2, 1],
          [-0.5, 1],
        ],
        [false, true],
      ],
      [
        0.01,
        [
          [0.2, 0],
          [-0.2, 1],
        ],
        [false, true],
      ],
      [
        0.02,
        [
          [0.2, 0],
          [-0.2, 1],
        ],
        [false, true],
      ],
      [
        0.03,
        [
          [0.2, 0],
          [-0.2, 1],
        ],
        [false, true],
      ],
      [
        0.04,
        [
          [0.2, 0],
          [-0.2, 1],
        ],
        [false, true],
      ],
      [
        0.06,
        [
          [0.2, 0],
          [-0.2, 1],
        ],
        [false, true],
      ],
      [
        0.07,
        [
          [0.2, 0],
          [-0.2, 1],
        ],
        [false, true],
      ],
      [
        0.08,
        [
          [0.2, 0],
          [-0.2, 1],
        ],
        [false, true],
      ],
      [
        0.09,
        [
          [0.2, 0],
          [-0.2, 1],
        ],
        [false, true],
      ],
      [
        0.12,
        [
          [0.2, 0],
          [0.5, 0],
        ],
        [false, false],
      ],
      [
        0.14,
        [
          [0.2, 0],
          [0.5, 0],
        ],
        [false, false],
      ],
      [
        0.16,
        [
          [0.2, 0],
          [0.5, 0],
        ],
        [false, false],
      ],
      [
        0.18,
        [
          [0.2, 0],
          [0.5, 0],
        ],
        [false, false],
      ],
      [
        0.12,
        [
          [-0.2, 1],
          [-0.5, 1],
        ],
        [false, true],
      ],
      [
        0.14,
        [
          [-0.2, 1],
          [-0.5, 1],
        ],
        [false, true],
      ],
      [
        0.16,
        [
          [-0.2, 1],
          [-0.5, 1],
        ],
        [false, true],
      ],
      [
        0.18,
        [
          [-0.2, 1],
          [-0.5, 1],
        ],
        [false, true],
      ],
      [
        0.11,
        [
          [0.2, 0],
          [-0.2, 1],
        ],
        [false, true],
      ],
      [
        0.12,
        [
          [0.2, 0],
          [-0.2, 1],
        ],
        [false, true],
      ],
      [
        0.13,
        [
          [0.2, 0],
          [-0.2, 1],
        ],
        [false, true],
      ],
      [
        0.14,
        [
          [0.2, 0],
          [-0.2, 1],
        ],
        [false, true],
      ],
      [
        0.15,
        [
          [0.5, 0],
          [1.0, 0],
        ],
        [false, false],
      ],
      [
        0.15,
        [
          [-0.5, 1],
          [-1.0, 1],
        ],
        [false, true],
      ],
      [
        0.16,
        [
          [0.2, 0],
          [-0.2, 1],
        ],
        [false, true],
      ],
      [
        0.17,
        [
          [0.2, 0],
          [-0.2, 1],
        ],
        [false, true],
      ],
      [
        0.18,
        [
          [0.2, 0],
          [-0.2, 1],
        ],
        [false, true],
      ],
      [
        0.19,
        [
          [0.2, 0],
          [-0.2, 1],
        ],
        [false, true],
      ],
      [
        0.22,
        [
          [0.5, 0],
          [-0.5, 1],
        ],
        [false, true],
      ],
      [
        0.24,
        [
          [0.5, 0],
          [-0.5, 1],
        ],
        [false, true],
      ],
      [
        0.25,
        [
          [0.5, 0],
          [1.0, 0],
        ],
        [false, false],
      ],
      [
        0.25,
        [
          [-0.5, 1],
          [-1.0, 1],
        ],
        [false, true],
      ],
      [
        0.26,
        [
          [0.5, 0],
          [-0.5, 1],
        ],
        [false, true],
      ],
      [
        0.28,
        [
          [0.5, 0],
          [-0.5, 1],
        ],
        [false, true],
      ],
      [
        0.32,
        [
          [0.5, 0],
          [-0.5, 1],
        ],
        [false, true],
      ],
      [
        0.34,
        [
          [0.5, 0],
          [-0.5, 1],
        ],
        [false, true],
      ],
      [
        0.35,
        [
          [0.5, 0],
          [1.0, 0],
        ],
        [false, false],
      ],
      [
        0.35,
        [
          [-0.5, 1],
          [-1.0, 1],
        ],
        [false, true],
      ],
      [
        0.36,
        [
          [0.5, 0],
          [-0.5, 1],
        ],
        [false, true],
      ],
      [
        0.38,
        [
          [0.5, 0],
          [-0.5, 1],
        ],
        [false, true],
      ],
      [
        0.42,
        [
          [0.5, 0],
          [-0.5, 1],
        ],
        [false, true],
      ],
      [
        0.44,
        [
          [0.5, 0],
          [-0.5, 1],
        ],
        [false, true],
      ],
      [
        0.45,
        [
          [0.5, 0],
          [1.0, 0],
        ],
        [false, false],
      ],
      [
        0.45,
        [
          [-0.5, 1],
          [-1.0, 1],
        ],
        [false, true],
      ],
      [
        0.46,
        [
          [0.5, 0],
          [-0.5, 1],
        ],
        [false, true],
      ],
      [
        0.48,
        [
          [0.5, 0],
          [-0.5, 1],
        ],
        [false, true],
      ],
      [
        0.55,
        [
          [2.0, 0],
          [-2.0, 1],
        ],
        [true, true],
      ],
      [
        0.65,
        [
          [2.0, 0],
          [-2.0, 1],
        ],
        [true, true],
      ],
      [
        0.75,
        [
          [2.0, 0],
          [-2.0, 1],
        ],
        [true, true],
      ],
      [
        0.85,
        [
          [2.0, 0],
          [-2.0, 1],
        ],
        [true, true],
      ],
      [
        0.95,
        [
          [2.0, 0],
          [-2.0, 1],
        ],
        [true, true],
      ],
      [
        1.1,
        [
          [2.0, 0],
          [-2.0, 1],
        ],
        [false, true],
      ],
      [
        1.3,
        [
          [2.0, 0],
          [-2.0, 1],
        ],
        [false, true],
      ],
      [
        1.5,
        [
          [2.0, 0],
          [-2.0, 1],
        ],
        [false, true],
      ],
      [
        1.7,
        [
          [2.0, 0],
          [-2.0, 1],
        ],
        [false, true],
      ],
      [
        1.9,
        [
          [2.0, 0],
          [-2.0, 1],
        ],
        [false, true],
      ],
      [
        2.2,
        [
          [5.0, 0],
          [-5.0, 1],
        ],
        [true, true],
      ],
      [
        2.4,
        [
          [5.0, 0],
          [-5.0, 1],
        ],
        [true, true],
      ],
      [
        2.6,
        [
          [5.0, 0],
          [-5.0, 1],
        ],
        [true, true],
      ],
      [
        2.8,
        [
          [5.0, 0],
          [-5.0, 1],
        ],
        [true, true],
      ],
      [
        3.2,
        [
          [5.0, 0],
          [-5.0, 1],
        ],
        [true, true],
      ],
      [
        3.4,
        [
          [5.0, 0],
          [-5.0, 1],
        ],
        [true, true],
      ],
      [
        3.6,
        [
          [5.0, 0],
          [-5.0, 1],
        ],
        [true, true],
      ],
      [
        3.8,
        [
          [5.0, 0],
          [-5.0, 1],
        ],
        [true, true],
      ],
      [
        4.2,
        [
          [5.0, 0],
          [-5.0, 1],
        ],
        [false, true],
      ],
      [
        4.4,
        [
          [5.0, 0],
          [-5.0, 1],
        ],
        [false, true],
      ],
      [
        4.6,
        [
          [5.0, 0],
          [-5.0, 1],
        ],
        [false, true],
      ],
      [
        4.8,
        [
          [5.0, 0],
          [-5.0, 1],
        ],
        [false, true],
      ],
      [
        6.0,
        [
          [20.0, 0],
          [-20.0, 1],
        ],
        [true, true],
      ],
      [
        7.0,
        [
          [10.0, 0],
          [-10.0, 1],
        ],
        [true, true],
      ],
      [
        8.0,
        [
          [20.0, 0],
          [-20.0, 1],
        ],
        [true, true],
      ],
      [
        9.0,
        [
          [10.0, 0],
          [-10.0, 1],
        ],
        [true, true],
      ],
      [
        12.0,
        [
          [20.0, 0],
          [-20.0, 1],
        ],
        [true, true],
      ],
      [
        14.0,
        [
          [20.0, 0],
          [-20.0, 1],
        ],
        [true, true],
      ],
      [
        16.0,
        [
          [20.0, 0],
          [-20.0, 1],
        ],
        [true, true],
      ],
      [
        18.0,
        [
          [20.0, 0],
          [-20.0, 1],
        ],
        [true, true],
      ],
      [
        30.0,
        [
          [50.0, 0],
          [-50.0, 1],
        ],
        [true, true],
      ],
      [
        40.0,
        [
          [50.0, 0],
          [-50.0, 1],
        ],
        [true, true],
      ],
    ];
  }

  public static reactanceMajor(): SmithArcDef[] {
    return [
      [
        0.05,
        [
          [0.2, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.05,
        [
          [0.2, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.1,
        [
          [2.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.1,
        [
          [2.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.15,
        [
          [0.2, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.15,
        [
          [0.2, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.2,
        [
          [5.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.2,
        [
          [5.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.3,
        [
          [2.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.3,
        [
          [2.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.4,
        [
          [5.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.4,
        [
          [5.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.5,
        [
          [2.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.5,
        [
          [2.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.6,
        [
          [5.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.6,
        [
          [5.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.7,
        [
          [2.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.7,
        [
          [2.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.8,
        [
          [5.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.8,
        [
          [5.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.9,
        [
          [2.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.9,
        [
          [2.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        1.0,
        [
          [10.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -1.0,
        [
          [10.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        1.2,
        [
          [5.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -1.2,
        [
          [5.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        1.4,
        [
          [5.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -1.4,
        [
          [5.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        1.6,
        [
          [5.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -1.6,
        [
          [5.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        1.8,
        [
          [5.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -1.8,
        [
          [5.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        2.0,
        [
          [20.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -2.0,
        [
          [20.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        3.0,
        [
          [10.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -3.0,
        [
          [10.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        4.0,
        [
          [20.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -4.0,
        [
          [20.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        5.0,
        [
          [10.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -5.0,
        [
          [10.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        10.0,
        [
          [20.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -10.0,
        [
          [20.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        20.0,
        [
          [50.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -20.0,
        [
          [50.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        50.0,
        [
          [0.0, 0],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -50.0,
        [
          [0.0, 1],
          [0.0, 0],
        ],
        [false, true],
      ],
    ];
  }

  public static reactanceMinor(): SmithArcDef[] {
    return [
      [
        0.01,
        [
          [0.2, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.01,
        [
          [0.2, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.02,
        [
          [0.5, 1],
          [0.2, 1],
        ],
        [false, false],
      ],
      [
        -0.02,
        [
          [0.5, 0],
          [0.2, 0],
        ],
        [false, true],
      ],
      [
        0.02,
        [
          [0.2, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.02,
        [
          [0.2, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.03,
        [
          [0.2, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.03,
        [
          [0.2, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.04,
        [
          [0.5, 1],
          [0.2, 1],
        ],
        [false, false],
      ],
      [
        -0.04,
        [
          [0.5, 0],
          [0.2, 0],
        ],
        [false, true],
      ],
      [
        0.04,
        [
          [0.2, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.04,
        [
          [0.2, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.06,
        [
          [0.5, 1],
          [0.2, 1],
        ],
        [false, false],
      ],
      [
        -0.06,
        [
          [0.5, 0],
          [0.2, 0],
        ],
        [false, true],
      ],
      [
        0.06,
        [
          [0.2, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.06,
        [
          [0.2, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.07,
        [
          [0.2, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.07,
        [
          [0.2, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.08,
        [
          [0.5, 1],
          [0.2, 1],
        ],
        [false, false],
      ],
      [
        -0.08,
        [
          [0.5, 0],
          [0.2, 0],
        ],
        [false, true],
      ],
      [
        0.08,
        [
          [0.2, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.08,
        [
          [0.2, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.09,
        [
          [0.2, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.09,
        [
          [0.2, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.11,
        [
          [0.2, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.11,
        [
          [0.2, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.12,
        [
          [0.5, 1],
          [0.2, 1],
        ],
        [false, false],
      ],
      [
        -0.12,
        [
          [0.5, 0],
          [0.2, 0],
        ],
        [false, true],
      ],
      [
        0.12,
        [
          [0.2, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.12,
        [
          [0.2, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.13,
        [
          [0.2, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.13,
        [
          [0.2, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.14,
        [
          [0.5, 1],
          [0.2, 1],
        ],
        [false, false],
      ],
      [
        -0.14,
        [
          [0.5, 0],
          [0.2, 0],
        ],
        [false, true],
      ],
      [
        0.14,
        [
          [0.2, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.14,
        [
          [0.2, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.16,
        [
          [0.5, 1],
          [0.2, 1],
        ],
        [false, false],
      ],
      [
        -0.16,
        [
          [0.5, 0],
          [0.2, 0],
        ],
        [false, true],
      ],
      [
        0.16,
        [
          [0.2, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.16,
        [
          [0.2, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.17,
        [
          [0.2, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.17,
        [
          [0.2, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.18,
        [
          [0.5, 1],
          [0.2, 1],
        ],
        [false, false],
      ],
      [
        -0.18,
        [
          [0.5, 0],
          [0.2, 0],
        ],
        [false, true],
      ],
      [
        0.18,
        [
          [0.2, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.18,
        [
          [0.2, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.19,
        [
          [0.2, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.19,
        [
          [0.2, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.22,
        [
          [0.5, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.22,
        [
          [0.5, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.24,
        [
          [0.5, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.24,
        [
          [0.5, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.26,
        [
          [0.5, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.26,
        [
          [0.5, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.28,
        [
          [0.5, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.28,
        [
          [0.5, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.32,
        [
          [0.5, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.32,
        [
          [0.5, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.34,
        [
          [0.5, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.34,
        [
          [0.5, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.36,
        [
          [0.5, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.36,
        [
          [0.5, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.38,
        [
          [0.5, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.38,
        [
          [0.5, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.42,
        [
          [0.5, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.42,
        [
          [0.5, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.44,
        [
          [0.5, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.44,
        [
          [0.5, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.46,
        [
          [0.5, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.46,
        [
          [0.5, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.48,
        [
          [0.5, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.48,
        [
          [0.5, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.05,
        [
          [1.0, 1],
          [0.5, 1],
        ],
        [false, false],
      ],
      [
        -0.05,
        [
          [1.0, 0],
          [0.5, 0],
        ],
        [false, true],
      ],
      [
        0.15,
        [
          [1.0, 1],
          [0.5, 1],
        ],
        [false, false],
      ],
      [
        -0.15,
        [
          [1.0, 0],
          [0.5, 0],
        ],
        [false, true],
      ],
      [
        0.25,
        [
          [1.0, 1],
          [0.5, 1],
        ],
        [false, false],
      ],
      [
        -0.25,
        [
          [1.0, 0],
          [0.5, 0],
        ],
        [false, true],
      ],
      [
        0.35,
        [
          [1.0, 1],
          [0.5, 1],
        ],
        [false, false],
      ],
      [
        -0.35,
        [
          [1.0, 0],
          [0.5, 0],
        ],
        [false, true],
      ],
      [
        0.45,
        [
          [1.0, 1],
          [0.5, 1],
        ],
        [false, false],
      ],
      [
        -0.45,
        [
          [1.0, 0],
          [0.5, 0],
        ],
        [false, true],
      ],
      [
        0.55,
        [
          [1.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.55,
        [
          [1.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.65,
        [
          [1.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.65,
        [
          [1.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.75,
        [
          [1.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.75,
        [
          [1.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.85,
        [
          [1.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.85,
        [
          [1.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        0.95,
        [
          [1.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -0.95,
        [
          [1.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        1.1,
        [
          [2.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -1.1,
        [
          [2.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        1.3,
        [
          [2.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -1.3,
        [
          [2.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        1.5,
        [
          [2.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -1.5,
        [
          [2.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        1.7,
        [
          [2.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -1.7,
        [
          [2.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        1.9,
        [
          [2.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -1.9,
        [
          [2.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        2.2,
        [
          [5.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -2.2,
        [
          [5.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        2.4,
        [
          [5.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -2.4,
        [
          [5.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        2.6,
        [
          [5.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -2.6,
        [
          [5.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        2.8,
        [
          [5.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -2.8,
        [
          [5.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        3.2,
        [
          [5.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -3.2,
        [
          [5.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        3.4,
        [
          [5.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -3.4,
        [
          [5.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        3.6,
        [
          [5.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -3.6,
        [
          [5.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        3.8,
        [
          [5.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -3.8,
        [
          [5.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        4.2,
        [
          [5.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -4.2,
        [
          [5.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        4.4,
        [
          [5.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -4.4,
        [
          [5.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        4.6,
        [
          [5.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -4.6,
        [
          [5.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        4.8,
        [
          [5.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -4.8,
        [
          [5.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        6.0,
        [
          [20.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -6.0,
        [
          [20.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        7.0,
        [
          [10.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -7.0,
        [
          [10.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        8.0,
        [
          [20.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -8.0,
        [
          [20.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        9.0,
        [
          [10.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -9.0,
        [
          [10.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        12.0,
        [
          [50.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -12.0,
        [
          [50.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        14.0,
        [
          [20.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -14.0,
        [
          [20.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        16.0,
        [
          [20.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -16.0,
        [
          [20.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        18.0,
        [
          [20.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -18.0,
        [
          [20.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        30.0,
        [
          [50.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -30.0,
        [
          [50.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
      [
        40.0,
        [
          [50.0, 1],
          [0.0, 1],
        ],
        [false, false],
      ],
      [
        -40.0,
        [
          [50.0, 0],
          [0.0, 0],
        ],
        [false, true],
      ],
    ];
  }
}
