import { select, format } from 'd3';
import type { Complex } from '../complex/Complex.js';
import { radialScales } from './radialScales.js';

/** Independent parameter scales. Connect update() to a chart's cursor events. */
export class SmithScales {
  private readonly scales = radialScales();
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
    .attr('viewBox', '0 0 320 72')
    .attr('role', 'img')
    .attr('aria-label', (scale) => scale.title)
    .attr('data-scale', (scale) => scale.id)
    .style('display', 'block')
    .style('width', '100%')
    .style('height', 'auto');

  public constructor() {
    this.axes
      .append('text')
      .attr('x', this.start)
      .attr('y', 16)
      .attr('font-family', 'system-ui, sans-serif')
      .attr('font-size', 12)
      .attr('fill', '#334155')
      .text((scale) => scale.title);
    this.axes
      .append('text')
      .attr('class', 'scale-value')
      .attr('x', this.start)
      .attr('y', 30)
      .attr('font-family', 'system-ui, sans-serif')
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('fill', '#b42318')
      .text('—');
    this.axes
      .append('line')
      .attr('class', 'scale-axis')
      .attr('x1', this.start)
      .attr('x2', this.start + this.length)
      .attr('y1', 44)
      .attr('y2', 44)
      .attr('stroke', '#64748b')
      .attr('stroke-width', 1);
    const start = this.start;
    const length = this.length;
    this.axes.each(function (scale) {
      const ticks = select(this)
        .selectAll('g')
        .data(scale.values)
        .join('g')
        .attr('transform', (value) => `translate(${start + length * scale.position(value)},44)`);
      ticks.append('line').attr('y2', 5).attr('stroke', '#64748b').attr('stroke-width', 1);
      ticks
        .append('text')
        .attr('y', 20)
        .attr('font-size', 10)
        .attr('font-family', 'system-ui, sans-serif')
        .attr('fill', '#334155')
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
      .attr('cy', 44)
      .attr('r', 4)
      .attr('fill', '#dc2626')
      .attr('stroke', 'white')
      .attr('stroke-width', 1);
    this.axes.append('title').text((scale) => scale.title);
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
      this.axes.attr('aria-label', (scale) => scale.title);
      this.axes.select('title').text((scale) => scale.title);
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
      const label = `${scale.title}: ${readout}`;
      axis.select('.scale-value').text(readout);
      axis.attr('aria-label', label).select('title').text(label);
      axis
        .select('circle')
        .attr('cx', start + position * length)
        .attr('data-position', position)
        .attr('visibility', null);
    });
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
