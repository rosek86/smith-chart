export type Point = [number, number];

export interface Line {
  p1: Point;
  p2: Point;
}

export interface Circle {
  p: Point;
  r: number;
}

export interface Arc {
  p1: Point;
  p2: Point;
  r: number;
}
