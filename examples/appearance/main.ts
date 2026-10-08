import { Smith } from 'smithkit';
import type { SmithAppearance } from 'smithkit';

const chart = new Smith(50);
chart.draw('#chart');
chart.peripheralScales.setVisible(false);
chart.layers.resistance.setDetail('standard');
chart.layers.reactance.setDetail('standard');
chart.addTrace(
  [
    { frequencyHz: 1e9, reflectionCoefficient: [0.4, -0.4] },
    { frequencyHz: 1.5e9, reflectionCoefficient: [0, 0] },
    { frequencyHz: 2e9, reflectionCoefficient: [0.4, 0.4] },
  ],
  { name: 'Antenna', color: '#f97316' },
);

const select = document.querySelector<HTMLSelectElement>('#theme')!;
function applyTheme(): void {
  chart.setAppearance({
    theme: select.value as SmithAppearance['theme'],
    overrides: { grid: { fontSize: 11 }, cursor: { pointColor: '#f97316' } },
  });
}
select.addEventListener('change', applyTheme);
applyTheme();
