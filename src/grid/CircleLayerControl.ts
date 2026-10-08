import type { ConstQCircles } from './ConstQCircles.js';
import type { ConstSwrCircles } from './ConstSwrCircles.js';
import type { CircleLayer, CircleStyle } from '../layers.js';
import { LayerControl } from './LayerControl.js';

/** Exposes Q/VSWR circle controls without exposing the SVG renderer. */
export class CircleLayerControl extends LayerControl implements CircleLayer {
  public constructor(
    private readonly layer: ConstQCircles | ConstSwrCircles,
    private readonly minimum: number,
    assertAlive: () => void,
  ) {
    super(assertAlive);
  }

  public setVisible(visible: boolean): void {
    this.assertAlive();
    this.layer.visibility(visible);
  }

  public setStyle(style: Partial<CircleStyle>): void {
    this.assertAlive();
    this.validateLengths(style, ['strokeWidth']);
    if (style.stroke !== undefined) {
      this.layer.Stroke = style.stroke;
    }
    if (style.strokeWidth !== undefined) {
      this.layer.StrokeWidth = String(style.strokeWidth);
    }
  }

  public setValues(values: readonly number[]): void {
    this.assertAlive();
    if (!Array.isArray(values)) {
      throw new TypeError('Circle values must be an array.');
    }
    for (const value of values) {
      this.validateValue(value);
    }
    this.layer.setValues(values);
  }

  public addValue(value: number): void {
    this.assertAlive();
    this.validateValue(value);
    this.layer.append(value);
  }

  public removeValue(value: number): void {
    this.assertAlive();
    this.validateValue(value);
    this.layer.remove(value);
  }

  private validateValue(value: number): void {
    if (!Number.isFinite(value) || value < this.minimum || value <= 0) {
      throw new RangeError(`Circle value must be finite, positive, and at least ${this.minimum}.`);
    }
  }
}
