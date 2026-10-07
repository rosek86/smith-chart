import { expect, test } from '@playwright/test';
import { loadLibrary } from './library';

test('grid and scale labels stay above geometry after updates, with markers on top', async ({
  page,
}) => {
  await page.setContent(
    '<div id="chart" style="width:700px;height:700px"></div><div id="scales"></div>',
  );
  await loadLibrary(page);
  const visibility = await page.evaluate(() => {
    const { Smith, SmithScales, Complex } = window.SmithTest;
    const chart = new Smith();
    chart.draw('#chart');
    const scales = new SmithScales();
    scales.draw('#scales');
    const states = [];
    for (const name of ['resistance', 'reactance', 'conductance', 'susceptance'] as const) {
      const layer = chart.layers[name];
      const labels = document.querySelector(`[data-label-layer=${name}]`)!;
      layer.setVisible(false);
      const hidden = labels.getAttribute('opacity');
      layer.setStyle({ textColor: '#123456', textFontSize: 8 });
      layer.setMinorVisible(false);
      layer.setVisible(true);
      const shown = labels.getAttribute('opacity');
      const color = getComputedStyle(labels.querySelector('text')!).fill;
      layer.setMinorVisible(true);
      states.push({ hidden, shown, color });
    }
    chart.peripheralScales.setVisible(false);
    const peripheral = document.querySelector('[data-label-layer=peripheral-scales]')!;
    const peripheralHidden = peripheral.getAttribute('opacity');
    chart.peripheralScales.setVisible(true);
    chart.peripheralScales.update(Complex.from(0.4, 0.3));
    for (const layer of [chart.layers.q, chart.layers.vswr]) {
      layer.setVisible(true);
      layer.addValue(4);
      layer.removeValue(2);
    }
    const trace = chart.addTrace([{ frequencyHz: 1e9, reflectionCoefficient: [0.2, 0.3] }]);
    chart.updateTrace(trace, [{ frequencyHz: 1e9, reflectionCoefficient: [0.4, 0.3] }]);
    scales.update(Complex.from(0.4, 0.3));
    scales.update(null);
    scales.update(Complex.from(0.2, 0.5));
    return { states, peripheralHidden, peripheralShown: peripheral.getAttribute('opacity') };
  });
  for (const state of visibility.states) {
    expect(state).toEqual({ hidden: '0', shown: null, color: 'rgb(18, 52, 86)' });
  }
  expect(visibility.peripheralHidden).toBe('0');
  expect(visibility.peripheralShown).toBeNull();

  const checkPaintOrder = async () => {
    const results = await page.locator('svg').evaluateAll((svgs) =>
      svgs.map((svg) => {
        const elements = [...svg.querySelectorAll('text, line, path, circle, polygon')].filter(
          (element) => !element.closest('defs, [data-layer=markers]'),
        );
        const firstLabel = elements.findIndex((element) => element.tagName === 'text');
        return {
          labels: elements.filter((element) => element.tagName === 'text').length,
          shapesAboveLabels: elements
            .slice(firstLabel)
            .filter((element) => element.tagName !== 'text').length,
          interactiveLabels: [...svg.querySelectorAll('text')].filter(
            (label) => getComputedStyle(label).pointerEvents !== 'none',
          ).length,
        };
      }),
    );
    expect(results).toHaveLength(13);
    for (const result of results) {
      expect(result.labels).toBeGreaterThan(0);
      expect(result.shapesAboveLabels).toBe(0);
      expect(result.interactiveLabels).toBe(0);
    }
  };
  await checkPaintOrder();
  const markersAboveLabels = await page.locator('#chart svg').evaluate((svg) => {
    const labels = svg.querySelector('[data-layer=labels]')!;
    const markers = svg.querySelector('[data-layer=markers]')!;
    return Boolean(labels.compareDocumentPosition(markers) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(markersAboveLabels).toBe(true);
  const chart = page.locator('#chart svg > g');
  const transform = await chart.getAttribute('transform');
  await page.locator('#chart circle[fill=transparent]').hover();
  await page.mouse.wheel(0, -160);
  await expect(chart).not.toHaveAttribute('transform', transform!);
  await checkPaintOrder();
  await page.screenshot({ path: 'test-results/label-layering.png', fullPage: true });
});
