import { line } from 'd3';
import { SmithGroup } from '../svg/SmithGroup.js';
import { SmithScaler } from '../svg/SmithScaler.js';
import type { TraceStyle } from '../measurements.js';
import type { TraceSamples, TraceSample } from '../samples.js';

export interface TraceTransform {
  x: number;
  y: number;
  k: number;
}

/** Draws a trace; sample validation and marker selection belong to TraceModel. */
export class TraceRenderer {
  private style: TraceStyle;
  private viewportScale = 1;
  private visible = true;
  private group: SmithGroup;

  public constructor(
    private data: TraceSamples,
    private color: string,
    private transform: TraceTransform,
    container: SmithGroup,
    private scaler: SmithScaler,
    style: Partial<TraceStyle> = {},
  ) {
    this.style = {
      mode: style.mode ?? 'points',
      lineWidth: style.lineWidth ?? 2,
      pointRadius: style.pointRadius ?? 2,
    };
    this.group = this.drawTrace(data).attr('pointer-events', 'none');
    container.append(this.group);
  }

  private drawTrace(data: TraceSamples): SmithGroup {
    const group = new SmithGroup({
      stroke: 'none',
      strokeWidth: 'none',
      fill: this.color,
    });
    group.attr('data-role', 'samples');
    group.attr('data-mode', this.style.mode);
    if (this.style.mode !== 'points') {
      const path = line<TraceSample>()
        .x((sample) => this.scaler.x(sample.reflectionCoefficient[0]))
        .y((sample) => this.scaler.y(sample.reflectionCoefficient[1]));
      group.Element.append('path')
        .attr('class', 'trace-line')
        .attr('d', path(data))
        .attr('fill', 'none')
        .attr('stroke', this.color)
        .attr('stroke-width', this.style.lineWidth)
        .attr('vector-effect', 'non-scaling-stroke')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round');
    }
    if (this.style.mode !== 'line') {
      this.renderPoints(group, data);
    }
    return group;
  }

  private renderPoints(group: SmithGroup, data: TraceSamples): void {
    let visible = data;
    if (data.length > 5000) {
      const cells = new Set<string>();
      const cellSize = Math.max(0.5, this.style.pointRadius) / this.viewportScale;
      const extent = this.scaler.x(1);
      const margin = this.style.pointRadius / this.viewportScale;
      visible = data.filter((sample) => {
        const x =
          this.scaler.x(sample.reflectionCoefficient[0]) * this.transform.k + this.transform.x;
        const y =
          this.scaler.y(sample.reflectionCoefficient[1]) * this.transform.k + this.transform.y;
        if (x < -margin || y < -margin || x > extent + margin || y > extent + margin) {
          return false;
        }
        const cell = `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)}`;
        if (cells.has(cell)) {
          return false;
        }
        cells.add(cell);
        return true;
      });
    }
    group.Element.selectAll('circle')
      .data(visible)
      .join('circle')
      .attr('cx', (sample) => this.scaler.x(sample.reflectionCoefficient[0]))
      .attr('cy', (sample) => this.scaler.y(sample.reflectionCoefficient[1]))
      .attr('r', this.style.pointRadius / (this.transform.k * this.viewportScale));
  }

  public setViewportScale(scale: number): void {
    if (scale === this.viewportScale || !Number.isFinite(scale) || scale <= 0) {
      return;
    }
    this.viewportScale = scale;
    this.zoomDataPoints();
  }

  public zoom(transform: TraceTransform): void {
    this.transform = transform;
    this.zoomDataPoints();
  }

  private zoomDataPoints(): void {
    const k = this.transform.k;
    if (this.style.mode === 'line') {
      return;
    }
    if (this.data.length > 5000) {
      this.renderPoints(this.group, this.data);
    } else {
      this.group.Element.selectAll('circle').attr(
        'r',
        this.style.pointRadius / (k * this.viewportScale),
      );
    }
  }

  public setColor(color: string): void {
    this.color = color;
    this.group.attr('fill', color);
    this.group.Element.select('.trace-line').attr('stroke', color);
  }

  public get Style(): TraceStyle {
    return { ...this.style };
  }

  public setStyle(options: Partial<TraceStyle>): void {
    const next = {
      mode: options.mode ?? this.style.mode,
      lineWidth: options.lineWidth ?? this.style.lineWidth,
      pointRadius: options.pointRadius ?? this.style.pointRadius,
    };
    if (
      next.mode === this.style.mode &&
      next.lineWidth === this.style.lineWidth &&
      next.pointRadius === this.style.pointRadius
    ) {
      return;
    }
    const modeChanged = next.mode !== this.style.mode;
    this.style = next;
    if (modeChanged) {
      this.redraw();
    } else {
      this.group.Element.select('.trace-line').attr('stroke-width', next.lineWidth);
      this.zoomDataPoints();
    }
  }

  private redraw(): void {
    const group = this.drawTrace(this.data).attr('pointer-events', 'none');
    // Replace in place to retain trace ordering beneath the separate marker layer.
    this.group.Node!.replaceWith(group.Node!);
    this.group = group;
    this.group.Element.style('display', () => (this.visible ? null : 'none'));
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.group.Element.style('display', () => (visible ? null : 'none'));
  }

  public update(data: TraceSamples): void {
    this.data = data;
    this.redraw();
  }

  public destroy(): void {
    this.data = [];
    this.group.Element.remove();
  }
}
