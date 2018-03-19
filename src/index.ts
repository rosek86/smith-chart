import * as d3 from 'd3';
import * as $ from 'jquery';

import { Smith } from './Smith';

$(document).ready(() => {
  const size = 600;
  const options = { stroke: 'black', majorWidth: '0.0009', minorWidth: '0.0003' };

  const smith = new Smith('#smith', size);
  smith.drawImpedance(options);
  smith.enableInteraction();

  $('#impedance').change(() => smith.drawImpedance(options));
  $('#admittance').change(() => smith.drawAdmittance(options));
});
