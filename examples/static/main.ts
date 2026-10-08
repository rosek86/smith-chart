import { Smith } from 'smithkit';

const chart = new Smith(50);
chart.draw('#chart');
chart.setZoomEnabled(false);
chart.peripheralScales.setVisible(false);
for (const layer of [chart.layers.resistance, chart.layers.reactance]) {
  layer.setDetail('basic');
}
chart.addTrace(
  [
    { frequencyHz: 1e9, reflectionCoefficient: [0.4, -0.4] },
    { frequencyHz: 1.5e9, reflectionCoefficient: [0, 0] },
    { frequencyHz: 2e9, reflectionCoefficient: [0.4, 0.4] },
  ],
  { name: 'Measured sweep', mode: 'line' },
);

// Static presentation: remove the automatically created draggable marker.
for (const marker of chart.getTraces()[0].markers) {
  chart.removeMarker(marker.id);
}
