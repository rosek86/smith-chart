import { ConstCircles } from './ConstCircles.js';
import { SmithGroup } from '../svg/SmithGroup.js';
import { SmithText } from '../svg/SmithText.js';
import type { SmithScaler } from '../svg/SmithScaler.js';
import type { SmithTicksData, SmithTicksShapes } from './types.js';
import { GridGeometry, type GridKind } from './GridGeometry.js';
import type { GridDetail } from '../layers.js';
import { GridDefinitions } from './GridDefinitions.js';
import { GridLabels } from './GridLabels.js';

export interface GridLayerParams {
  scaler: SmithScaler;
  detail: GridDetail;
  data: SmithTicksData;
}

/** SVG adapter shared by the four constant impedance/admittance layers. */
export class SmithGridLayer extends ConstCircles {
  protected major: SmithGroup;
  protected minor: SmithGroup;
  protected texts: SmithGroup;
  private readonly standardDefinitions: SmithTicksShapes;
  private readonly basicDefinitions: SmithTicksShapes;
  private detail: GridDetail = 'detailed';

  public constructor(
    params: GridLayerParams,
    private kind: GridKind,
  ) {
    super(params.scaler);
    const real = kind === 'resistance' || kind === 'conductance';
    const definitions = params.data[real ? 'resistance' : 'reactance'];
    this.standardDefinitions = definitions.major;
    this.basicDefinitions = GridDefinitions.basic()[real ? 'resistance' : 'reactance'];
    this.major = this.drawGrid(definitions.major, this.opts.majorWidth);
    this.minor = this.drawGrid(definitions.minor, this.opts.minorWidth);
    this.texts = new SmithGroup()
      .attr('stroke', 'none')
      .attr('font-size', this.opts.textFontSize)
      .attr('font-family', this.opts.textFontFamily)
      .attr('fill', this.opts.textColor);
    for (const tick of real ? GridLabels.resistance() : GridLabels.reactance()) {
      const label = GridGeometry.label(kind, tick.definition);
      const text = new SmithText(this.scaler.point(label.point), label.text, {
        rotate: label.rotate,
        dx: this.scaler.r(label.dx).toString(),
        dy: this.scaler.r(label.dy).toString(),
        textAnchor: label.textAnchor,
        dominantBaseline: label.dominantBaseline,
      });
      text.Element.attr(
        'data-label-priority',
        SmithGridLayer.labelPriority(tick.definition.point.r, tick.definition.point.i),
      );
      const { r, i } = tick.definition.point;
      const basic = real
        ? i === 0 && (r === 0 || GridDefinitions.basicValues.includes(r))
        : r === 0 && GridDefinitions.basicValues.includes(Math.abs(i));
      text.Element.attr('data-basic-label', String(basic));
      this.texts.append(text);
    }
    this.build();
    this.setDetail(params.detail);
  }

  public setLabelsVisible(visible: boolean): void {
    // Keep this separate from whole-layer opacity and detail-specific label filtering.
    this.texts.attr('display', visible ? null : 'none');
  }

  public setDetail(detail: GridDetail): void {
    if (detail === this.detail) {
      return;
    }
    if ((detail === 'basic') !== (this.detail === 'basic')) {
      this.major.Element.selectAll('*').remove();
      this.drawGrid(
        detail === 'basic' ? this.basicDefinitions : this.standardDefinitions,
        this.opts.majorWidth,
        this.major,
      );
    }
    if (detail === 'detailed') {
      this.minor.show();
    } else {
      this.minor.hide();
    }
    this.texts.Element.selectAll('[data-basic-label="false"]').attr(
      'display',
      detail === 'basic' ? 'none' : null,
    );
    this.detail = detail;
  }

  private static labelPriority(real: number, imaginary: number): number {
    const value = Math.abs(imaginary === 0 ? real : imaginary);
    const importance =
      value === 0
        ? 300
        : value === 1
          ? 100
          : value === 50
            ? 90
            : [0.5, 2].includes(value)
              ? 80
              : [0.2, 5, 10].includes(value)
                ? 70
                : 40;
    return importance + (imaginary === 0 ? 20 : real === 0 ? 10 : 0);
  }

  private drawGrid(
    definitions: SmithTicksShapes,
    width: string,
    group = new SmithGroup(),
  ): SmithGroup {
    const geometry = GridGeometry.shapes(this.kind, definitions);
    this.drawShapes(group.Element, this.opts.stroke, width, {
      lines: geometry.lines.map((line) => this.scaler.line(line)),
      circles: geometry.circles.map((circle) => this.scaler.circle(circle)),
      arcs: geometry.arcs.map((arc) => this.scaleArc(this.scaler, arc)),
    });
    return group;
  }
}
