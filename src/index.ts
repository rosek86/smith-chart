import * as d3 from 'd3';
import * as $ from 'jquery';

import { Smith } from './Smith';

$(document).ready(() => {
  const size = 800;
  const options = { stroke: 'black', majorWidth: '0.001', minorWidth: '0.0003' };

  const smith = new Smith('#smith', size);

  smith.drawImpedance(options);
  smith.enableInteraction();

  $('#impedance').change(() => smith.drawImpedance(options));
  $('#admittance').change(() => smith.drawAdmittance(options));

  const update = () => {
    const rc = smith.getReflectionCoefficient();
    const impedance = smith.getImpedance();
    const admittance = smith.getAdmittance();
    const swr = smith.getSwr();

    if (rc) {
      $('#reflection-coefficient').text(
        'Γ: ' +
        rc[0].toFixed(3) + ' + j ' + rc[1].toFixed(3)
      );
    }
    if (impedance) {
      $('#impedanceValue').text(
        'Z: ' +
        impedance[0].toFixed(3) + ' + j ' + impedance[1].toFixed(3) +
        'Ω'
      );
    }
    if (admittance) {
      $('#admittanceValue').text(
        'Y: ' +
        admittance[0].toFixed(3) + ' + j ' + admittance[1].toFixed(3) +
        '℧'
      );
    }

    $('#swr').text('SWR: ' + swr.toFixed(3));
  };

  smith.setUserActionHandler(update);
  update();
});
