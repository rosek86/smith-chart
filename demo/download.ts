/** File downloads belong to the demo, not to the rendering library. */
export class SvgDownload {
  private constructor() {}

  public static save(svg: string, filename: string): void {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Give the browser time to start consuming the Blob before releasing it.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
