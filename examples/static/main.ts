import { Smith } from 'smithkit';

const chart = new Smith();
chart.draw('#chart');
// Tuples contain frequency in Hz and the real/imaginary parts of Γ.
chart.addTrace(
  [
    [1e9, 0.4, -0.4],
    [1.5e9, 0, 0],
    [2e9, 0.4, 0.4],
  ],
  { name: 'Measured sweep', mode: 'line' },
);
