import * as d3 from 'd3';

import { MouseGesture } from '../interaction/MouseGesture.js';
import { SmithShape } from '../svg/SmithShape.js';
import { Point } from '../math/geometry.js';
import { SmithFormatter } from '../SmithFormatter.js';

export class SmithMarker extends SmithShape {
  private readonly size = 18;
  private mouseGesture = new MouseGesture();
  private activeDrags = new Set<string | number>();
  private destroyed = false;
  private sampleIndex = 0;
  private sampleCount = 1;
  private scale = 1;

  private triangle: d3.Selection<SVGPolygonElement, unknown, null, undefined>;
  private inner: d3.Selection<SVGPolygonElement, unknown, null, undefined>;
  private text: d3.Selection<SVGTextElement, unknown, null, undefined>;
  private hitArea: d3.Selection<SVGCircleElement, unknown, null, undefined>;
  private focusRing: d3.Selection<SVGGElement, unknown, null, undefined>;

  private rc: Point = [0, 0];
  private dragHandler: ((p: Point) => void) | null = null;
  private sampleHandler: ((index: number) => void) | null = null;
  private selectHandler: (() => void) | null = null;

  public constructor(
    marker: number,
    color: string,
    private dragStateHandler: ((dragging: boolean) => void) | null = null,
  ) {
    super(
      d3.select<SVGElement, unknown>(document.createElementNS('http://www.w3.org/2000/svg', 'g')),
    );
    const g = this.Element.attr('tabindex', 0)
      .attr('role', 'slider')
      .attr('aria-orientation', 'horizontal')
      .attr(
        'aria-description',
        'Arrow keys move one sample; Shift+Arrow or Page Up/Down moves ten. Home and End select the first and last sample.',
      )
      .style('outline', 'none')
      .style('touch-action', 'none')
      .style('cursor', 'var(--smithkit-marker-cursor, grab)')
      .on('focus.smithkit', () => {
        this.focusRing.attr('visibility', null);
        if (this.activeDrags.size === 0) {
          this.selectHandler?.();
        }
      })
      .on('blur.smithkit', () => this.focusRing.attr('visibility', 'hidden'))
      .on('keydown.smithkit', (event: KeyboardEvent) => this.keydown(event))
      .on('touchstart.smithkit', (event: TouchEvent) => event.stopPropagation());

    this.hitArea = g
      .append('circle')
      .attr('class', 'marker-hit-area')
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .attr('stroke', 'none')
      .attr('aria-hidden', 'true');
    this.focusRing = g
      .append('g')
      .attr('class', 'marker-focus')
      .attr('visibility', 'hidden')
      .attr('pointer-events', 'none')
      .attr('aria-hidden', 'true');
    for (const [stroke, width] of [
      ['var(--smithkit-marker-focusHaloColor)', 5],
      ['var(--smithkit-marker-focusColor)', 2.5],
    ] as const) {
      this.focusRing
        .append('circle')
        .attr('fill', 'none')
        .attr('stroke', stroke)
        .attr('stroke-width', width)
        .attr('vector-effect', 'non-scaling-stroke');
    }
    this.triangle = g
      .append('polygon')
      .attr('stroke', 'none')
      .attr('fill', 'var(--smithkit-marker-outlineColor)');
    this.inner = g.append('polygon').attr('stroke', 'none').attr('fill', color);
    this.text = g
      .append('text')
      .attr('pointer-events', 'none')
      .attr('aria-hidden', 'true')
      .attr('font-family', 'var(--smithkit-fontFamily)')
      .attr('font-weight', 'normal')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', 'var(--smithkit-marker-textColor)')
      .text(marker.toString());
    this.zoom(1);

    const drag = d3
      .drag<SVGElement, unknown>()
      .container(() => this.Node!.parentNode as SVGGElement)
      .touchable(() => true)
      .filter(
        (event: MouseEvent) =>
          !this.destroyed && !event.ctrlKey && !event.button && this.activeDrags.size === 0,
      )
      .on('start', (event: d3.D3DragEvent<SVGElement, unknown, unknown>) => {
        if (this.destroyed || this.activeDrags.size > 0) {
          return;
        }
        this.mouseGesture.capture(event.sourceEvent, 'drag');
        const wasIdle = this.activeDrags.size === 0;
        this.activeDrags.add(event.identifier);
        this.Node!.focus({ preventScroll: true });
        if (wasIdle) {
          this.dragStateHandler?.(true);
          this.selectHandler?.();
        }
      })
      .on('drag', (event: d3.D3DragEvent<SVGElement, unknown, unknown>) => {
        if (!this.destroyed && this.activeDrags.has(event.identifier)) {
          this.dragHandler?.([event.x, event.y]);
        }
      })
      .on('end', (event: d3.D3DragEvent<SVGElement, unknown, unknown>) => {
        if (this.activeDrags.delete(event.identifier) && this.activeDrags.size === 0) {
          this.dragStateHandler?.(false);
        }
      });
    g.call(drag);
  }

  public focus(): boolean {
    if (this.destroyed || this.Element.style('display') === 'none' || !this.Node!.isConnected) {
      return false;
    }
    this.Node!.focus({ preventScroll: true });
    return this.Node!.ownerDocument.activeElement === this.Node;
  }

  public setReading(name: string, index: number, count: number, frequencyHz: number): void {
    this.sampleIndex = index;
    this.sampleCount = count;
    this.Element.attr('aria-label', name)
      .attr('aria-valuemin', 0)
      .attr('aria-valuemax', count - 1)
      .attr('aria-valuenow', index)
      .attr(
        'aria-valuetext',
        `${SmithFormatter.number(frequencyHz)}Hz, sample ${index + 1} of ${count}`,
      )
      .attr('aria-disabled', count <= 1 ? 'true' : null);
  }

  private keydown(event: KeyboardEvent): void {
    if (
      this.destroyed ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      this.activeDrags.size > 0
    ) {
      return;
    }
    const step = event.shiftKey ? 10 : 1;
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = this.sampleIndex + step;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = this.sampleIndex - step;
        break;
      case 'PageUp':
        next = this.sampleIndex + 10;
        break;
      case 'PageDown':
        next = this.sampleIndex - 10;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = this.sampleCount - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.selectHandler?.();
    next = Math.max(0, Math.min(this.sampleCount - 1, next));
    if (next !== this.sampleIndex) {
      this.sampleHandler?.(next);
    }
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.dragHandler = null;
    this.sampleHandler = null;
    this.selectHandler = null;
    this.cancelDrag();
    this.dragStateHandler = null;
    this.Element.on('.drag', null).on('.smithkit', null).interrupt();
    this.Element.selectAll('*').on('.drag', null).interrupt();
    this.Element.remove();
  }

  public cancelDrag(): void {
    if (this.activeDrags.size > 0) {
      this.activeDrags.clear();
      this.dragStateHandler?.(false);
    }
    this.mouseGesture.destroy();
  }

  public setColor(color: string): void {
    this.inner.attr('fill', color);
  }

  public get Position(): Point {
    return this.rc;
  }

  public move(p: Point): void {
    this.rc = p;
    this.triangle.attr('transform', `translate(${p[0]},${p[1]})`);
    this.inner.attr('transform', `translate(${p[0]},${p[1]})`);
    this.text.attr('x', p[0]).attr('y', p[1]);
    const centerY = p[1] - this.size / this.scale / 2;
    this.hitArea.attr('cx', p[0]).attr('cy', centerY);
    this.focusRing.selectAll('circle').attr('cx', p[0]).attr('cy', centerY);
  }

  public zoom(k: number): void {
    if (!Number.isFinite(k) || k <= 0) {
      return;
    }
    this.scale = k;
    const size = this.size / k;
    const h = size / 12;
    const alpha = Math.atan(1 / 2);
    const beta = Math.PI / 2 - alpha;
    const x = h / Math.sin(alpha);
    const y = h / Math.sin(beta) + h / Math.tan(beta);
    this.triangle.attr('points', `0,0 ${size / 2},${-size} ${-size / 2},${-size}`);
    this.inner.attr('points', `0,${-x} ${size / 2 - y},${-size + h} ${-size / 2 + y},${-size + h}`);
    this.text.attr('font-size', size / 1.8).attr('dy', -size / 1.6);
    this.hitArea.attr('r', 22 / k);
    this.focusRing.selectAll('circle').attr('r', 15 / k);
    this.move(this.rc);
  }

  public show(): void {
    this.Element.attr('opacity', null);
  }

  public hide(): void {
    this.Element.attr('opacity', '0');
  }

  public setDragHandler(handler: (p: Point) => void): void {
    this.dragHandler = handler;
  }
  public setSampleHandler(handler: (index: number) => void): void {
    this.sampleHandler = handler;
  }
  public setSelectHandler(handler: () => void): void {
    this.selectHandler = handler;
  }
}
