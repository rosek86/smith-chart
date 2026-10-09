import { expect, test } from '@playwright/test';
import { loadLibrary } from './library';

test('reflection selection matches a full norm scan, including rounded ties and tiny coordinates', async ({
  page,
}) => {
  await page.setContent('<div id="chart" style="width:500px;height:500px"></div>');
  await loadLibrary(page);
  const result = await page.evaluate(() => {
    const chart = new window.SmithTest.Smith();
    chart.draw('#chart');
    const id = chart.addTrace([[0, 0, 0]], { mode: 'line' });
    const marker = chart.addMarker(id)!;
    let state = 0x61a71;
    const random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 2 ** 32;
    };
    const differences: number[] = [];
    for (let run = 0; run < 90; run++) {
      const magnitude = run % 3 === 0 ? 1e-300 : 1;
      const point: [number, number] =
        run % 2 ? [random() * magnitude, random() * magnitude] : [0, 0];
      const values = Array.from({ length: 200 }, (_, index): import('../../src').TraceTuple => {
        const angle = random() * 2 * Math.PI;
        const radius = (run % 3 === 1 ? 1 + random() * Number.EPSILON * 4 : random()) * magnitude;
        return [index, radius * Math.cos(angle), radius * Math.sin(angle)];
      });
      if (run === 0) {
        values.splice(0, values.length, [0, 1, 2 ** -27], [1, 1, 0]);
      }
      if (run === 2) {
        values.splice(
          0,
          values.length,
          [0, 0.6996243018585157, 0.022931119662685902],
          [1, 0.6935925464238472, 0.09449539430725315],
        );
      }
      let expected = 0;
      let distance = Infinity;
      values.forEach((value, index) => {
        const next = Math.hypot(point[0] - value[1], point[1] - value[2]);
        if (next < distance) {
          distance = next;
          expected = index;
        }
      });
      chart.updateTrace(id, [[0, ...point]], { markerSelection: 'sample-index' });
      chart.updateTrace(id, values, { markerSelection: 'reflection' });
      if (chart.getMarker(marker)!.sampleIndex !== expected) {
        differences.push(run);
      }
    }
    chart.destroy();
    return differences;
  });
  expect(result).toEqual([]);
});
