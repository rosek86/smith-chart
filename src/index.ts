import * as d3 from 'd3';
import * as $ from 'jquery';

import { Smith } from './Smith';

$(document).ready(() => {
  const size = 800;
  const options = { stroke: 'black', majorWidth: '0.001', minorWidth: '0.0003' };

  const smith = new Smith('#smith', size);

  smith.showImpedance();
  smith.enableInteraction();

  $('#impedance').change(() => {
    if ($('#impedance').prop('checked') === true) {
      smith.showImpedance();
    } else {
      smith.hideImpedance();
    }
  });
  $('#admittance').change(() => {
    if ($('#admittance').prop('checked') === true) {
      smith.showAdmittance();
    } else {
      smith.hideAdmittance();
    }
  });
  $('#constantQ').change(() => {
    if ($('#constantQ').prop('checked') === true) {
      smith.showConstantQ();
    } else {
      smith.hideConstantQ();
    }
  });
  $('#constantSwr').change(() => {
    if ($('#constantSwr').prop('checked') === true) {
      smith.showConstantSwrCircles();
    } else {
      smith.hideConstantSwrCircles();
    }
  });

  const update = () => {
    const rc = smith.getReflectionCoefficient();
    const impedance = smith.getImpedance();
    const admittance = smith.getAdmittance();
    const swr = smith.getSwr();
    const returnLoss = smith.getReturnLoss();
    const Q = smith.getQ();

    if (rc) {
      $('#reflection-coefficient').text(
        'Γ: ' +
        rc[0].toFixed(3) + ' ' +
        (rc[1] < 0 ? '-' : '+')  + ' j ' +
        Math.abs(rc[1]).toFixed(3)
      );
    }
    if (impedance) {
      $('#impedanceValue').text(
        'Z: ' +
        impedance[0].toFixed(3) + ' ' +
        (impedance[1] < 0 ? '-' : '+')  + ' j ' +
        Math.abs(impedance[1]).toFixed(3) +
        'Ω'
      );
    }
    if (admittance) {
      $('#admittanceValue').text(
        'Y: ' +
        admittance[0].toFixed(3) + ' ' +
        (admittance[1] < 0 ? '-' : '+')  + ' j ' +
        Math.abs(admittance[1]).toFixed(3) +
        '℧'
      );
    }
    if (Q) {
      $('#q-value').text('Q: ' + Q.toFixed(3));
    }

    $('#swr').text('VSWR: ' + swr.toFixed(3) + ' : 1');
    $('#return-loss').text('Return Loss: ' + returnLoss.toFixed(2) + ' dB');
  };

  smith.setUserActionHandler(update);
  update();
});
