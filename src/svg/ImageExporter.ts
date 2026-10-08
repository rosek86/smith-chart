import type { ImageExportOptions } from './export.js';

interface Legend {
  entries: { name: string; color: string }[];
  textColor: string;
  fontFamily: string;
}

/** Compose SVG snapshots and rasterize PNG reports without changing live chart nodes. */
export class ImageExporter {
  private constructor() {}

  private static layout(sources: string[], options: ImageExportOptions, legend?: Legend) {
    const { width: requestedWidth, height: requestedHeight, background } = options;
    for (const value of [requestedWidth, requestedHeight]) {
      if (value !== undefined && (!Number.isInteger(value) || value < 1 || value > 8192)) {
        throw new RangeError('Export dimensions must be integers from 1 to 8192 pixels.');
      }
    }
    if (
      background !== undefined &&
      (!CSS.supports('color', background) ||
        /\b(var|currentcolor|inherit|initial|unset|revert|light-dark)\b/i.test(background))
    ) {
      throw new RangeError('Export background must be a concrete CSS color or transparent.');
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
    const contentWidth = Math.max(...snapshots.map((source) => source.width));
    const contentHeight =
      snapshots.reduce((sum, source) => sum + source.height, 0) + gap * (snapshots.length - 1);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Image export requires a Canvas 2D context.');
    }
    context.font = `14px ${legend?.fontFamily ?? 'sans-serif'}`;
    const rows = (legend?.entries ?? []).flatMap((entry) => {
      const lines = ImageExporter.wrap(entry.name, Math.max(1, contentWidth - 64), context);
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
    if (width > 8192 || height > 8192 || width * height > 33_554_432) {
      throw new RangeError('Image output must not exceed 8192 pixels per side or 32 megapixels.');
    }
    const scale = Math.min(width / contentWidth, height / naturalHeight);
    return {
      snapshots,
      gap,
      contentWidth,
      contentHeight,
      context,
      canvas,
      rows,
      legendHeight,
      width,
      height,
      scale,
      naturalHeight,
    };
  }

  public static async png(
    sources: string[],
    options: ImageExportOptions,
    legend?: Legend,
  ): Promise<Blob> {
    const snapshotOptions = { ...options };
    await document.fonts.ready;
    const {
      snapshots,
      gap,
      contentWidth,
      contentHeight,
      context,
      canvas,
      rows,
      legendHeight,
      width,
      height,
      scale,
      naturalHeight,
    } = ImageExporter.layout(sources, snapshotOptions, legend);
    const background = snapshotOptions.background;
    canvas.width = width;
    canvas.height = height;
    // Explicit backgrounds replace component backgrounds; omission preserves them.
    if (background !== undefined) {
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);
    }
    context.translate((width - contentWidth * scale) / 2, (height - naturalHeight * scale) / 2);
    context.scale(scale, scale);
    let y = 0;
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
        context.drawImage(image, (contentWidth - source.width) / 2, y, source.width, source.height);
      } finally {
        URL.revokeObjectURL(url);
      }
      y += source.height + gap;
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

  public static svg(sources: string[], options: ImageExportOptions, legend?: Legend): string {
    const {
      snapshots,
      gap,
      contentWidth,
      contentHeight,
      rows,
      legendHeight,
      width,
      height,
      scale,
      naturalHeight,
    } = ImageExporter.layout(sources, options, legend);
    const namespace = 'http://www.w3.org/2000/svg';
    const root = document.createElementNS(namespace, 'svg');
    const left = -(width / scale - contentWidth) / 2;
    const top = -(height / scale - naturalHeight) / 2;
    root.setAttribute('width', String(width));
    root.setAttribute('height', String(height));
    root.setAttribute('viewBox', `${left} ${top} ${width / scale} ${height / scale}`);
    const append = (tag: string, attributes: Record<string, string | number>) => {
      const node = document.createElementNS(namespace, tag);
      for (const [name, value] of Object.entries(attributes)) {
        node.setAttribute(name, String(value));
      }
      root.appendChild(node);
      return node;
    };
    if (options.background !== undefined) {
      append('rect', {
        x: left,
        y: top,
        width: width / scale,
        height: height / scale,
        fill: options.background,
      });
    }
    let y = 0;
    for (const source of snapshots) {
      source.svg.setAttribute('x', String((contentWidth - source.width) / 2));
      source.svg.setAttribute('y', String(y));
      root.appendChild(source.svg);
      y += source.height + gap;
    }
    if (legend && rows.length) {
      const chartBackground = snapshots[0].svg
        .querySelector('[data-export-background]')
        ?.getAttribute('fill');
      if (options.background === undefined && chartBackground) {
        append('rect', {
          x: 0,
          y: contentHeight,
          width: contentWidth,
          height: legendHeight,
          fill: chartBackground,
        });
      }
      for (const [index, row] of rows.entries()) {
        const y = contentHeight + 24 + index * 22;
        if (row.swatch) {
          append('line', { x1: 16, x2: 40, y1: y, y2: y, stroke: row.color, 'stroke-width': 3 });
        }
        const text = append('text', {
          x: 48,
          y,
          fill: legend.textColor,
          'font-size': 14,
          'font-family': legend.fontFamily,
          'dominant-baseline': 'central',
        });
        text.textContent = row.text;
      }
    }
    return new XMLSerializer().serializeToString(root);
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
