import { SvgTheme } from '../appearance/SvgTheme.js';
import type { SmithTheme } from '../appearance/types.js';
import * as d3 from 'd3';
import { ZoomTransform } from 'd3';

import { Point } from '../math/geometry.js';

import { MouseGesture } from '../interaction/MouseGesture.js';
import { SmithSvg } from '../svg/SmithSvg.js';
import { LabelLayout } from '../svg/LabelLayout.js';
import { SvgExporter } from '../svg/SvgExporter.js';
import { SmithGroup } from '../svg/SmithGroup.js';
import { SmithCircle } from '../svg/SmithCircle.js';

import { SmithData } from '../traces/SmithData.js';
import type { SmithMarker } from '../traces/SmithMarker.js';
import { SmithCursor } from '../interaction/SmithCursor.js';

import { ConstResistance } from '../grid/ConstResistance.js';
import { ConstReactance } from '../grid/ConstReactance.js';
import { ConstConductance } from '../grid/ConstConductance.js';
import { ConstSusceptance } from '../grid/ConstSusceptance.js';
import { ConstQCircles } from '../grid/ConstQCircles.js';
import { ConstSwrCircles } from '../grid/ConstSwrCircles.js';

import { SmithDrawOptions } from '../svg/SmithDrawOptions.js';
import { SmithScaler } from '../svg/SmithScaler.js';

import { TraceSamples } from '../samples.js';
import { SmithConstantCircle } from '../rf/SmithConstantCircle.js';
import { GridDefinitions } from '../grid/GridDefinitions.js';

import { Complex } from '../math/Complex.js';
import { SmithPeripheralScales } from '../scales/SmithPeripheralScales.js';
import { GridLayerControl } from '../grid/GridLayerControl.js';
import { CircleLayerControl } from '../grid/CircleLayerControl.js';
import type { ChartLayers, PeripheralScales } from '../layers.js';
import type { TraceStyle } from '../measurements.js';

interface Scalers {
  default: SmithScaler;
  impedance: SmithScaler;
  admittance: SmithScaler;
}

/** Internal SVG backend. Owns chart elements, view transforms, and SVG gestures. */
export class SvgChartRenderer {
  private calcs: SmithConstantCircle = new SmithConstantCircle();
  private scalers: Scalers;

  private readonly defaultTransform = d3.zoomIdentity.translate(62.5, 62.5).scale(0.75);
  private transform = d3.zoomIdentity;
  private zoomEnabled = false;
  private cursorEnabled = false;
  private applyingView = false;
  private zoomBehavior = d3.zoom<SVGElement, unknown>();

  private svg: SmithSvg;
  private resizeObserver: ResizeObserver;
  private readonly labelLayout: LabelLayout;
  private container: SmithGroup;
  private dataContainer: SmithGroup;
  private markerContainer: SmithGroup;

  private reactanceAxis: SmithCircle;

  private constResistance: ConstResistance;
  private constReactance: ConstReactance;
  private constConductance: ConstConductance;
  private constSusceptance: ConstSusceptance;
  private constSwrCircles: ConstSwrCircles;
  private constQCircles: ConstQCircles;

  private cursor: SmithCursor;
  private peripheralScaleRenderer = new SmithPeripheralScales();
  private readonly traces = new Set<SmithData>();
  private destroyed = false;
  private mouseGesture = new MouseGesture();
  private markerDragging = false;
  private cursorBeforeMarkerDrag: string | null = null;

  public readonly layers: ChartLayers;
  public readonly peripheralScales: PeripheralScales;

  public constructor(private onCursorChange: ((position: Complex | undefined) => void) | null) {
    const viewBoxSize = 500;
    const gridData = GridDefinitions.create();
    this.scalers = this.createScalers(viewBoxSize);

    this.svg = new SmithSvg(viewBoxSize);
    this.container = new SmithGroup();

    this.constResistance = new ConstResistance({
      data: gridData,
      scaler: this.scalers.default,
      detail: 'standard',
    });
    this.constResistance.show();

    this.constReactance = new ConstReactance({
      data: gridData,
      scaler: this.scalers.default,
      detail: 'standard',
    });
    this.constReactance.show();

    this.constConductance = new ConstConductance({
      data: gridData,
      scaler: this.scalers.default,
      detail: 'standard',
    });
    this.constConductance.hide();

    this.constSusceptance = new ConstSusceptance({
      data: gridData,
      scaler: this.scalers.default,
      detail: 'standard',
    });
    this.constSusceptance.hide();

    this.constQCircles = new ConstQCircles(this.scalers.default);
    this.constQCircles.hide();

    this.constSwrCircles = new ConstSwrCircles(this.scalers.default);
    this.constSwrCircles.hide();

    this.cursor = this.initCursor();
    const cursorContainer = this.cursorContainer();

    this.reactanceAxis = this.drawReactanceAxis({
      stroke: 'var(--smithkit-boundary-stroke)',
      strokeWidth: 'var(--smithkit-boundary-width)',
      fill: 'none',
    });

    this.dataContainer = new SmithGroup().attr('data-layer', 'samples');
    this.markerContainer = new SmithGroup().attr('data-layer', 'markers');

    // build chart
    this.svg.append(this.container);
    this.container.append(this.constConductance.draw().attr('data-layer', 'conductance'));
    this.container.append(this.constSusceptance.draw().attr('data-layer', 'susceptance'));
    this.container.append(this.constResistance.draw().attr('data-layer', 'resistance'));
    this.container.append(this.constReactance.draw().attr('data-layer', 'reactance'));
    this.container.append(this.constQCircles.draw());
    this.container.append(this.constSwrCircles.draw());
    this.container.append(this.peripheralScaleRenderer);
    this.container.append(this.cursor.Group);
    this.container.append(this.reactanceAxis);
    this.container.append(cursorContainer);
    this.container.append(this.dataContainer);
    const labels = new SmithGroup().attr('data-layer', 'labels').attr('pointer-events', 'none');
    for (const [name, layer] of [
      ['conductance', this.constConductance],
      ['susceptance', this.constSusceptance],
      ['resistance', this.constResistance],
      ['reactance', this.constReactance],
    ] as const) {
      labels.append(layer.labels.attr('data-label-layer', name));
    }
    labels.append(this.peripheralScaleRenderer.labels);
    this.container.append(labels);
    this.container.append(this.markerContainer);
    this.labelLayout = new LabelLayout(
      this.svg.Node as SVGSVGElement,
      labels.Node as SVGGElement,
      this.defaultTransform,
    );

    const assertAlive = () => this.assertAlive();
    this.layers = {
      resistance: new GridLayerControl(this.constResistance, assertAlive, () =>
        this.labelLayout.update(true),
      ),
      reactance: new GridLayerControl(this.constReactance, assertAlive, () =>
        this.labelLayout.update(true),
      ),
      conductance: new GridLayerControl(this.constConductance, assertAlive, () =>
        this.labelLayout.update(true),
      ),
      susceptance: new GridLayerControl(this.constSusceptance, assertAlive, () =>
        this.labelLayout.update(true),
      ),
      q: new CircleLayerControl(this.constQCircles, 0, assertAlive),
      vswr: new CircleLayerControl(this.constSwrCircles, 1, assertAlive),
    };
    this.peripheralScales = {
      setVisible: (visible) => {
        assertAlive();
        if (visible) {
          this.peripheralScaleRenderer.show();
        } else {
          this.peripheralScaleRenderer.hide();
        }
        this.labelLayout.update(true);
      },
      update: (gamma) => {
        assertAlive();
        this.peripheralScaleRenderer.update(gamma);
      },
    };
    this.peripheralScaleRenderer.hide();
    this.initializeZoom();
    this.resizeObserver = new ResizeObserver(() => this.updateViewportScale());
    this.resizeObserver.observe(this.svg.Node!);
  }

  public setTheme(theme: SmithTheme): void {
    this.assertAlive();
    SvgTheme.apply(this.svg.Node!, theme);
    this.labelLayout.update(true);
  }

  public draw(target: string | HTMLElement): void {
    this.assertAlive();
    const host = typeof target === 'string' ? document.querySelector(target) : target;
    if (!host) {
      throw new Error('Chart container was not found.');
    }
    host.appendChild(this.svg.Node!);
    this.updateViewportScale();
  }

  /** Export the current mounted view as standalone SVG with its configured background. */
  public toSvg(): string {
    this.assertAlive();
    return SvgExporter.chart(this.svg.Node!);
  }

  /** Remove this chart and release its event handlers. Safe to call more than once. */
  public destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.resizeObserver.disconnect();
    this.traces.forEach((trace) => trace.destroy());
    this.traces.clear();
    this.destroyed = true;
    this.cursor.setMoveHandler(null);
    this.onCursorChange = null;
    this.mouseGesture.destroy();
    this.zoomBehavior.on('start', null).on('zoom', null);
    this.svg.Element.interrupt().on('.zoom', null);
    this.svg.Element.selectAll('*').interrupt().on('.smithkit', null).on('.drag', null);
    this.svg.Element.remove();
  }

  private updateViewportScale(): void {
    if (this.destroyed) {
      return;
    }
    const matrix = (this.svg.Node as SVGSVGElement).getScreenCTM();
    if (matrix) {
      const scale = Math.hypot(matrix.a, matrix.b);
      this.traces.forEach((trace) => trace.setViewportScale(scale));
    }
    this.labelLayout.update();
  }

  private assertAlive(): void {
    if (this.destroyed) {
      throw new Error('This Smith chart has been destroyed. Create a new instance.');
    }
  }

  private createScalers(size: number): Scalers {
    const impedance = new SmithScaler(
      d3.scaleLinear().domain([-1, 1]).range([0, size]),
      d3.scaleLinear().domain([1, -1]).range([0, size]),
      d3
        .scaleLinear()
        .domain([0, 1])
        .range([0, size / 2]),
    );
    const admittance = new SmithScaler(
      d3.scaleLinear().domain([1, -1]).range([0, size]),
      d3.scaleLinear().domain([-1, 1]).range([0, size]),
      d3
        .scaleLinear()
        .domain([0, 1])
        .range([0, size / 2]),
    );
    return { default: impedance, impedance, admittance };
  }

  private cursorMove(p: Point): void {
    if (!this.cursorEnabled || this.markerDragging) {
      return;
    }
    this.cursor.Position = Complex.from(this.scalers.default.pointInvert(p));
  }

  public setMarkerDragging(dragging: boolean): void {
    this.markerDragging = dragging;
    if (dragging) {
      this.cursorBeforeMarkerDrag = this.svg.Node!.style.getPropertyValue('cursor') || null;
      this.svg.Element.style('cursor', 'grabbing').style('--smithkit-marker-cursor', 'grabbing');
      this.hideCursor();
    } else {
      this.svg.Element.style('cursor', () => this.cursorBeforeMarkerDrag).style(
        '--smithkit-marker-cursor',
        null,
      );
      this.cursorBeforeMarkerDrag = null;
    }
  }

  public hideCursor(): void {
    this.cursor.hide();
    if (this.cursorEnabled) {
      this.onCursorChange?.(undefined);
    }
  }

  /** Disable tracking and cancel queued readings; enabling waits for the next pointer move. */
  public setCursorEnabled(enabled: boolean): void {
    this.assertAlive();
    if (typeof enabled !== 'boolean') {
      throw new TypeError('Cursor enabled must be a boolean.');
    }
    if (this.cursorEnabled === enabled) {
      return;
    }
    this.cursorEnabled = enabled;
    if (!enabled) {
      this.cursor.hide();
      this.onCursorChange?.(undefined);
    }
  }

  private initCursor(): SmithCursor {
    const cursor = new SmithCursor(this.scalers.default);
    cursor.Group.attr('class', 'smith-cursor');
    cursor.setMoveHandler(() => {
      this.onCursorChange?.(this.cursor.Position);
    });
    return cursor;
  }

  public get cursorPosition(): Complex {
    return this.cursor.Position;
  }

  private initializeZoom(): void {
    const zoom = this.zoomBehavior
      .scaleExtent([0.6, 1000])
      .filter(
        (event: MouseEvent | WheelEvent) =>
          this.zoomEnabled &&
          !this.markerDragging &&
          (!event.ctrlKey || event.type === 'wheel') &&
          !event.button,
      )
      .on('start', (event: d3.D3ZoomEvent<SVGElement, unknown>) => {
        if (event.sourceEvent) {
          this.mouseGesture.capture(event.sourceEvent, 'zoom');
        }
      })
      .on('zoom', (event: d3.D3ZoomEvent<SVGElement, unknown>) => {
        if ((!this.zoomEnabled || this.markerDragging) && !this.applyingView) {
          // An already active mouse/touch gesture still needs its normal end event.
          // Restore D3's view through its public API while that gesture finishes.
          this.applyView(this.transform);
          return;
        }
        this.onZoom(event.transform);
      });

    this.svg.Element.call(zoom);
    this.resetView();
  }

  /** Enable or disable wheel, double-click, and mouse/touch zoom/pan. Keeps the current view. */
  public setZoomEnabled(enabled: boolean): void {
    this.assertAlive();
    if (typeof enabled !== 'boolean') {
      throw new TypeError('Zoom enabled must be a boolean.');
    }
    if (this.zoomEnabled === enabled) {
      return;
    }
    this.zoomEnabled = enabled;
    if (!enabled) {
      this.svg.Element.interrupt();
    }
  }

  private applyView(transform: ZoomTransform): void {
    this.applyingView = true;
    try {
      this.svg.Element.call(this.zoomBehavior.transform, transform);
    } finally {
      this.applyingView = false;
    }
  }

  public resetView(): void {
    this.assertAlive();
    const transform = this.defaultTransform;
    this.applyView(transform);
  }

  private onZoom(transform: ZoomTransform): void {
    if (this.destroyed) {
      return;
    }
    this.transform = transform;
    this.container.Element.attr('transform', transform.toString());
    this.traces.forEach((d) => d.zoom(transform));
  }

  private cursorContainer(): SmithCircle {
    const shape = this.drawReactanceAxis({ fill: 'transparent', stroke: 'none' });

    shape.Element.style('pointer-events', 'all')
      .on('pointermove.smithkit', (event: PointerEvent) => {
        this.cursorMove(d3.pointer(event));
      })
      .on('pointerleave.smithkit', () => {
        this.hideCursor();
      });

    return shape;
  }

  private drawReactanceAxis(opts: SmithDrawOptions): SmithCircle {
    const c = this.calcs.resistanceCircle(0);
    c.p[0] = this.scalers.default.x(c.p[0]);
    c.p[1] = this.scalers.default.y(c.p[1]);
    c.r = this.scalers.default.r(c.r);
    return new SmithCircle(c, opts);
  }

  /** Construct trace rendering without exposing chart containers or scalers to Smith. */
  public createTrace(
    values: TraceSamples,
    color: string,
    style: Partial<TraceStyle>,
    onMarkerDrag: (marker: SmithMarker, dragging: boolean) => void,
  ): SmithData {
    this.assertAlive();
    const trace = new SmithData(
      values,
      color,
      this.transform,
      this.dataContainer,
      this.scalers.default,
      onMarkerDrag,
      this.markerContainer,
      style,
    );
    this.traces.add(trace);
    this.updateViewportScale();
    return trace;
  }

  public removeTrace(trace: SmithData): void {
    // Release gestures while Smith can still resolve the marker's public snapshot.
    trace.destroy();
    this.traces.delete(trace);
  }
}
