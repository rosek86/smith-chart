import { SmithGridLayer, type GridLayerParams } from './SmithGridLayer.js';

export class ConstConductance extends SmithGridLayer {
  public constructor(params: GridLayerParams) {
    super(params, 'conductance');
  }
}
