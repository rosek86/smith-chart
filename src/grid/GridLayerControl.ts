import type { ConstCircles } from './ConstCircles.js';
import type { GridLayer, GridStyle } from '../layers.js';
import { LayerControl } from './LayerControl.js';

/** Exposes grid controls without exposing the SVG renderer. */
export class GridLayerControl extends LayerControl implements GridLayer {
  public constructor(
    private readonly layer: ConstCircles,
    assertAlive: () => void,
    private readonly changed: () => void,
  ) {
    super(assertAlive);
  }

  public setVisible(visible: boolean): void {
    this.assertAlive();
    this.layer.visibility(visible);
    this.changed();
  }

  public setMinorVisible(visible: boolean): void {
    this.assertAlive();
    this.layer.displayMinor(visible);
  }

  public setStyle(style: Partial<GridStyle>): void {
    this.assertAlive();
    this.validateLengths(style, ['majorWidth', 'minorWidth', 'textFontSize']);
    const properties = {
      stroke: 'Stroke',
      majorWidth: 'MajorWidth',
      minorWidth: 'MinorWidth',
      textColor: 'TextColor',
      textFontFamily: 'TextFontFamily',
      textFontSize: 'TextFontSize',
    } as const;
    for (const key of Object.keys(properties) as (keyof GridStyle)[]) {
      const value = style[key];
      if (value !== undefined) {
        this.layer[properties[key]] = String(value);
      }
    }
    this.changed();
  }
}
