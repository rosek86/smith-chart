import { createGridDefinitions } from './grid/definitions.js';
import { resistanceLabels, reactanceLabels } from './grid/labels.js';

// Compatibility facade; definitions and label rules are independent of SVG rendering.
export { SmithArcEntry } from './grid/types.js';
export type { SmithArcDef, SmithTickDef, SmithTicksShapes, SmithTicksData } from './grid/types.js';

export class SmithArcsDefs {
  private constructor() {}
  public static getData = createGridDefinitions;
  public static resistanceLabels = resistanceLabels;
  public static reactanceLabels = reactanceLabels;
}
