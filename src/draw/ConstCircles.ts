import type * as d3 from 'd3';
import { SmithGroup } from './SmithGroup.js';
import { SmithScaler } from './SmithScaler.js';
import { Line } from '../shapes/Line.js';
import { Circle } from '../shapes/Circle.js';
import { Point } from '../shapes/Point.js';
import { SmithConstantCircle } from '../SmithConstantCircle.js';

export interface ArcData {
  p1: Point;
  p2: Point;
  r: number;
  largeArc: string;
  sweep: string;
}

export interface Shapes {
  lines: Line[];
  circles: Circle[];
  arcs: ArcData[];
}

export interface ConstCirclesDrawOptions {
  stroke: string;
  minorWidth: string;
  majorWidth: string;
  textColor: string;
  textFontFamily: string;
  textFontSize: string;
}

export abstract class ConstCircles {
  protected calcs = new SmithConstantCircle();
  protected container: SmithGroup;

  protected opts: ConstCirclesDrawOptions;

  protected abstract major: SmithGroup;
  protected abstract minor: SmithGroup;
  protected abstract texts: SmithGroup;

  constructor(protected scaler: SmithScaler) {
    this.container = new SmithGroup();
    this.opts = this.defaultDrawingOptions();
  }

  public visibility(visible: boolean): void {
    if (visible) {
      this.show();
    } else {
      this.hide();
    }
  }

  public show(): void {
    this.container.show();
    this.texts.show();
  }

  public hide(): void {
    this.container.hide();
    this.texts.hide();
  }

  public displayMinor(display: boolean): void {
    if (display) {
      this.minor.show();
    } else {
      this.minor.hide();
    }
  }

  public showMinor(): void {
    this.minor.show();
  }

  public hideMinor(): void {
    this.minor.hide();
  }

  protected build(): SmithGroup {
    this.texts.hide();
    return this.container.append(this.minor).append(this.major).hide();
  }

  /** Mount labels separately so every grid line is painted before any label. */
  public get labels(): SmithGroup {
    return this.texts;
  }

  public draw(): SmithGroup {
    return this.container;
  }

  public setDrawOptions(opts: ConstCirclesDrawOptions): void {
    this.opts = opts;

    this.Stroke = opts.stroke;
    this.major.StrokeWidth = opts.majorWidth;
    this.minor.StrokeWidth = opts.minorWidth;
    this.texts
      .attr('fill', opts.textColor)
      .attr('font-family', opts.textFontFamily)
      .attr('font-size', opts.textFontSize);
  }

  public set Stroke(stroke: string) {
    this.opts.stroke = stroke;
    this.container.Stroke = stroke;
    this.major.Stroke = stroke;
    this.minor.Stroke = stroke;
  }

  public get Stroke(): string {
    return this.opts.stroke;
  }

  public set MajorWidth(width: string) {
    this.opts.majorWidth = width;
    this.major.StrokeWidth = width;
  }

  public get MajorWidth(): string {
    return this.opts.majorWidth;
  }

  public set MinorWidth(width: string) {
    this.opts.minorWidth = width;
    this.minor.StrokeWidth = width;
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

  protected defaultDrawingOptions(): ConstCirclesDrawOptions {
    return {
      // Keep curved grid strokes visible at normal browser zoom and low pixel density.
      stroke: '#64748b',
      majorWidth: '1',
      minorWidth: '0.6',
      textColor: 'black',
      textFontFamily: 'Verdana',
      textFontSize: '1',
    };
  }

  protected scaleArc(scaler: SmithScaler, d: [Point, Point, number, boolean, boolean]): ArcData {
    const { p1, p2, r } = scaler.arc({ p1: d[0], p2: d[1], r: d[2] });
    const largeArc = d[3] ? '1' : '0';
    const sweep = d[4] ? '0' : '1';
    return { p1, p2, r, largeArc, sweep };
  }

  protected drawShapes(
    g: d3.Selection<SVGElement, unknown, null, undefined>,
    color: string,
    width: string,
    shapes: Shapes,
  ) {
    // Shapes inherit styling so changing a layer updates all of its geometry.
    g.attr('stroke', color).attr('stroke-width', width);

    g.selectAll('line')
      .data(shapes.lines)
      .enter()
      .append('line')
      .attr('x1', (d) => d.p1[0])
      .attr('y1', (d) => d.p1[1])
      .attr('x2', (d) => d.p2[0])
      .attr('y2', (d) => d.p2[1])
      .attr('fill', 'none')
      .attr('vector-effect', 'non-scaling-stroke');

    g.selectAll('circle')
      .data(shapes.circles)
      .enter()
      .append('circle')
      .attr('cx', (d) => d.p[0])
      .attr('cy', (d) => d.p[1])
      .attr('r', (d) => d.r)
      .attr('fill', 'none')
      .attr('vector-effect', 'non-scaling-stroke');

    g.selectAll('path')
      .data(shapes.arcs)
      .enter()
      .append('path')
      .attr('fill', 'none')
      .attr('vector-effect', 'non-scaling-stroke')
      .attr('d', (d) => {
        const { p1, p2, r, largeArc, sweep } = d;
        return `M${p1[0]},${p1[1]} A${r},${r} 0 ${largeArc},${sweep} ${p2[0]},${p2[1]}`;
      });
  }
}
