import { select, dragEnable } from 'd3';

/** Release only window listeners belonging to this chart's active mouse gesture. */
export class MouseGesture {
  private release: (() => void) | undefined;

  public capture(event: MouseEvent, namespace: 'zoom' | 'drag'): void {
    if (event.type !== 'mousedown' || !event.view) return;
    const view = event.view;
    const selection = select(view);
    const move = `mousemove.${namespace}`;
    const up = `mouseup.${namespace}`;
    const listener = selection.on(move);
    this.release = () => {
      // A different chart may have started a gesture since this one ended.
      if (listener && selection.on(move) === listener) {
        selection.on(`${move} ${up}`, null);
        dragEnable(view, false);
      }
    };
  }

  public destroy(): void {
    this.release?.();
    this.release = undefined;
  }
}
