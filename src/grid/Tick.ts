export interface TickDef {
  point: {
    r: number;
    i: number;
  };
  transform?: {
    dx?: number;
    dy?: number;
    rotate?: number;
  };
  dp?: number;
  textAnchor?: string;
  dominantBaseline?: string;
}

export interface TickDefRequired {
  point: {
    r: number;
    i: number;
  };
  transform: {
    dx: number;
    dy: number;
    rotate: number;
  };
  dp: number;
  textAnchor: string;
  dominantBaseline: string;
}

export class Tick {
  private def: TickDefRequired;

  constructor(def: TickDef) {
    if (def.transform === undefined) {
      def.transform = {};
    }
    if (def.transform.dx === undefined) {
      def.transform.dx = 0;
    }
    if (def.transform.dy === undefined) {
      def.transform.dy = 0;
    }
    if (def.transform.rotate === undefined) {
      def.transform.rotate = 0;
    }
    if (def.dp === undefined) {
      def.dp = 0;
    }
    if (def.textAnchor === undefined) {
      def.textAnchor = 'start';
    }
    if (def.dominantBaseline === undefined) {
      def.dominantBaseline = 'baseline';
    }

    this.def = {
      point: { r: def.point.r, i: def.point.i },
      transform: {
        dx: def.transform.dx,
        dy: def.transform.dy,
        rotate: def.transform.rotate,
      },
      dp: def.dp,
      textAnchor: def.textAnchor,
      dominantBaseline: def.dominantBaseline,
    };
  }

  get definition(): TickDefRequired {
    return this.def;
  }
}
