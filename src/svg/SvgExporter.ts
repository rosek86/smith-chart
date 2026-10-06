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
    SvgExporter.size(copy, bounds.width, bounds.height);
    return SvgExporter.serialize(copy);
  }

  /** Preserve the current CSS layout of separate scale SVGs in one SVG document. */
  public static scales(container: HTMLElement, axes: readonly SVGSVGElement[]): string {
    const bounds = SvgExporter.bounds(container);
    const root = container.ownerDocument.createElementNS(SvgExporter.namespace, 'svg');
    root.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
    SvgExporter.size(root, bounds.width, bounds.height);
    for (const axis of axes) {
      const position = SvgExporter.bounds(axis);
      const copy = SvgExporter.copy(axis);
      copy.setAttribute('x', String(position.x - bounds.x));
      copy.setAttribute('y', String(position.y - bounds.y));
      SvgExporter.size(copy, position.width, position.height);
      root.appendChild(copy);
    }
    return SvgExporter.serialize(root);
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
