import { Smith, Touchstone, RfCalculations } from 'smithkit';

// Touchstone 1.x two-port order: frequency, S11, S21, S12, S22.
const source = `! Synthetic two-port measurement
# GHz S RI R 50
1   0.4 -0.4   0.8 0   0.1 0   0.2 -0.3
1.5 0.0  0.0   0.9 0   0.1 0   0.1  0.0
2   0.4  0.4   0.8 0   0.1 0   0.2  0.3
`;
const chart = new Smith();
chart.draw('#chart');
let traceId: string | undefined;
let samples: Float64Array = new Float64Array();
const parameter = document.querySelector<HTMLSelectElement>('#parameter')!;
const reference = document.querySelector<HTMLSelectElement>('#reference')!;
const status = document.querySelector<HTMLParagraphElement>('#status')!;

function update(): void {
  const selected = parameter.value === 'S22' ? 'S22' : 'S11';
  const parsed = Touchstone.parse(source, { ports: 2, parameter: selected, output: 'packed' });
  const referenceImpedanceOhms = Number(reference.value);
  samples = RfCalculations.renormalizeSamples(
    parsed.samples,
    parsed.referenceImpedanceOhms,
    referenceImpedanceOhms,
  );
  if (traceId) {
    chart.removeTrace(traceId);
  }
  chart.setOptions({ referenceImpedanceOhms });
  traceId = chart.addTrace(samples, { name: selected, mode: 'both' });
  status.textContent = `${selected}: ${samples.length / 3} packed samples at ${referenceImpedanceOhms} Ω.`;
}
parameter.addEventListener('change', update);
reference.addEventListener('change', update);
update();

document.querySelector('#download')!.addEventListener('click', () => {
  const text = Touchstone.stringify(samples, { referenceImpedanceOhms: Number(reference.value) });
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${parameter.value}-${reference.value}ohm.s1p`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
