import type { SmithScales } from '../scales/SmithScales.js';

export interface PngExportOptions {
  /** Output pixels. With only one dimension, preserve the complete image's aspect ratio. */
  width?: number;
  /** With both dimensions, center and fit the image without stretching or cropping. */
  height?: number;
  /** A concrete CSS color, or transparent. Omit to preserve configured SVG backgrounds. */
  background?: string;
}

export interface SmithPngExportOptions extends PngExportOptions {
  /** Include a footer with the names and colors of visible traces. Default: false. */
  legend?: boolean;
  /** Include mounted radial scales beside the chart, preserving their current layout/readings. */
  scales?: SmithScales;
}
