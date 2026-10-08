import type { SmithAppearance } from './appearance/types.js';
import type { CircleStyle, GridDetail, GridStyle } from './layers.js';

/** Shared defaults for all four impedance/admittance grid layers. */
export interface GridOptions {
  detail?: GridDetail;
  labelsVisible?: boolean;
  style?: Partial<GridStyle>;
}

export interface GridLayerOptions extends GridOptions {
  visible?: boolean;
}

export interface CircleLayerOptions {
  visible?: boolean;
  style?: Partial<CircleStyle>;
  /** Replace the default values. Empty hides all circles; duplicate values are ignored. */
  values?: readonly number[];
}

export interface SmithOptions {
  /** Positive real reference impedance in ohms. Default: 50. */
  referenceImpedanceOhms?: number;
  /** Default: the light preset. Use overrides for fonts, colors, and marker/cursor styling. */
  appearance?: SmithAppearance;
  /** Enable wheel/pan/pinch gestures. Default: true. */
  zoomEnabled?: boolean;
  /** Show the peripheral rulers as one group. Default: true. */
  peripheralScalesVisible?: boolean;
  /** Shared settings, applied before individual layer overrides. */
  grid?: GridOptions;
  layers?: {
    resistance?: GridLayerOptions;
    reactance?: GridLayerOptions;
    conductance?: GridLayerOptions;
    susceptance?: GridLayerOptions;
    q?: CircleLayerOptions;
    vswr?: CircleLayerOptions;
  };
}
