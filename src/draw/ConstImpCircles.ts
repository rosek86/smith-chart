
import { SmithGroup } from './SmithGroup';
import { SmithArcsDefs, SmithArcDef, SmithArcEntry } from '../SmithArcsDefs';
import { SmithShape } from './SmithShape';
import { SmithArc } from './SmithArc';
import { SmithLine } from './SmithLine';
import { SmithText } from './SmithText';
import { SmithConstantCircle } from '../SmithConstantCircle';
import { Circle } from './Circle';
import { Point } from './Point';

interface ConstImpDrawOptions {
  stroke: string;
  minorWidth: string;
  majorWidth: string;
  textColor: string;
  textFontFamily: string;
  textFontSize: string;
}

export class ConstImpCircles {
  private calcs: SmithConstantCircle = new SmithConstantCircle();

  private opts: ConstImpDrawOptions;

  private container: SmithGroup;
  private r: { major: SmithGroup; minor: SmithGroup; };
  private x: { major: SmithGroup; minor: SmithGroup; };
  private texts: SmithGroup;

  public constructor(showMinor: boolean = true) {
    this.container = new SmithGroup().attr('fill', 'none');
    this.r = {
      major: this.drawResistanceMajor(),
      minor: this.drawResistanceMinor(),
    };
    this.x = {
      major: this.drawReactanceMajor(),
      minor: this.drawReactanceMinor(),
    };
    this.texts = this.drawImpedanceTexts();

    this.opts = this.defaultDrawingOptions();
    this.setDrawOptions(this.opts);

    this.build();

    if (showMinor === false) {
      this.r.minor.hide();
      this.x.minor.hide();
    }
  }

  private defaultDrawingOptions(): ConstImpDrawOptions {
    return {
      stroke: 'black', majorWidth: '0.001', minorWidth: '0.0003',
      textColor: 'black', textFontFamily: 'Verdana', textFontSize: '0.03'
    };
  }

  private build(): SmithGroup {
    return this.container
      .append(this.r.minor)
      .append(this.r.major)
      .append(this.x.minor)
      .append(this.x.major)
      .append(this.texts)
      .hide();
  }

  public draw(): SmithGroup {
    return this.container;
  }

  public setDrawOptions(opts: ConstImpDrawOptions): void {
    this.opts = opts;
    this.container.Stroke = opts.stroke;
    this.r.major.StrokeWidth = opts.majorWidth;
    this.r.minor.StrokeWidth = opts.minorWidth;
    this.x.major.StrokeWidth = opts.majorWidth;
    this.x.minor.StrokeWidth = opts.minorWidth;
    this.texts
      .attr('fill',        opts.textColor)
      .attr('font-family', opts.textFontFamily)
      .attr('font-size',   opts.textFontSize);
  }

  public set Stroke(stroke: string) {
    this.opts.stroke = stroke;
    this.container.Stroke = stroke;
  }

  public get Stroke(): string {
    return this.opts.stroke;
  }

  public set MajorWidth(width: string) {
    this.opts.majorWidth = width;
    this.r.major.StrokeWidth = width;
    this.x.major.StrokeWidth = width;
  }

  public get MajorWidth(): string {
    return this.opts.majorWidth;
  }

  public set MinorWidth(width: string) {
    this.opts.minorWidth = width;
    this.r.minor.StrokeWidth = width;
    this.x.minor.StrokeWidth = width;
  }

  public get MinorWidth(): string {
    return this.opts.minorWidth;
  }

  public set TextColor(color: string) {
    this.opts.textColor = color;
    this.texts.Fill = color;
  }

  public get TextColor(): string {
    return this.opts.textColor;
  }

  public set TextFontFamily(family: string) {
    this.opts.textFontFamily = family;
    this.texts.attr('font-family', family);
  }

  public get TextFontFamily(): string {
    return this.opts.textFontFamily;
  }

  public set TextFontSize(size: string) {
    this.opts.textFontSize = size;
    this.texts.attr('font-size', size);
  }

  public get TextFontSize(): string {
    return this.opts.textFontSize;
  }

  private drawResistanceMajor(): SmithGroup {
    const g = new SmithGroup();
    SmithArcsDefs.resistanceMajor().forEach((def) => g.append(this.resistanceArc(def)));
    g.append(new SmithLine([ -1, 0 ], [ 1, 0 ]));
    return g;
  }

  private drawResistanceMinor(): SmithGroup {
    const g = new SmithGroup();
    SmithArcsDefs.resistanceMinor().forEach((def) => g.append(this.resistanceArc(def)));
    return g;
  }

  private drawReactanceMajor(): SmithGroup {
    const g = new SmithGroup();
    SmithArcsDefs.reactanceMajor().forEach((def) => g.append(this.reactanceArc(def)));
    return g;
  }

  private drawReactanceMinor(): SmithGroup {
    const g = new SmithGroup();
    SmithArcsDefs.reactanceMinor().forEach((def) => g.append(this.reactanceArc(def)));
    return g;
  }

  private resistanceArc(def: SmithArcDef): SmithShape {
    const cc = def[SmithArcEntry.clipCircles];
    const c  = this.calcs.resistanceCircle(def[SmithArcEntry.circle]);
    if (cc === undefined) {
      const arcOpts = def[SmithArcEntry.arcOptions];
      return new SmithArc([1, 0], [1 - c.r * 2, 0], c.r, arcOpts[0], arcOpts[1]);
    }
    const i1 = this.calcs.circleCircleIntersection(c, this.calcs.reactanceCircle(cc[0][0]));
    const i2 = this.calcs.circleCircleIntersection(c, this.calcs.reactanceCircle(cc[1][0]));
    return this.drawArc(def, c, i1, i2);
  }

  private reactanceArc(def: SmithArcDef): SmithShape {
    const cc = def[SmithArcEntry.clipCircles];
    if (cc === undefined) {
      throw new Error('Invalid arc definition.');
    }

    const c  = this.calcs.reactanceCircle(def[SmithArcEntry.circle]);
    const i1 = this.calcs.circleCircleIntersection(c, this.calcs.resistanceCircle(cc[0][0]));
    const i2 = this.calcs.circleCircleIntersection(c, this.calcs.resistanceCircle(cc[1][0]));
    return this.drawArc(def, c, i1, i2);
  }

  private drawArc(def: SmithArcDef, c: Circle, i1: Point[], i2: Point[]): SmithArc {
    const cc = def[SmithArcEntry.clipCircles];
    const arcOpts = def[SmithArcEntry.arcOptions];
    if (cc === undefined) {
      throw new Error('Invalid arc definition.');
    }
    if (arcOpts === undefined) {
      throw new Error('Invalid arc options.');
    }

    const p1 = i1[cc[0][1]];
    const p2 = i2[cc[1][1]];
    return new SmithArc(p1, p2, c.r, arcOpts[0], arcOpts[1]);
  }

  private drawImpedanceTexts(): SmithGroup {
    const group = new SmithGroup()
      .attr('stroke',      'none')
      .attr('text-anchor', 'start');

    for (const e of SmithArcsDefs.textsTicks()) {
      const p = this.calcs.impedanceToReflectionCoefficient([ e[0], 0 ]);
      if (p === undefined) {
        throw new Error('Invalid text tick coordinates');
      }
      const dx = e[2].dx === undefined ? '0.001' : e[2].dx;
      const dy = e[2].dy === undefined ? '0.004' : e[2].dy;
      group.append(new SmithText(p, e[0].toFixed(e[1]), { rotate: 90, dx, dy }));
    }
    return group;
  }

  public visibility(visible: boolean): ConstImpCircles {
    if (visible) {
      this.container.show();
    } else {
      this.container.hide();
    }
    return this;
  }

  public displayMinor(display: boolean): ConstImpCircles {
    if (display) {
      this.r.minor.show();
      this.x.minor.show();
    } else {
      this.r.minor.hide();
      this.x.minor.hide();
    }
    return this;
  }

  public show(): ConstImpCircles {
    this.container.show();
    return this;
  }

  public showMinor(): ConstImpCircles {
    this.r.minor.show();
    this.x.minor.show();
    return this;
  }

  public hide(): ConstImpCircles {
    this.container.hide();
    return this;
  }

  public hideMinor(): ConstImpCircles {
    this.r.minor.hide();
    this.x.minor.hide();
    return this;
  }
}
