/** File downloads belong to the demo, not to the rendering library. */
export class FileDownload {
  private constructor() {}

  public static save(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
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
