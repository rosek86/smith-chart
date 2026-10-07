interface LabelBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Responsive label placement measured in the default view, independent of user zoom. */
export class LabelLayout {
  private width = 0;
  private height = 0;
  private readonly resizedFonts = new Map<SVGTextElement, string>();
  public constructor(
    private readonly viewport: SVGSVGElement,
    private readonly container: SVGGElement,
    private readonly baseView: { x: number; y: number; k: number },
  ) {}

  public update(force = false): void {
    const viewport = this.viewport.getBoundingClientRect();
    if (!this.viewport.isConnected || viewport.width <= 0 || viewport.height <= 0) {
      return;
    }
    if (!force && viewport.width === this.width && viewport.height === this.height) {
      return;
    }
    this.width = viewport.width;
    this.height = viewport.height;
    const rootMatrix = this.viewport.getScreenCTM();
    const containerMatrix = this.container.getScreenCTM();
    if (!rootMatrix || !containerMatrix) {
      return;
    }
    const reference = rootMatrix.translate(this.baseView.x, this.baseView.y).scale(this.baseView.k);
    const normalize = reference.multiply(containerMatrix.inverse());
    // Peripheral rulers retain their complete, fixed-scale lettering. Only grid
    // labels participate in thinning and minimum-font-size adjustments.
    const labels = [...this.container.querySelectorAll<SVGTextElement>('text')].filter(
      (label) => !label.closest('[data-label-layer=peripheral-scales]'),
    );
    const view = this.viewport.ownerDocument.defaultView!;
    // Restore only properties owned by this layout before measuring the base styling.
    for (const label of labels) {
      if (label.hasAttribute('data-label-hidden')) {
        label.removeAttribute('visibility');
        label.removeAttribute('data-label-hidden');
      }
      const previousFont = this.resizedFonts.get(label);
      if (previousFont !== undefined) {
        if (previousFont) {
          label.style.fontSize = previousFont;
        } else {
          label.style.removeProperty('font-size');
        }
      }
    }
    this.resizedFonts.clear();
    const styles = new Map<Element, CSSStyleDeclaration>();
    const style = (element: Element) => {
      let result = styles.get(element);
      if (!result) {
        result = view.getComputedStyle(element);
        styles.set(element, result);
      }
      return result;
    };
    const candidates = labels.flatMap((label, order) => {
      for (let parent: Element | null = label; parent; parent = parent.parentElement) {
        const computed = style(parent);
        if (
          computed.display === 'none' ||
          computed.visibility === 'hidden' ||
          Number(computed.opacity) === 0
        ) {
          return [];
        }
        if (parent === this.viewport) {
          break;
        }
      }
      const screenMatrix = label.getScreenCTM();
      const matrix = screenMatrix ? normalize.multiply(screenMatrix) : null;
      const scale = matrix ? Math.hypot(matrix.a, matrix.b) : 0;
      if (scale <= 0) {
        return [];
      }
      return [
        {
          label,
          order,
          scale,
          matrix: matrix!,
          baseSize: parseFloat(style(label).fontSize),
          priority: Number(label.dataset.labelPriority ?? 0),
        },
      ];
    });
    // Batch font changes before reading bounds to avoid alternating layout reads/writes.
    for (const { label, scale, baseSize } of candidates) {
      if (Number.isFinite(baseSize) && baseSize * scale < 9) {
        this.resizedFonts.set(label, label.style.fontSize);
        label.style.fontSize = `${9 / scale}px`;
      }
    }
    const measured = candidates.map((entry) => ({
      ...entry,
      box: LabelLayout.transformBox(entry.label.getBBox(), entry.matrix),
    }));
    measured.sort((a, b) => b.priority - a.priority || a.order - b.order);
    const occupied: LabelBox[] = [];
    const hidden: SVGTextElement[] = [];
    for (const { label, box } of measured) {
      const outside =
        box.right <= box.left ||
        box.bottom <= box.top ||
        box.left < viewport.left + 1 ||
        box.right > viewport.right - 1 ||
        box.top < viewport.top + 1 ||
        box.bottom > viewport.bottom - 1;
      const collision = occupied.some((other) => LabelLayout.overlaps(box, other));
      if (outside || collision) {
        hidden.push(label);
      } else {
        occupied.push(box);
      }
    }
    for (const label of hidden) {
      label.setAttribute('visibility', 'hidden');
      label.setAttribute('data-label-hidden', 'true');
    }
  }

  private static transformBox(box: DOMRect, matrix: DOMMatrix): LabelBox {
    const points = [
      new DOMPoint(box.x, box.y),
      new DOMPoint(box.x + box.width, box.y),
      new DOMPoint(box.x, box.y + box.height),
      new DOMPoint(box.x + box.width, box.y + box.height),
    ].map((point) => point.matrixTransform(matrix));
    return {
      left: Math.min(...points.map((point) => point.x)),
      right: Math.max(...points.map((point) => point.x)),
      top: Math.min(...points.map((point) => point.y)),
      bottom: Math.max(...points.map((point) => point.y)),
    };
  }

  private static overlaps(a: LabelBox, b: LabelBox): boolean {
    const gap = 2;
    return (
      a.left < b.right + gap &&
      a.right + gap > b.left &&
      a.top < b.bottom + gap &&
      a.bottom + gap > b.top
    );
  }
}
