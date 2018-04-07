
import { SmithGroup } from './SmithGroup';
import { SmithArcsDefs, SmithArcDef, SmithArcEntry } from '../SmithArcsDefs';
import { SmithShape } from './SmithShape';
import { SmithCircle } from './SmithCircle';
import { SmithArc } from './SmithArc';
import { SmithLine } from './SmithLine';
import { SmithText } from './SmithText';
import { SmithConstantCircle } from '../SmithConstantCircle';
import { Circle } from './Circle';
import { Point } from './Point';
import { SmithDrawOptions } from './SmithDrawOptions';
import * as d3 from 'd3';

interface ConstAdmDrawOptions {
  stroke: string;
  minorWidth: string;
  majorWidth: string;
  textColor: string;
  textFontFamily: string;
  textFontSize: string;
}

export class ConstAdmCircles {
  private calcs: SmithConstantCircle = new SmithConstantCircle();

  private opts: ConstAdmDrawOptions;

  private container: SmithGroup;
  private g: { major: SmithGroup; minor: SmithGroup; };
  private b: { major: SmithGroup; minor: SmithGroup; };
  private texts: SmithGroup;

  public constructor(showMinor: boolean = true) {
    this.container = new SmithGroup().attr('fill', 'none');
    this.g = {
      major: this.drawConductanceMajor(),
      minor: this.drawConductanceMinor(),
    };
    this.b = {
      major: this.drawSusceptanceMajor(),
      minor: this.drawSusceptanceMinor(),
    };
    this.texts = this.drawAdmittanceTexts();

    this.opts = this.defaultDrawingOptions();
    this.setDrawOptions(this.opts);

    this.build();

    if (showMinor === false) {
      this.g.minor.hide();
      this.b.minor.hide();
    }
  }

  private defaultDrawingOptions(): ConstAdmDrawOptions {
    return {
      stroke: 'black', majorWidth: '0.001', minorWidth: '0.0003',
      textColor: 'black', textFontFamily: 'Verdana', textFontSize: '0.03'
    };
  }

  private build(): SmithGroup {
    return this.container
      .append(this.g.minor)
      .append(this.g.major)
      .append(this.b.minor)
      .append(this.b.major)
      .append(this.texts)
      .hide();
  }

  public draw(): SmithGroup {
    return this.container;
  }

  public setDrawOptions(opts: ConstAdmDrawOptions): void {
    this.opts = opts;
    this.container.Stroke = opts.stroke;
    this.g.major.StrokeWidth = opts.majorWidth;
    this.g.minor.StrokeWidth = opts.minorWidth;
    this.b.major.StrokeWidth = opts.majorWidth;
    this.b.minor.StrokeWidth = opts.minorWidth;
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
    this.g.major.StrokeWidth = width;
    this.b.major.StrokeWidth = width;
  }

  public get MajorWidth(): string {
    return this.opts.majorWidth;
  }

  public set MinorWidth(width: string) {
    this.opts.minorWidth = width;
    this.g.minor.StrokeWidth = width;
    this.b.minor.StrokeWidth = width;
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

  private drawConductanceMajor(): SmithGroup {
    const g = new SmithGroup();
    SmithArcsDefs.resistanceMajor().forEach((def) => g.append(this.conductanceArc(def)));
    g.append(new SmithLine([ -1, 0 ], [ 1, 0 ]));
    return g;
  }

  private drawConductanceMinor(): SmithGroup {
    const g = new SmithGroup();
    SmithArcsDefs.resistanceMinor().forEach((def) => g.append(this.conductanceArc(def)));
    return g;
  }

  private drawSusceptanceMajor(): SmithGroup {
    const g = new SmithGroup();
    SmithArcsDefs.reactanceMajor().forEach((def) => g.append(this.susceptanceArc(def)));
    return g;
  }

  private drawSusceptanceMinor(): SmithGroup {
    const g = new SmithGroup();
    SmithArcsDefs.reactanceMinor().forEach((def) => g.append(this.susceptanceArc(def)));
    return g;
  }

  private conductanceArc(def: SmithArcDef): SmithShape {
    const cc = def[SmithArcEntry.clipCircles];
    const c  = this.calcs.conductanceCircle(def[SmithArcEntry.circle]);
    if (cc === undefined) {
      const arcOpts = def[SmithArcEntry.arcOptions];
      return new SmithArc([-1, 0], [-1+c.r*2, 0], c.r, arcOpts[0], arcOpts[1]);
    }
    const i1 = this.calcs.circleCircleIntersection(c, this.calcs.susceptanceCircle(cc[0][0]));
    const i2 = this.calcs.circleCircleIntersection(c, this.calcs.susceptanceCircle(cc[1][0]));
    return this.drawArc(def, c, i1, i2);
  }

  private susceptanceArc(def: SmithArcDef): SmithShape {
    const cc = def[SmithArcEntry.clipCircles]!;
    const c  = this.calcs.susceptanceCircle(def[SmithArcEntry.circle]);
    const i1 = this.calcs.circleCircleIntersection(c, this.calcs.conductanceCircle(cc[0][0]));
    const i2 = this.calcs.circleCircleIntersection(c, this.calcs.conductanceCircle(cc[1][0]));
    return this.drawArc(def, c, i1, i2);
  }

  private drawArc(def: SmithArcDef, c: Circle, i1: Point[], i2: Point[]): SmithArc {
    const cc = def[SmithArcEntry.clipCircles]!;
    const arcOpts = def[SmithArcEntry.arcOptions]!;
    const p1 = i1[cc[0][1]];
    const p2 = i2[cc[1][1]];
    return new SmithArc(p1, p2, c.r, arcOpts[0], arcOpts[1]);
  }

  private drawAdmittanceTexts(): SmithGroup {
    const group = new SmithGroup()
      .attr('stroke',      'none')
      .attr('text-anchor', 'start');

    SmithArcsDefs.textsTicks().forEach((e) => {
      const p = this.calcs.admittanceToReflectionCoefficient([ e[0], 0 ])!;
      group.append(new SmithText(p, e[0].toFixed(e[1]), { rotate: -90, dy: '0.004', dx: '0.001' }));
    });

    return group;
  }

  public show(): ConstAdmCircles {
    this.container.show();
    return this;
  }

  public showMinor(): ConstAdmCircles {
    this.g.minor.show();
    this.b.minor.show();
    return this;
  }

  public hide(): ConstAdmCircles {
    this.container.hide();
    return this;
  }

  public hideMinor(): ConstAdmCircles {
    this.g.minor.hide();
    this.b.minor.hide();
    return this;
  }
}
