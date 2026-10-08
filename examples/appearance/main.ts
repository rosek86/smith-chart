import { Smith } from 'smithkit';
import type { SmithAppearance } from 'smithkit';

const chart = new Smith({ cursorEnabled: true });
chart.draw('#chart');
const traceId = chart.addTrace(
  [
    { frequencyHz: 1e9, reflectionCoefficient: [0.4, -0.4] },
    { frequencyHz: 1.5e9, reflectionCoefficient: [0, 0] },
    { frequencyHz: 2e9, reflectionCoefficient: [0.4, 0.4] },
  ],
  { name: 'Antenna', color: '#f97316' },
);

chart.addMarker(traceId);

const select = document.querySelector<HTMLSelectElement>('#theme')!;
function applyTheme(): void {
  chart.setAppearance({
    theme: select.value as SmithAppearance['theme'],
    overrides: { grid: { fontSize: 11 }, cursor: { pointColor: '#f97316' } },
  });
}
select.addEventListener('change', applyTheme);
applyTheme();
