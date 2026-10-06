import { Smith, SmithEventType, SmithFormatter } from 'smithkit';
import './style.css';

function element<T extends HTMLElement>(id: string): T {
  const value = document.getElementById(id);
  if (!value) {
    throw new Error(`Missing example element: ${id}`);
  }
  return value as T;
}

const host = element<HTMLDivElement>('chart');
const output = element<HTMLOutputElement>('reading');
const updateButton = element<HTMLButtonElement>('update');
const unmountButton = element<HTMLButtonElement>('unmount');
let chart: Smith | undefined;
let traceId: string | undefined;
let unsubscribe: (() => void) | undefined;
let alternate = false;

const sweeps = [
  [
    { frequencyHz: 1e9, reflectionCoefficient: [0.4, -0.4] },
    { frequencyHz: 1.5e9, reflectionCoefficient: [0, 0] },
    { frequencyHz: 2e9, reflectionCoefficient: [0.4, 0.4] },
  ],
  [
    { frequencyHz: 1e9, reflectionCoefficient: [0.3, -0.3] },
    { frequencyHz: 1.5e9, reflectionCoefficient: [0.2, 0.1] },
    { frequencyHz: 2e9, reflectionCoefficient: [0.3, 0.3] },
  ],
] as const;

function unmount(): void {
  unsubscribe?.();
  unsubscribe = undefined;
  chart?.destroy();
  chart = undefined;
  traceId = undefined;
  output.value = 'No chart mounted.';
  updateButton.disabled = true;
  unmountButton.disabled = true;
}

function mount(): void {
  unmount();
  chart = new Smith(50);
  chart.draw(host);
  for (const layer of [chart.layers.resistance, chart.layers.reactance]) {
    layer.setMinorVisible(false);
  }
  chart.peripheralScales.setVisible(false);
  unsubscribe = chart.onEvent((event) => {
    if (event.type === SmithEventType.Marker) {
      const reading = event.data;
      const impedance = reading.impedanceOhms
        ? SmithFormatter.complex(reading.impedanceOhms).trim()
        : '∞';
      output.value = `${SmithFormatter.number(reading.frequencyHz)}Hz · ${impedance} Ω`;
    }
  });
  alternate = false;
  traceId = chart.addTrace(sweeps[0], { name: 'Measured sweep', color: '#2563eb', mode: 'both' });
  const marker = chart.getTraces()[0].markers[0].id;
  chart.setMarkerFrequency(marker, 1.5e9);
  updateButton.disabled = false;
  unmountButton.disabled = false;
}

element('mount').addEventListener('click', mount);
unmountButton.addEventListener('click', unmount);
updateButton.addEventListener('click', () => {
  if (chart && traceId) {
    alternate = !alternate;
    chart.updateTrace(traceId, sweeps[alternate ? 1 : 0], { markerSelection: 'frequency' });
  }
});
element<HTMLInputElement>('compact').addEventListener('change', (event) => {
  host.classList.toggle('compact', (event.currentTarget as HTMLInputElement).checked);
});
window.addEventListener('pagehide', unmount);
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    mount();
  }
});
mount();
