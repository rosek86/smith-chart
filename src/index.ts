import * as $ from 'jquery';

import { Smith, SmithEvent, SmithEventType, SmithMarkerEvent } from './Smith';
import { S1P } from './SnP';

$(document).ready(() => {
  const smith = new Smith();

  smith.draw('#smith');

  const constImpCircles = smith.ConstImpCircles;
  const constAdmCircles = smith.ConstAdmCircles;
  const constQCircles   = smith.ConstQCircles;
  const constSwrCircles = smith.ConstSwrCircles;

  const smithCircles: [ string, () => void, () => void ][] = [
    [ '#impedance',   () => constImpCircles.show(), () => constImpCircles.hide() ],
    [ '#admittance',  () => constAdmCircles.show(), () => constAdmCircles.hide() ],
    [ '#constantQ',   () => constQCircles  .show(), () => constQCircles  .hide() ],
    [ '#constantSwr', () => constSwrCircles.show(), () => constSwrCircles.hide() ],
  ];

  for (const c of smithCircles) {
    $(c[0]).change(() => { $(c[0]).prop('checked') ? c[1]() : c[2](); });
  }

  const update = (event: SmithEvent) => {
    if (event.data === undefined) {
      return;
    }
    const rc = event.data.reflectionCoefficient;
    const z = event.data.impedance;
    const y = event.data.admittance;
    const Q = event.data.Q;
    const swr = event.data.swr;
    const rl = event.data.returnLoss;
    const ml = event.data.mismatchLoss;

    if (event.type === SmithEventType.Cursor) {
      $('#cur-ref-co').text(`Γ: ${smith.formatComplex(rc)}`);
      if (z) {
        $('#cur-imp').text(`Z: ${smith.formatComplex(z, '')}`);
        $('#cur-imp-pol').text(`Z: ${smith.formatComplexPolar(z, 'Ω')}`);
      }
      if (y) {
        $('#cur-adm').text(`Y: ${smith.formatComplex(y, 'mS')}`);
        $('#cur-adm-pol').text(`Y: ${smith.formatComplexPolar(y, 'mS')}`);
      }
      $('#cur-swr').text(`VSWR: ${swr.toFixed(3)} : 1`);
      $('#cur-ret-loss').text(`Return Loss: ${rl.toFixed(2)} dB`);
      $('#cur-mis-loss').text(`Mismatch Loss: ${ml.toFixed(2)} dB`);
      if (Q) {
        $('#cur-q').text(`Q: ${Q.toFixed(3)}`);
      }
    }

    if (event.type === SmithEventType.Marker) {
      $('#mark-ref-co').text(`Γ: ${smith.formatComplex(rc)}`);
      if (z) {
        $('#mark-imp').text(`Z: ${smith.formatComplex(z, 'Ω')}`);
        $('#mark-imp-pol').text(`Z: ${smith.formatComplexPolar(z, 'Ω')}`);
      }
      if (y) {
        $('#mark-adm').text(`Y: ${smith.formatComplex(y, 'mS')}`);
        $('#mark-adm-pol').text(`Y: ${smith.formatComplexPolar(y, 'mS')}`);
      }
      $('#mark-swr').text(`VSWR: ${swr.toFixed(3)} : 1`);
      $('#mark-ret-loss').text(`Return Loss: ${rl.toFixed(2)} dB`);
      $('#mark-mis-loss').text(`Mismatch Loss: ${ml.toFixed(2)} dB`);
      if (Q) {
        $('#mark-q').text(`Q: ${Q.toFixed(3)}`);
      }

      const med = event.data as SmithMarkerEvent;
      $('#mark-freq').text(`Frequency: ${smith.formatNumber(med.freq)}Hz`);
      const val = smith.getReactanceComponentValue(rc, med.freq);
      $('#mark-comp-val').text(val);
    }
  };

  smith.setUserActionHandler(update);

  function openFile(file: Blob): Promise<string | ArrayBuffer | null> {
    return new Promise<string | ArrayBuffer | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsText(file);
    });
  }

  function parseTouchstone(data: string): S1P {
    const values: S1P = [];
    const lines = data.split('\n');

    for (const line of lines) {
      if (line.charAt(0) === '!') { continue; }
      if (line.charAt(0) === '#') { continue; }

      const row = line.trim().split(/ +/g);
      if (row.length !== 3) { continue; }

      const value = row.map((v) => parseFloat(v));

      values.push({
        freq: value[0],
        point: [value[1], value[2]],
      });
    }

    return values;
  }

  async function handleFileSelect(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const data = await openFile(input.files[0]);

      if (typeof data === 'string') {
        const values = parseTouchstone(data);
        smith.addS1P(values);
      }
    }
  }

  const fileElement = document.getElementById('file');
  if (fileElement) {
    fileElement.addEventListener('change', handleFileSelect, false);
  }
});
