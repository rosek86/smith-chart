import type { SmithAppearance } from './appearance/types.js';
import type { CircleStyle, GridDetail, GridStyle } from './layers.js';

/** Settings for an individual impedance/admittance grid layer. */
export interface GridLayerOptions {
  visible?: boolean;
  detail?: GridDetail;
  labelsVisible?: boolean;
  style?: Partial<GridStyle>;
}

/** Shared settings for all four grids, followed by per-layer overrides. */
export interface GridOptions {
  /** Default: standard. */
  detail?: GridDetail;
  /** Default: true. */
  labelsVisible?: boolean;
  style?: Partial<GridStyle>;
  layers?: {
    resistance?: GridLayerOptions;
    reactance?: GridLayerOptions;
    conductance?: GridLayerOptions;
    susceptance?: GridLayerOptions;
  };
}

export interface CircleLayerOptions {
  /** Default: false. */
  visible?: boolean;
  style?: Partial<CircleStyle>;
  /** Replace the default values. Empty hides all circles; duplicate values are ignored. */
  values?: readonly number[];
}

export interface CircleOptions {
  q?: CircleLayerOptions;
  vswr?: CircleLayerOptions;
}

export interface InteractionOptions {
  /** Enable wheel/pan/pinch gestures. Default: false. */
  zoom?: boolean;
  /** Enable cursor overlay and pointer readings. Default: false. */
  cursor?: boolean;
}

export interface PeripheralScalesOptions {
  /** Show the peripheral rulers as one group. Default: false. */
  visible?: boolean;
  /** Show curved axis captions. Default: true. */
  captionsVisible?: boolean;
  /** Show numeric tick labels. Default: true. */
  tickLabelsVisible?: boolean;
}

export interface SmithOptions {
  /** Positive real reference impedance in ohms. Default: 50. */
  referenceImpedanceOhms?: number;
  /** Default: the light preset. Use overrides for fonts, colors, and marker/cursor styling. */
  appearance?: SmithAppearance;
  interaction?: InteractionOptions;
  grid?: GridOptions;
  circles?: CircleOptions;
  peripheralScales?: PeripheralScalesOptions;
}
