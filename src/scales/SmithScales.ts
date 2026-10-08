import { ImageExporter } from '../svg/ImageExporter.js';
import type { ImageExportOptions } from '../svg/export.js';
import { Theme } from '../appearance/Theme.js';
import { SvgTheme } from '../appearance/SvgTheme.js';
import type { SmithAppearance } from '../appearance/types.js';
import { select, format } from 'd3';
import type { Complex } from '../math/Complex.js';
import { RadialScaleDefinitions } from './RadialScaleDefinitions.js';
import { SvgExporter } from '../svg/SvgExporter.js';

/** Independent parameter scales. Connect update() to a chart's cursor events. */
export class SmithScales {
  private readonly scales = RadialScaleDefinitions.create();
  private readonly container = select(document.createElement('div'))
    .attr('class', 'radial-scales')
    .style('display', 'grid')
    .style('grid-template-columns', 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))')
    .style('gap', '8px 20px');
  private destroyed = false;
  private readonly start = 8;
  private readonly length = 304;
  private readonly axes = this.container
    .selectAll<SVGSVGElement, (typeof this.scales)[number]>('svg')
    .data(this.scales)
    .join('svg')
    .attr('xmlns', 'http://www.w3.org/2000/svg')
    .attr('viewBox', '0 0 320 60')
    .attr('role', 'img')
    .attr('aria-label', (scale) => scale.title)
    .attr('data-scale', (scale) => scale.id)
    .style('display', 'block')
    .style('width', '100%')
    .style('height', 'auto');

  public constructor(appearance: SmithAppearance = {}) {
    this.setAppearance(appearance);
    const labels = this.axes.append('g').attr('data-role', 'labels').attr('pointer-events', 'none');
    labels
      .append('text')
      .attr('x', this.start)
      .attr('y', 12)
      .attr('font-family', 'var(--smithkit-fontFamily)')
      .attr('font-size', 'var(--smithkit-scales-titleFontSize)')
      .attr('fill', 'var(--smithkit-scales-textColor)')
      .text((scale) => scale.title);
    labels
      .append('text')
      .attr('class', 'scale-value')
      .attr('x', this.start)
      .attr('y', 25)
      .attr('font-family', 'var(--smithkit-fontFamily)')
      .attr('font-size', 'var(--smithkit-scales-valueFontSize)')
      .attr('font-weight', 600)
      .attr('fill', 'var(--smithkit-scales-valueColor)')
      .text('—');
    this.axes
      .append('line')
      .attr('class', 'scale-axis')
      .attr('x1', this.start)
      .attr('x2', this.start + this.length)
      .attr('y1', 36)
      .attr('y2', 36)
      .attr('stroke', 'var(--smithkit-scales-stroke)')
      .attr('stroke-width', 1);
    const start = this.start;
    const length = this.length;
    this.axes.each(function (scale) {
      const ticks = select(this)
        .selectAll('g.scale-tick')
        .data(scale.values)
        .join('g')
        .attr('class', 'scale-tick')
        .attr('transform', (value) => `translate(${start + length * scale.position(value)},36)`);
      ticks
        .append('line')
        .attr('y2', 5)
        .attr('stroke', 'var(--smithkit-scales-stroke)')
        .attr('stroke-width', 1);
      select(this)
        .select('[data-role=labels]')
        .selectAll('g')
        .data(scale.values)
        .join('g')
        .attr('transform', (value) => `translate(${start + length * scale.position(value)},36)`)
        .append('text')
        .attr('y', 17)
        .attr('font-size', 'var(--smithkit-scales-fontSize)')
        .attr('font-family', 'var(--smithkit-fontFamily)')
        .attr('fill', 'var(--smithkit-scales-textColor)')
        .attr('text-anchor', (_, i) =>
          i === 0 ? 'start' : i === scale.values.length - 1 ? 'end' : 'middle',
        )
        .text((value) => (value === Infinity ? '∞' : String(value)));
    });
    this.axes
      .append('circle')
      .attr('class', 'scale-indicator')
      .attr('visibility', 'hidden')
      .attr('cx', this.start)
      .attr('cy', 36)
      .attr('r', 4)
      .attr('fill', 'var(--smithkit-scales-indicatorColor)')
      .attr('stroke', 'var(--smithkit-scales-indicatorOutline)')
      .attr('stroke-width', 1);
    labels.raise();
    this.axes.append('title').text((scale) => scale.description ?? scale.title);
  }

  /** Replace the preset and overrides without changing readings or layout. */
  public setAppearance(appearance: SmithAppearance): void {
    this.assertAlive();
    SvgTheme.apply(this.container.node()!, Theme.resolve(appearance));
  }

  public draw(target: string | HTMLElement): void {
    this.assertAlive();
    const host = typeof target === 'string' ? document.querySelector(target) : target;
    if (!host) {
      throw new Error('Scale container was not found.');
    }
    host.appendChild(this.container.node()!);
  }

  /** Show a passive-load reflection coefficient, or hide indicators with null. */
  public update(gamma: Complex | null): void {
    this.assertAlive();
    const magnitude = gamma === null ? NaN : Math.hypot(gamma.re, gamma.im);
    if (!gamma || !Number.isFinite(magnitude) || magnitude > 1) {
      this.axes.select('circle').attr('visibility', 'hidden').attr('data-position', null);
      this.axes.select('.scale-value').text('—');
      this.axes.attr('aria-label', (scale) => `${scale.title}. ${scale.description ?? ''}`.trim());
      this.axes.select('title').text((scale) => scale.description ?? scale.title);
      return;
    }
    const start = this.start;
    const length = this.length;
    this.axes.each(function (scale) {
      const value = scale.read(gamma);
      const position = Math.max(0, Math.min(1, scale.position(value)));
      const axis = select(this);
      const number = value === Infinity ? '∞' : format('.4~g')(value);
      const suffix = scale.unit === 'dB' ? ' dB' : scale.id === 'vswr' ? ' : 1' : '';
      const readout = number + suffix;
      const label = `${scale.title}: ${readout}${scale.description ? `. ${scale.description}` : ''}`;
      axis.select('.scale-value').text(readout);
      axis.attr('aria-label', label).select('title').text(label);
      axis
        .select('circle')
        .attr('cx', start + position * length)
        .attr('data-position', position)
        .attr('visibility', null);
    });
  }

  /** Export all mounted scales in their current layout as a standalone SVG. */
  public toSvg(options?: ImageExportOptions): string {
    this.assertAlive();
    const source = SvgExporter.scales(this.container.node()!, this.axes.nodes());
    return options === undefined ? source : ImageExporter.svg([source], options);
  }

  /** Export all mounted scales and current readings as a PNG image. */
  public async toPng(options: ImageExportOptions = {}): Promise<Blob> {
    return ImageExporter.png([this.toSvg()], options);
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.container.remove();
  }

  private assertAlive(): void {
    if (this.destroyed) {
      throw new Error('These Smith scales have been destroyed. Create a new instance.');
    }
  }
}
