import { select, format } from 'd3';
import type { Complex } from '../math/Complex.js';
import { SmithGroup } from '../svg/SmithGroup.js';
import { PeripheralScaleDefinitions } from './PeripheralScaleDefinitions.js';

let nextScaleId = 0;
const chartRadius = 250;
const groupWidth = 40;

/** Peripheral rulers in the chart's 500-unit coordinate system. */
export class SmithPeripheralScales extends SmithGroup {
  private captionsVisible = true;
  private tickLabelsVisible = true;

  private static point(radius: number, degrees: number): [number, number] {
    const angle = (degrees * Math.PI) / 180;
    return [250 + radius * Math.cos(angle), 250 - radius * Math.sin(angle)];
  }

  private static rulerRadius(index: number): number {
    return chartRadius + groupWidth / 2 + Math.floor(index / 2) * groupWidth;
  }

  public readonly labels = new SmithGroup()
    .attr('data-label-layer', 'peripheral-scales')
    .attr('pointer-events', 'none');
  private readonly scales = PeripheralScaleDefinitions.create();
  private readonly axes = this.Element.attr('data-layer', 'peripheral-scales')
    .attr('pointer-events', 'none')
    .selectAll<SVGGElement, (typeof this.scales)[number]>('g')
    .data(this.scales)
    .join('g')
    .attr('data-scale', (scale) => scale.id)
    .attr('role', 'img')
    .attr('aria-label', (scale) => scale.title);

  public constructor() {
    super();
    const labelAxes = this.labels.Element.selectAll<SVGGElement, (typeof this.scales)[number]>('g')
      .data(this.scales)
      .join('g')
      .attr('data-label-scale', (scale) => scale.id)
      .nodes();
    // Two paired rulers: transmission/reflection phase, then electrical length
    // toward load/generator. Strong boundaries enclose each pair.
    this.Element.selectAll('circle.peripheral-boundary')
      .data([chartRadius, chartRadius + groupWidth, chartRadius + 2 * groupWidth])
      .join('circle')
      .attr('class', 'peripheral-boundary')
      .attr('cx', 250)
      .attr('cy', 250)
      .attr('r', (radius) => radius)
      .attr('fill', 'none')
      .attr('stroke', 'var(--smithkit-scales-boundaryColor)')
      .attr('stroke-width', 1.1)
      .attr('vector-effect', 'non-scaling-stroke');
    this.axes.each(function (scale, index) {
      const labelAxis = select(labelAxes[index]);
      const axis = select(this);
      const radius = SmithPeripheralScales.rulerRadius(index);
      const side = index % 2 === 0 ? -1 : 1;
      const captionAngle = scale.unit === 'λ' ? 180 : 0;
      axis.append('title').text(scale.title);
      if (index % 2 === 0) {
        axis
          .append('circle')
          .attr('class', 'peripheral-ruler')
          .attr('cx', 250)
          .attr('cy', 250)
          .attr('r', radius)
          .attr('fill', 'none')
          .attr('stroke', 'var(--smithkit-scales-stroke)')
          .attr('stroke-width', 0.6)
          .attr('vector-effect', 'non-scaling-stroke');
      }
      for (const value of scale.ticks) {
        const angle = scale.angle(value);
        const [x1, y1] = SmithPeripheralScales.point(radius, angle);
        const major = scale.major(value);
        const [x2, y2] = SmithPeripheralScales.point(radius + side * (major ? 4 : 2), angle);
        axis
          .append('line')
          .attr('x1', x1)
          .attr('y1', y1)
          .attr('x2', x2)
          .attr('y2', y2)
          .attr('stroke', 'var(--smithkit-scales-stroke)')
          .attr('stroke-width', major ? 0.8 : 0.5)
          .attr('vector-effect', 'non-scaling-stroke');
        const captionDistance = Math.abs(((angle - captionAngle + 540) % 360) - 180);
        if (major) {
          const [x, y] = SmithPeripheralScales.point(radius + side * 11, angle);
          const rotation = angle >= 0 ? 90 - angle : -90 - angle;
          labelAxis
            .append('text')
            .attr('class', 'peripheral-tick-label')
            .classed('peripheral-caption-sector', captionDistance <= 25)
            .attr('x', x)
            .attr('y', y)
            .attr('transform', `rotate(${rotation},${x},${y})`)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('font-family', 'var(--smithkit-fontFamily)')
            .attr('font-size', 'var(--smithkit-scales-peripheralFontSize)')
            .attr('fill', 'var(--smithkit-scales-textColor)')
            .text(scale.unit === 'λ' ? value.toFixed(2) : String(value));
        }
      }
      // Reserve a label sector for the curved caption without masking the ruler or its ticks.
      const captionRadius = radius + (side < 0 ? -15 : 5);
      const start = SmithPeripheralScales.point(captionRadius, captionAngle + 45);
      const end = SmithPeripheralScales.point(captionRadius, captionAngle - 45);
      const pathId = `smithkit-peripheral-caption-${nextScaleId++}`;
      axis
        .append('defs')
        .append('path')
        .attr('id', pathId)
        .attr('d', `M${start} A${captionRadius},${captionRadius} 0 0 1 ${end}`);
      const caption =
        scale.unit === 'λ'
          ? scale.id === 'wavelengths-generator'
            ? 'WAVELENGTHS TOWARD GENERATOR →'
            : '← WAVELENGTHS TOWARD LOAD'
          : scale.title.toUpperCase();
      labelAxis
        .append('text')
        .attr('class', 'peripheral-caption')
        .attr('text-anchor', 'middle')
        .attr('font-family', 'var(--smithkit-fontFamily)')
        .attr('font-size', 'var(--smithkit-scales-peripheralFontSize)')
        .attr('font-weight', 500)
        .attr('letter-spacing', 0.3)
        .attr('fill', 'var(--smithkit-scales-textColor)')
        .append('textPath')
        .attr('href', `#${pathId}`)
        .attr('startOffset', '50%')
        .text(caption);
      axis
        .append('circle')
        .attr('class', 'peripheral-indicator')
        .attr('r', 3)
        .attr('visibility', 'hidden')
        .attr('fill', 'var(--smithkit-scales-indicatorColor)')
        .attr('stroke', 'var(--smithkit-scales-indicatorOutline)')
        .attr('stroke-width', 1);
    });
    this.updateLabelVisibility();
  }

  public setCaptionsVisible(visible: boolean): void {
    this.captionsVisible = visible;
    this.updateLabelVisibility();
  }

  public setTickLabelsVisible(visible: boolean): void {
    this.tickLabelsVisible = visible;
    this.updateLabelVisibility();
  }

  private updateLabelVisibility(): void {
    this.labels.Element.selectAll('.peripheral-caption').attr(
      'display',
      this.captionsVisible ? null : 'none',
    );
    this.labels.Element.selectAll('.peripheral-tick-label').attr(
      'display',
      this.tickLabelsVisible ? null : 'none',
    );
    // Fill the reserved caption sectors with numeric labels when captions are hidden.
    this.labels.Element.selectAll('.peripheral-caption-sector').attr(
      'display',
      this.tickLabelsVisible && !this.captionsVisible ? null : 'none',
    );
  }

  public override show(): SmithGroup {
    this.labels.show();
    return super.show();
  }

  public override hide(): SmithGroup {
    this.labels.hide();
    return super.hide();
  }

  /** Connect to the same cursor or marker data as the independent parameter scales. */
  public update(gamma: Complex | null): void {
    const valid = gamma !== null && Number.isFinite(gamma.abs()) && gamma.abs() <= 1;
    this.axes.each(function (scale, index) {
      const value = valid ? scale.read(gamma!) : null;
      const axis = select(this);
      const label =
        value === null ? scale.title : `${scale.title}: ${format('.4~g')(value)} ${scale.unit}`;
      axis.attr('aria-label', label).select('title').text(label);
      const dot = axis.select('.peripheral-indicator');
      if (value === null) {
        dot.attr('visibility', 'hidden').attr('data-value', null);
        return;
      }
      const [x, y] = SmithPeripheralScales.point(
        SmithPeripheralScales.rulerRadius(index),
        scale.angle(value),
      );
      dot.attr('cx', x).attr('cy', y).attr('data-value', value).attr('visibility', null);
    });
  }
}
