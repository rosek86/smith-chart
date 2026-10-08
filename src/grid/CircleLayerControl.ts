import { OptionsValidation } from '../OptionsValidation.js';
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
    OptionsValidation.boolean(visible, 'Circle visibility');
    this.layer.visibility(visible);
  }

  public setStyle(style: Partial<CircleStyle>): void {
    this.assertAlive();
    OptionsValidation.circleStyle(style);
    if (style.stroke !== undefined) {
      this.layer.Stroke = style.stroke;
    }
    if (style.strokeWidth !== undefined) {
      this.layer.StrokeWidth = String(style.strokeWidth);
    }
  }

  public setValues(values: readonly number[]): void {
    this.assertAlive();
    OptionsValidation.circleValues(values, this.minimum);
    this.layer.setValues(values);
  }

  public addValue(value: number): void {
    this.assertAlive();
    OptionsValidation.circleValue(value, this.minimum);
    this.layer.append(value);
  }

  public removeValue(value: number): void {
    this.assertAlive();
    OptionsValidation.circleValue(value, this.minimum);
    this.layer.remove(value);
  }
}
