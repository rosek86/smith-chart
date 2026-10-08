import { OptionsValidation } from '../OptionsValidation.js';
import type { SmithGridLayer } from './SmithGridLayer.js';
import type { GridDetail, GridLayer, GridStyle } from '../layers.js';
import { LayerControl } from './LayerControl.js';

/** Exposes grid controls without exposing the SVG renderer. */
export class GridLayerControl extends LayerControl implements GridLayer {
  public constructor(
    private readonly layer: SmithGridLayer,
    assertAlive: () => void,
    private readonly changed: () => void,
  ) {
    super(assertAlive);
  }

  public setVisible(visible: boolean): void {
    this.assertAlive();
    OptionsValidation.boolean(visible, 'Grid visibility');
    this.layer.visibility(visible);
    this.changed();
  }

  public setLabelsVisible(visible: boolean): void {
    this.assertAlive();
    OptionsValidation.boolean(visible, 'Grid visibility');
    this.layer.setLabelsVisible(visible);
    this.changed();
  }

  public setDetail(detail: GridDetail): void {
    this.assertAlive();
    OptionsValidation.detail(detail);
    this.layer.setDetail(detail);
    this.changed();
  }

  public setStyle(style: Partial<GridStyle>): void {
    this.assertAlive();
    OptionsValidation.gridStyle(style);
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
