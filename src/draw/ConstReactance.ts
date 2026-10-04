import { SmithGridLayer, type GridLayerParams } from './SmithGridLayer.js';

export class ConstReactance extends SmithGridLayer {
  public constructor(params: GridLayerParams) {
    super(params, 'reactance');
  }
}
