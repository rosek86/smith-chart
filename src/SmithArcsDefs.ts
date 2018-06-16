
export enum SmithArcEntry { circle, clipCircles, arcOptions }

export type SmithArcDef = [
  number,
  [ number, number ][] | undefined,
  [ boolean, boolean ]
];

export class SmithArcsDefs {
  private constructor() {
  }

  public static textsTicks(): [number, number][] {
    // [ resistance circle, fractional digits ]
    return [
      [  0.10, 1 ], [  0.20, 1 ], [  0.30, 1 ], [  0.40, 1 ], [  0.50, 1 ],
      [  0.60, 1 ], [  0.70, 1 ], [  0.80, 1 ], [  0.90, 1 ], [  1.00, 1 ],
      [  1.20, 1 ], [  1.40, 1 ], [  1.60, 1 ], [  1.80, 1 ], [  2.00, 1 ],
      [  3.00, 1 ], [  4.00, 1 ], [  5.00, 1 ], [ 10.00, 0 ], [ 20.00, 0 ],
      [ 50.00, 0 ]
    ];
  }

  public static resistanceMajor(): SmithArcDef[] {
    return [
      [  0.00, undefined,                     [ true,  true  ] ],
      [  0.00, undefined,                     [ true,  false ] ],
      [  0.05, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.10, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ true,  true  ] ],
      [  0.15, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.20, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  0.30, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ true,  true  ] ],
      [  0.40, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  0.50, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ true,  true  ] ],
      [  0.60, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  0.70, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ true,  true  ] ],
      [  0.80, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  0.90, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ true,  true  ] ],
      [  1.00, [ [ 10.0, 0 ], [ -10.0, 1 ] ], [ true,  true  ] ],
      [  1.20, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  1.40, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  1.60, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  1.80, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  2.00, [ [ 20.0, 0 ], [ -20.0, 1 ] ], [ true,  true  ] ],
      [  3.00, [ [ 10.0, 0 ], [ -10.0, 1 ] ], [ true,  true  ] ],
      [  4.00, [ [ 20.0, 0 ], [ -20.0, 1 ] ], [ true,  true  ] ],
      [  5.00, [ [ 10.0, 0 ], [ -10.0, 1 ] ], [ true,  true  ] ],
      [ 10.00, undefined,                     [ true,  true  ] ],
      [ 10.00, undefined,                     [ true,  false ] ],
      [ 20.00, [ [ 50.0, 0 ], [ -50.0, 1 ] ], [ true,  true  ] ],
      [ 50.00, undefined,                     [ true,  true  ] ],
      [ 50.00, undefined,                     [ true,  false ] ],
    ];
  }

  public static resistanceMinor(): SmithArcDef[] {
    return [
      [  0.02, [ [  0.2, 0 ], [   0.5, 0 ] ], [ false, false ] ],
      [  0.04, [ [  0.2, 0 ], [   0.5, 0 ] ], [ false, false ] ],
      [  0.06, [ [  0.2, 0 ], [   0.5, 0 ] ], [ false, false ] ],
      [  0.08, [ [  0.2, 0 ], [   0.5, 0 ] ], [ false, false ] ],
      [  0.02, [ [ -0.2, 1 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.04, [ [ -0.2, 1 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.05, [ [  0.5, 0 ], [   1.0, 0 ] ], [ false, false ] ],
      [  0.05, [ [ -0.5, 1 ], [  -1.0, 1 ] ], [ false, true  ] ],
      [  0.06, [ [ -0.2, 1 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.08, [ [ -0.2, 1 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.01, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.02, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.03, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.04, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.06, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.07, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.08, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.09, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.12, [ [  0.2, 0 ], [   0.5, 0 ] ], [ false, false ] ],
      [  0.14, [ [  0.2, 0 ], [   0.5, 0 ] ], [ false, false ] ],
      [  0.16, [ [  0.2, 0 ], [   0.5, 0 ] ], [ false, false ] ],
      [  0.18, [ [  0.2, 0 ], [   0.5, 0 ] ], [ false, false ] ],
      [  0.12, [ [ -0.2, 1 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.14, [ [ -0.2, 1 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.16, [ [ -0.2, 1 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.18, [ [ -0.2, 1 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.11, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.12, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.13, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.14, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.15, [ [  0.5, 0 ], [   1.0, 0 ] ], [ false, false ] ],
      [  0.15, [ [ -0.5, 1 ], [  -1.0, 1 ] ], [ false, true  ] ],
      [  0.16, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.17, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.18, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.19, [ [  0.2, 0 ], [  -0.2, 1 ] ], [ false, true  ] ],
      [  0.22, [ [  0.5, 0 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.24, [ [  0.5, 0 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.25, [ [  0.5, 0 ], [   1.0, 0 ] ], [ false, false ] ],
      [  0.25, [ [ -0.5, 1 ], [  -1.0, 1 ] ], [ false, true  ] ],
      [  0.26, [ [  0.5, 0 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.28, [ [  0.5, 0 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.32, [ [  0.5, 0 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.34, [ [  0.5, 0 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.35, [ [  0.5, 0 ], [   1.0, 0 ] ], [ false, false ] ],
      [  0.35, [ [ -0.5, 1 ], [  -1.0, 1 ] ], [ false, true  ] ],
      [  0.36, [ [  0.5, 0 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.38, [ [  0.5, 0 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.42, [ [  0.5, 0 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.44, [ [  0.5, 0 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.45, [ [  0.5, 0 ], [   1.0, 0 ] ], [ false, false ] ],
      [  0.45, [ [ -0.5, 1 ], [  -1.0, 1 ] ], [ false, true  ] ],
      [  0.46, [ [  0.5, 0 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.48, [ [  0.5, 0 ], [  -0.5, 1 ] ], [ false, true  ] ],
      [  0.55, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ true,  true  ] ],
      [  0.65, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ true,  true  ] ],
      [  0.75, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ true,  true  ] ],
      [  0.85, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ true,  true  ] ],
      [  0.95, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ true,  true  ] ],
      [  1.10, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ false, true  ] ],
      [  1.30, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ false, true  ] ],
      [  1.50, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ false, true  ] ],
      [  1.70, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ false, true  ] ],
      [  1.90, [ [  2.0, 0 ], [  -2.0, 1 ] ], [ false, true  ] ],
      [  2.20, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  2.40, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  2.60, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  2.80, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  3.20, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  3.40, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  3.60, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  3.80, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ true,  true  ] ],
      [  4.20, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ false, true  ] ],
      [  4.40, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ false, true  ] ],
      [  4.60, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ false, true  ] ],
      [  4.80, [ [  5.0, 0 ], [  -5.0, 1 ] ], [ false, true  ] ],
      [  6.00, [ [ 20.0, 0 ], [ -20.0, 1 ] ], [ true,  true  ] ],
      [  7.00, [ [ 10.0, 0 ], [ -10.0, 1 ] ], [ true,  true  ] ],
      [  8.00, [ [ 20.0, 0 ], [ -20.0, 1 ] ], [ true,  true  ] ],
      [  9.00, [ [ 10.0, 0 ], [ -10.0, 1 ] ], [ true,  true  ] ],
      [ 12.00, [ [ 20.0, 0 ], [ -20.0, 1 ] ], [ true,  true  ] ],
      [ 14.00, [ [ 20.0, 0 ], [ -20.0, 1 ] ], [ true,  true  ] ],
      [ 16.00, [ [ 20.0, 0 ], [ -20.0, 1 ] ], [ true,  true  ] ],
      [ 18.00, [ [ 20.0, 0 ], [ -20.0, 1 ] ], [ true,  true  ] ],
      [ 30.00, [ [ 50.0, 0 ], [ -50.0, 1 ] ], [ true,  true  ] ],
      [ 40.00, [ [ 50.0, 0 ], [ -50.0, 1 ] ], [ true,  true  ] ],
    ];
  }

  public static reactanceMajor(): SmithArcDef[] {
    return [
      [   0.05, [ [  0.2, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.05, [ [  0.2, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.10, [ [  2.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.10, [ [  2.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.15, [ [  0.2, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.15, [ [  0.2, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.20, [ [  5.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.20, [ [  5.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.30, [ [  2.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.30, [ [  2.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.40, [ [  5.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.40, [ [  5.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.50, [ [  2.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.50, [ [  2.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.60, [ [  5.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.60, [ [  5.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.70, [ [  2.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.70, [ [  2.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.80, [ [  5.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.80, [ [  5.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.90, [ [  2.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.90, [ [  2.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   1.00, [ [ 10.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -1.00, [ [ 10.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   1.20, [ [  5.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -1.20, [ [  5.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   1.40, [ [  5.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -1.40, [ [  5.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   1.60, [ [  5.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -1.60, [ [  5.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   1.80, [ [  5.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -1.80, [ [  5.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   2.00, [ [ 20.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -2.00, [ [ 20.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   3.00, [ [ 10.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -3.00, [ [ 10.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   4.00, [ [ 20.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -4.00, [ [ 20.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   5.00, [ [ 10.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -5.00, [ [ 10.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [  10.00, [ [ 20.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [ -10.00, [ [ 20.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [  20.00, [ [ 50.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [ -20.00, [ [ 50.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [  50.00, [ [  0.0, 0 ], [  0.0, 1 ] ], [ false, false ] ],
      [ -50.00, [ [  0.0, 1 ], [  0.0, 0 ] ], [ false,  true ] ],
    ];
  }

  public static reactanceMinor(): SmithArcDef[] {
    return [
      [   0.01, [ [  0.2, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.01, [ [  0.2, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.02, [ [  0.5, 1 ], [  0.2, 1 ] ], [ false, false ] ],
      [  -0.02, [ [  0.5, 0 ], [  0.2, 0 ] ], [ false,  true ] ],
      [   0.02, [ [  0.2, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.02, [ [  0.2, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.03, [ [  0.2, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.03, [ [  0.2, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.04, [ [  0.5, 1 ], [  0.2, 1 ] ], [ false, false ] ],
      [  -0.04, [ [  0.5, 0 ], [  0.2, 0 ] ], [ false,  true ] ],
      [   0.04, [ [  0.2, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.04, [ [  0.2, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.06, [ [  0.5, 1 ], [  0.2, 1 ] ], [ false, false ] ],
      [  -0.06, [ [  0.5, 0 ], [  0.2, 0 ] ], [ false,  true ] ],
      [   0.06, [ [  0.2, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.06, [ [  0.2, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.07, [ [  0.2, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.07, [ [  0.2, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.08, [ [  0.5, 1 ], [  0.2, 1 ] ], [ false, false ] ],
      [  -0.08, [ [  0.5, 0 ], [  0.2, 0 ] ], [ false,  true ] ],
      [   0.08, [ [  0.2, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.08, [ [  0.2, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.09, [ [  0.2, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.09, [ [  0.2, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.11, [ [  0.2, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.11, [ [  0.2, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.12, [ [  0.5, 1 ], [  0.2, 1 ] ], [ false, false ] ],
      [  -0.12, [ [  0.5, 0 ], [  0.2, 0 ] ], [ false,  true ] ],
      [   0.12, [ [  0.2, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.12, [ [  0.2, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.13, [ [  0.2, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.13, [ [  0.2, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.14, [ [  0.5, 1 ], [  0.2, 1 ] ], [ false, false ] ],
      [  -0.14, [ [  0.5, 0 ], [  0.2, 0 ] ], [ false,  true ] ],
      [   0.14, [ [  0.2, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.14, [ [  0.2, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.16, [ [  0.5, 1 ], [  0.2, 1 ] ], [ false, false ] ],
      [  -0.16, [ [  0.5, 0 ], [  0.2, 0 ] ], [ false,  true ] ],
      [   0.16, [ [  0.2, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.16, [ [  0.2, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.17, [ [  0.2, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.17, [ [  0.2, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.18, [ [  0.5, 1 ], [  0.2, 1 ] ], [ false, false ] ],
      [  -0.18, [ [  0.5, 0 ], [  0.2, 0 ] ], [ false,  true ] ],
      [   0.18, [ [  0.2, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.18, [ [  0.2, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.19, [ [  0.2, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.19, [ [  0.2, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.22, [ [  0.5, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.22, [ [  0.5, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.24, [ [  0.5, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.24, [ [  0.5, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.26, [ [  0.5, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.26, [ [  0.5, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.28, [ [  0.5, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.28, [ [  0.5, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.32, [ [  0.5, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.32, [ [  0.5, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.34, [ [  0.5, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.34, [ [  0.5, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.36, [ [  0.5, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.36, [ [  0.5, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.38, [ [  0.5, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.38, [ [  0.5, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.42, [ [  0.5, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.42, [ [  0.5, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.44, [ [  0.5, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.44, [ [  0.5, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.46, [ [  0.5, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.46, [ [  0.5, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.48, [ [  0.5, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.48, [ [  0.5, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.05, [ [  1.0, 1 ], [  0.5, 1 ] ], [ false, false ] ],
      [  -0.05, [ [  1.0, 0 ], [  0.5, 0 ] ], [ false,  true ] ],
      [   0.15, [ [  1.0, 1 ], [  0.5, 1 ] ], [ false, false ] ],
      [  -0.15, [ [  1.0, 0 ], [  0.5, 0 ] ], [ false,  true ] ],
      [   0.25, [ [  1.0, 1 ], [  0.5, 1 ] ], [ false, false ] ],
      [  -0.25, [ [  1.0, 0 ], [  0.5, 0 ] ], [ false,  true ] ],
      [   0.35, [ [  1.0, 1 ], [  0.5, 1 ] ], [ false, false ] ],
      [  -0.35, [ [  1.0, 0 ], [  0.5, 0 ] ], [ false,  true ] ],
      [   0.45, [ [  1.0, 1 ], [  0.5, 1 ] ], [ false, false ] ],
      [  -0.45, [ [  1.0, 0 ], [  0.5, 0 ] ], [ false,  true ] ],
      [   0.55, [ [  1.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.55, [ [  1.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.65, [ [  1.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.65, [ [  1.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.75, [ [  1.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.75, [ [  1.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.85, [ [  1.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.85, [ [  1.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   0.95, [ [  1.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -0.95, [ [  1.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   1.10, [ [  2.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -1.10, [ [  2.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   1.30, [ [  2.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -1.30, [ [  2.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   1.50, [ [  2.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -1.50, [ [  2.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   1.70, [ [  2.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -1.70, [ [  2.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   1.90, [ [  2.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -1.90, [ [  2.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   2.20, [ [  5.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -2.20, [ [  5.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   2.40, [ [  5.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -2.40, [ [  5.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   2.60, [ [  5.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -2.60, [ [  5.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   2.80, [ [  5.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -2.80, [ [  5.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   3.20, [ [  5.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -3.20, [ [  5.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   3.40, [ [  5.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -3.40, [ [  5.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   3.60, [ [  5.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -3.60, [ [  5.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   3.80, [ [  5.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -3.80, [ [  5.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   4.20, [ [  5.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -4.20, [ [  5.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   4.40, [ [  5.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -4.40, [ [  5.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   4.60, [ [  5.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -4.60, [ [  5.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   4.80, [ [  5.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -4.80, [ [  5.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   6.00, [ [ 20.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -6.00, [ [ 20.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   7.00, [ [ 10.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -7.00, [ [ 10.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   8.00, [ [ 20.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -8.00, [ [ 20.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [   9.00, [ [ 10.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [  -9.00, [ [ 10.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [  12.00, [ [ 50.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [ -12.00, [ [ 50.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [  14.00, [ [ 20.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [ -14.00, [ [ 20.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [  16.00, [ [ 20.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [ -16.00, [ [ 20.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [  18.00, [ [ 20.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [ -18.00, [ [ 20.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [  30.00, [ [ 50.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [ -30.00, [ [ 50.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
      [  40.00, [ [ 50.0, 1 ], [  0.0, 1 ] ], [ false, false ] ],
      [ -40.00, [ [ 50.0, 0 ], [  0.0, 0 ] ], [ false,  true ] ],
    ];
  }
}
