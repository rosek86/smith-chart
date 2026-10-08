import { Smith } from 'smithkit';

const chart = new Smith(50);
chart.draw('#chart');
chart.peripheralScales.setVisible(false);
chart.layers.resistance.setDetail('basic');
chart.layers.reactance.setDetail('basic');
chart.addTrace(
  [
    { frequencyHz: 1e9, reflectionCoefficient: [0.4, -0.4] },
    { frequencyHz: 1.5e9, reflectionCoefficient: [0, 0] },
    { frequencyHz: 2e9, reflectionCoefficient: [0.4, 0.4] },
  ],
  { name: 'Measured antenna', mode: 'both' },
);

const status = document.querySelector<HTMLParagraphElement>('#status')!;
for (const format of ['svg', 'png'] as const) {
  const button = document.querySelector<HTMLButtonElement>(`#${format}`)!;
  button.addEventListener('click', async () => {
    button.disabled = true;
    status.textContent = 'Preparing report…';
    try {
      const options = { background: 'white', markerLegend: true };
      const blob =
        format === 'png'
          ? await chart.toPng({ ...options, width: 1600 })
          : new Blob([chart.toSvg(options)], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `smithkit-report.${format}`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = `Saved ${link.download}.`;
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Export failed.';
    } finally {
      button.disabled = false;
    }
  });
}
