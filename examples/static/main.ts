import { Smith } from 'smithkit';

const chart = new Smith();
chart.draw('#chart');
chart.addTrace(
  [
    { frequencyHz: 1e9, reflectionCoefficient: [0.4, -0.4] },
    { frequencyHz: 1.5e9, reflectionCoefficient: [0, 0] },
    { frequencyHz: 2e9, reflectionCoefficient: [0.4, 0.4] },
  ],
  { name: 'Measured sweep', mode: 'line' },
);
