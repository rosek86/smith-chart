/** Captures rendered SVG with presentation styles resolved in its source document. */
export class SvgExporter {
  private constructor() {}

  private static readonly namespace = 'http://www.w3.org/2000/svg';
  private static readonly properties = [
    'color',
    'display',
    'visibility',
    'opacity',
    'fill',
    'fill-opacity',
    'fill-rule',
    'stroke',
    'stroke-width',
    'stroke-opacity',
    'stroke-dasharray',
    'stroke-dashoffset',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-miterlimit',
    'vector-effect',
    'paint-order',
    'shape-rendering',
    'text-rendering',
    'font-family',
    'font-size',
    'font-style',
    'font-weight',
    'font-variant',
    'font-stretch',
    'letter-spacing',
    'word-spacing',
    'text-anchor',
    'dominant-baseline',
    'alignment-baseline',
    'baseline-shift',
    'text-decoration',
    'white-space',
  ];

  private static readonly nonInherited = new Set([
    'display',
    'opacity',
    'vector-effect',
    'alignment-baseline',
    'dominant-baseline',
    'baseline-shift',
    'text-decoration',
  ]);

  public static chart(source: SVGElement): string {
    const bounds = SvgExporter.bounds(source);
    const copy = SvgExporter.copy(source);
    SvgExporter.background(copy, source);
    SvgExporter.size(copy, bounds.width, bounds.height);
    return SvgExporter.serialize(copy);
  }

  /** Preserve the current CSS layout of separate scale SVGs in one SVG document. */
  public static scales(
    container: HTMLElement,
    axes: readonly SVGSVGElement[],
    customize?: (copy: SVGElement, index: number) => void,
    caption?: { text: string; color: string; fontFamily: string },
  ): string {
    const bounds = SvgExporter.bounds(container);
    const root = container.ownerDocument.createElementNS(SvgExporter.namespace, 'svg');
    const lines: string[] = [];
    if (caption?.text) {
      const context = document.createElement('canvas').getContext('2d')!;
      context.font = `14px ${caption.fontFamily}`;
      let line = '';
      for (const character of caption.text) {
        if (
          character === '\n' ||
          (line && context.measureText(line + character).width > Math.max(1, bounds.width - 32))
        ) {
          lines.push(line);
          line = '';
        }
        if (character !== '\n') {
          line += character;
        }
      }
      lines.push(line);
    }
    const captionHeight = lines.length ? 16 + lines.length * 22 : 0;
    root.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height + captionHeight}`);
    SvgExporter.size(root, bounds.width, bounds.height + captionHeight);
    SvgExporter.background(root, container);
    lines.forEach((line, index) => {
      const text = container.ownerDocument.createElementNS(SvgExporter.namespace, 'text');
      text.setAttribute('data-role', 'scale-readout-label');
      text.setAttribute('x', '16');
      text.setAttribute('y', String(22 + index * 22));
      text.setAttribute('fill', caption!.color);
      text.setAttribute('font-family', caption!.fontFamily);
      text.setAttribute('font-size', '14');
      text.textContent = line;
      root.appendChild(text);
    });
    for (const [index, axis] of axes.entries()) {
      const position = SvgExporter.bounds(axis);
      const copy = SvgExporter.copy(axis);
      copy.setAttribute('x', String(position.x - bounds.x));
      copy.setAttribute('y', String(position.y - bounds.y + captionHeight));
      SvgExporter.size(copy, position.width, position.height);
      customize?.(copy, index);
      root.appendChild(copy);
    }
    return SvgExporter.serialize(root);
  }

  private static background(root: SVGElement, source: Element): void {
    const color = source.ownerDocument.defaultView!.getComputedStyle(source).backgroundColor;
    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
      return;
    }
    const rect = source.ownerDocument.createElementNS(SvgExporter.namespace, 'rect');
    rect.setAttribute('data-export-background', 'true');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.setAttribute('fill', color);
    rect.setAttribute('stroke', 'none');
    root.insertBefore(rect, root.firstChild);
  }

  private static bounds(element: Element): DOMRect {
    const bounds = element.getBoundingClientRect();
    if (!element.isConnected || bounds.width <= 0 || bounds.height <= 0) {
      throw new Error('SVG export requires a mounted component with a visible, non-zero size.');
    }
    return bounds;
  }

  private static copy(source: SVGElement): SVGElement {
    const copy = source.cloneNode(true) as SVGElement;
    const originals = [source, ...source.querySelectorAll<SVGElement>('*')];
    const copies = [copy, ...copy.querySelectorAll<SVGElement>('*')];
    const view = source.ownerDocument.defaultView!;
    const styles = new Map<Element, CSSStyleDeclaration>(
      originals.map((element) => [element, view.getComputedStyle(element)]),
    );
    originals.forEach((original, index) => {
      const element = copies[index];
      const style = styles.get(original)!;
      const parentStyle = original.parentElement ? styles.get(original.parentElement) : undefined;
      // Keep SVG geometry/transform attributes, but replace page-dependent CSS.
      element.removeAttribute('style');
      for (const property of SvgExporter.properties) {
        const value = style.getPropertyValue(property);
        element.removeAttribute(property);
        // Resolve inherited values at their boundary instead of repeating every font and
        // stroke property on thousands of descendants. CSS overrides may replace attributes.
        if (
          value &&
          (SvgExporter.nonInherited.has(property) ||
            parentStyle?.getPropertyValue(property) !== value)
        ) {
          element.style.setProperty(property, value);
        }
      }
      // An exported image has no event handlers or interactive controls.
      element.removeAttribute('tabindex');
      if (original.getAttribute('data-role') === 'marker') {
        // A static marker is an image, not an operable sample slider.
        element.setAttribute('role', 'img');
        element.setAttribute(
          'aria-label',
          `${original.getAttribute('aria-label')}; ${original.getAttribute('aria-valuetext')}`,
        );
        for (const attribute of [
          'aria-valuemin',
          'aria-valuemax',
          'aria-valuenow',
          'aria-valuetext',
          'aria-orientation',
          'aria-description',
          'aria-disabled',
        ]) {
          element.removeAttribute(attribute);
        }
      }
      element.removeAttribute('class');
      for (const attribute of [...element.attributes]) {
        if (attribute.name.startsWith('on')) {
          element.removeAttribute(attribute.name);
        }
      }
    });
    return copy;
  }

  private static size(svg: SVGElement, width: number, height: number): void {
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.style.setProperty('overflow', 'hidden');
  }

  private static serialize(svg: SVGElement): string {
    svg.setAttribute('xmlns', SvgExporter.namespace);
    return new XMLSerializer().serializeToString(svg);
  }
}
