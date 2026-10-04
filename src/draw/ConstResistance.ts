import { SmithGridLayer, type GridLayerParams } from './SmithGridLayer.js';

export class ConstResistance extends SmithGridLayer {
  public constructor(params: GridLayerParams) {
    super(params, 'resistance');
  }
}
