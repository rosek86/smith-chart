import * as d3 from 'd3';
import * as $ from 'jquery';

import { Smith, SmithEvent, SmithEventType, SmithMarkerEvent } from './Smith';
import { S1P } from './SnP';

$(document).ready(() => {
  const size = 600;
  const options = { stroke: 'black', majorWidth: '0.001', minorWidth: '0.0003' };

  const smith = new Smith('#smith', size);

  smith.showImpedance();

  const smithCircles: [ string, () => void, () => void ][] = [
    [ '#impedance',   () => smith.showImpedance(),          () => smith.hideImpedance()          ],
    [ '#admittance',  () => smith.showAdmittance(),         () => smith.hideAdmittance()         ],
    [ '#constantQ',   () => smith.showConstantQ(),          () => smith.hideConstantQ()          ],
    [ '#constantSwr', () => smith.showConstantSwrCircles(), () => smith.hideConstantSwrCircles() ],
  ];

  for (const c of smithCircles) {
    $(c[0]).change(() => { $(c[0]).prop('checked') ? c[1]() : c[2](); });
  }

  const update = (event: SmithEvent) => {
    const rc = event.data.reflectionCoefficient;
    const z = event.data.impedance;
    const y = event.data.admittance;
    const Q = event.data.Q;
    const swr = event.data.swr;
    const rl = event.data.returnLoss;
    const ml = event.data.mismatchLoss;

    if (event.type === SmithEventType.Cursor) {
      $('#cur-ref-co').text(`Γ: ${smith.formatComplex(rc)}`);
      z && $('#cur-imp').text(`Z: ${smith.formatComplex(z)} Ω`);
      y && $('#cur-adm').text(`Y: ${smith.formatComplex(y)} mS`);
      $('#cur-swr').text(`VSWR: ${swr.toFixed(3)} : 1`);
      $('#cur-ret-loss').text(`Return Loss: ${rl.toFixed(2)} dB`);
      $('#cur-mis-loss').text(`Mismatch Loss: ${ml.toFixed(2)} dB`);
      Q && $('#cur-q').text(`Q: ${Q.toFixed(3)}`);
    }

    if (event.type === SmithEventType.Marker) {
      $('#mark-ref-co').text(`Γ: ${smith.formatComplex(rc)}`);
      z && $('#mark-imp').text(`Z: ${smith.formatComplex(z)} Ω`);
      y && $('#mark-adm').text(`Y: ${smith.formatComplex(y)} mS`);
      $('#mark-swr').text(`VSWR: ${swr.toFixed(3)} : 1`);
      $('#mark-ret-loss').text(`Return Loss: ${rl.toFixed(2)} dB`);
      $('#mark-mis-loss').text(`Mismatch Loss: ${ml.toFixed(2)} dB`);
      Q && $('#mark-q').text(`Q: ${Q.toFixed(3)}`);

      const med = event.data as SmithMarkerEvent;
      $('#mark-freq').text(`Frequency: ${smith.formatNumber(med.freq)}Hz`);
      const val = smith.getReactanceComponentValue(rc, med.freq);
      $('#mark-comp-val').text(val);
    }
  };

  smith.setUserActionHandler(update);
  // update();

  function openFile(file: Blob): Promise<string> {
    return new Promise<string>((resolve, reject) => {
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
      })
    }

    return values;
  }

  async function handleFileSelect(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const data = await openFile(input.files[0]);
      const values = parseTouchstone(data);

      smith.addS1P(values);
    }
  }

  document.getElementById('file')!.addEventListener('change', handleFileSelect, false);
});
