import { SmithGridLayer, type GridLayerParams } from './SmithGridLayer.js';

export class ConstSusceptance extends SmithGridLayer {
  public constructor(params: GridLayerParams) {
    super(params, 'susceptance');
  }
}
