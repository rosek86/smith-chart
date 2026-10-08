import type { Complex } from '../math/Complex.js';
import type { SmithScales } from '../scales/SmithScales.js';

export interface ImageExportOptions {
  /** Output pixels. Default: the snapshot dimensions. With only one dimension, preserve the complete image's aspect ratio. */
  width?: number;
  /** With both dimensions, center and fit the image without stretching or cropping. */
  height?: number;
  /** A concrete CSS color, or transparent. Omit to preserve configured SVG backgrounds. */
  background?: string;
}

export interface ScaleExportReadout {
  /** Use this reading instead of the live cursor/marker state; null exports empty scales. */
  reflectionCoefficient: Complex | null;
  /** Visible description of the reading, such as trace, marker, and frequency. */
  label?: string;
}

export interface ScaleImageExportOptions extends ImageExportOptions {
  readout?: ScaleExportReadout;
}

export interface SmithImageExportOptions extends ImageExportOptions {
  /** Include a footer with the names and colors of visible traces. Default: false. */
  legend?: boolean;
  /** Include mounted radial scales centered below the chart, preserving their current layout/readings. */
  scales?: SmithScales;
  /** Override readings in the included radial scales without changing the live view. */
  scaleReadout?: ScaleExportReadout;
}
