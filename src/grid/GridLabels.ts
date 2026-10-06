import { Tick } from './Tick.js';

export class GridLabels {
  private constructor() {}
  private static readonly values = [
    0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.2, 1.4, 1.6, 1.8, 2, 3, 4, 5, 10, 20, 50,
  ];
  private static readonly interiorValues = [0.2, 0.4, 0.6, 0.8, 1];

  public static resistance(): Tick[] {
    const axis = [0, ...GridLabels.values].map(
      (r) =>
        new Tick({
          point: { r, i: 0 },
          dp: r === 0 || r >= 10 ? 0 : 1,
          transform: { dx: 0.005, dy: r === 0 ? 0.005 : -0.005 },
          dominantBaseline: r === 0 ? 'hanging' : 'baseline',
        }),
    );
    const interior = [1, -1].flatMap((i) =>
      [...GridLabels.interiorValues].reverse().map(
        (r) =>
          new Tick({
            point: { r, i },
            dp: 1,
            transform: { dx: i * 0.005, dy: -0.005, rotate: i < 0 ? 180 : 0 },
            textAnchor: i < 0 ? 'end' : 'start',
          }),
      ),
    );
    return [...axis, ...interior];
  }

  public static reactance(): Tick[] {
    return [1, -1].flatMap((sign) =>
      [
        ...GridLabels.interiorValues.map((i) => ({ r: 1, i: sign * i })),
        ...GridLabels.values.map((i) => ({ r: 0, i: sign * i })),
      ].map(
        (point) =>
          new Tick({
            point,
            dp: Math.abs(point.i) >= 10 ? 0 : 1,
            transform: {
              dx: -sign * 0.005,
              dy: -0.005,
              rotate:
                sign > 0
                  ? point.r === 1 || point.i < 1
                    ? 180
                    : 0
                  : point.r === 0 && point.i < -1
                    ? 180
                    : 0,
            },
            textAnchor: sign > 0 ? 'end' : 'start',
          }),
      ),
    );
  }
}
