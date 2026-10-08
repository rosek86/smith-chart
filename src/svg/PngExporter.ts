import type { PngExportOptions } from './png.js';

interface Legend {
  entries: { name: string; color: string }[];
  textColor: string;
  fontFamily: string;
}

/** Rasterize standalone SVG snapshots without changing live chart nodes. */
export class PngExporter {
  private constructor() {}

  public static async create(
    sources: string[],
    options: PngExportOptions,
    legend?: Legend,
  ): Promise<Blob> {
    const { width: requestedWidth, height: requestedHeight, background } = options;
    for (const value of [requestedWidth, requestedHeight]) {
      if (value !== undefined && (!Number.isInteger(value) || value < 1 || value > 8192)) {
        throw new RangeError('PNG dimensions must be integers from 1 to 8192 pixels.');
      }
    }
    if (
      background !== undefined &&
      (!CSS.supports('color', background) ||
        /\b(var|currentcolor|inherit|initial|unset|revert|light-dark)\b/i.test(background))
    ) {
      throw new RangeError('PNG background must be a concrete CSS color or transparent.');
    }
    const snapshots = sources.map((source) => {
      const svg = new DOMParser().parseFromString(source, 'image/svg+xml').documentElement;
      if (background !== undefined) {
        svg.querySelectorAll('[data-export-background]').forEach((node) => node.remove());
      }
      return {
        svg,
        width: Number(svg.getAttribute('width')),
        height: Number(svg.getAttribute('height')),
      };
    });
    const gap = snapshots.length > 1 ? 24 : 0;
    const contentWidth =
      snapshots.reduce((sum, source) => sum + source.width, 0) + gap * (snapshots.length - 1);
    const contentHeight = Math.max(...snapshots.map((source) => source.height));
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('PNG export requires a Canvas 2D context.');
    }
    await document.fonts.ready;
    context.font = `14px ${legend?.fontFamily ?? 'sans-serif'}`;
    const rows = (legend?.entries ?? []).flatMap((entry) => {
      const lines = PngExporter.wrap(entry.name, Math.max(1, contentWidth - 64), context);
      return lines.map((text, index) => ({ text, color: entry.color, swatch: index === 0 }));
    });
    const legendHeight = rows.length ? 32 + rows.length * 22 : 0;
    const naturalHeight = contentHeight + legendHeight;
    const width =
      requestedWidth ??
      Math.max(
        1,
        Math.round(
          requestedHeight === undefined
            ? contentWidth
            : (requestedHeight * contentWidth) / naturalHeight,
        ),
      );
    const height =
      requestedHeight ?? Math.max(1, Math.round((width * naturalHeight) / contentWidth));
    if (width > 8192 || height > 8192 || width * height > 16_777_216) {
      throw new RangeError('PNG output must not exceed 8192 pixels per side or 16 megapixels.');
    }
    canvas.width = width;
    canvas.height = height;
    // Explicit backgrounds replace component backgrounds; omission preserves them.
    if (background !== undefined) {
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);
    }
    const scale = Math.min(width / contentWidth, height / naturalHeight);
    context.translate((width - contentWidth * scale) / 2, (height - naturalHeight * scale) / 2);
    context.scale(scale, scale);
    let x = 0;
    for (const source of snapshots) {
      const url = URL.createObjectURL(
        new Blob([new XMLSerializer().serializeToString(source.svg)], {
          type: 'image/svg+xml;charset=utf-8',
        }),
      );
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        context.drawImage(image, x, 0, source.width, source.height);
      } finally {
        URL.revokeObjectURL(url);
      }
      x += source.width + gap;
    }
    if (legend && rows.length) {
      // Use the chart's own background for the footer unless explicitly overridden.
      const chartBackground = snapshots[0].svg
        .querySelector('[data-export-background]')
        ?.getAttribute('fill');
      if (background === undefined && chartBackground) {
        context.fillStyle = chartBackground;
        context.fillRect(0, contentHeight, contentWidth, legendHeight);
      }
      context.font = `14px ${legend.fontFamily}`;
      context.textBaseline = 'middle';
      for (const [index, row] of rows.entries()) {
        const y = contentHeight + 24 + index * 22;
        if (row.swatch) {
          context.strokeStyle = row.color;
          context.lineWidth = 3;
          context.beginPath();
          context.moveTo(16, y);
          context.lineTo(40, y);
          context.stroke();
        }
        context.fillStyle = legend.textColor;
        context.fillText(row.text, 48, y);
      }
    }
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('The browser could not encode the PNG image.'));
        }
      }, 'image/png');
    });
  }

  private static wrap(text: string, width: number, context: CanvasRenderingContext2D): string[] {
    const lines: string[] = [];
    let line = '';
    for (const character of text) {
      if (character === '\n' || (line && context.measureText(line + character).width > width)) {
        lines.push(line);
        line = '';
      }
      if (character !== '\n') {
        line += character;
      }
    }
    lines.push(line);
    return lines;
  }
}
