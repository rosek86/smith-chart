import { ConstCircles } from './ConstCircles.js';
import { SmithGroup } from './SmithGroup.js';
import { SmithText } from './SmithText.js';
import type { SmithScaler } from './SmithScaler.js';
import type { SmithTicksData, SmithTicksShapes } from '../grid/types.js';
import { gridGeometry, gridLabel, type GridKind } from '../grid/geometry.js';
import { resistanceLabels, reactanceLabels } from '../grid/labels.js';

export interface GridLayerParams {
  scaler: SmithScaler;
  showMinor: boolean;
  data: SmithTicksData;
}

/** SVG adapter shared by the four constant impedance/admittance layers. */
export class SmithGridLayer extends ConstCircles {
  protected major: SmithGroup;
  protected minor: SmithGroup;
  protected texts: SmithGroup;

  public constructor(
    params: GridLayerParams,
    private kind: GridKind,
  ) {
    super(params.scaler);
    const real = kind === 'resistance' || kind === 'conductance';
    const definitions = params.data[real ? 'resistance' : 'reactance'];
    this.major = this.drawGrid(definitions.major, this.opts.majorWidth);
    this.minor = this.drawGrid(definitions.minor, this.opts.minorWidth);
    this.texts = new SmithGroup()
      .attr('stroke', 'none')
      .attr('font-size', '7')
      .attr('font-family', 'Verdana');
    for (const tick of real ? resistanceLabels() : reactanceLabels()) {
      const label = gridLabel(kind, tick.definition);
      this.texts.append(
        new SmithText(this.scaler.point(label.point), label.text, {
          rotate: label.rotate,
          dx: this.scaler.r(label.dx).toString(),
          dy: this.scaler.r(label.dy).toString(),
          textAnchor: label.textAnchor,
          dominantBaseline: label.dominantBaseline,
        }),
      );
    }
    this.build();
    if (!params.showMinor) {
      this.minor.hide();
    }
  }

  private drawGrid(definitions: SmithTicksShapes, width: string): SmithGroup {
    const geometry = gridGeometry(this.kind, definitions);
    const group = new SmithGroup();
    this.drawShapes(group.Element, this.opts.stroke, width, {
      lines: geometry.lines.map((line) => this.scaler.line(line)),
      circles: geometry.circles.map((circle) => this.scaler.circle(circle)),
      arcs: geometry.arcs.map((arc) => this.scaleArc(this.scaler, arc)),
    });
    return group;
  }
}
