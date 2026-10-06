import { expect, test } from '@playwright/test';
import { loadLibrary } from './library';

test('static charts adapt label density to available space without changing the grid', async ({
  page,
}, testInfo) => {
  await page.setContent('<div id="chart" style="width:240px;height:240px"></div>');
  await loadLibrary(page);
  const results = await page.evaluate(async () => {
    const chart = new window.SmithTest.Smith();
    chart.setZoomEnabled(false);
    chart.draw('#chart');
    const host = document.getElementById('chart')!;
    const results = [];
    for (const size of [240, 320, 500, 900, 240]) {
      host.style.width = host.style.height = `${size}px`;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const svg = host.querySelector('svg')!;
      const viewport = svg.getBoundingClientRect();
      const labels = [...svg.querySelectorAll<SVGTextElement>('[data-layer=labels] text')].filter(
        (label) => {
          for (let node: Element | null = label; node && node !== svg; node = node.parentElement) {
            const style = getComputedStyle(node);
            if (
              style.visibility === 'hidden' ||
              style.opacity === '0' ||
              style.display === 'none'
            ) {
              return false;
            }
          }
          return true;
        },
      );
      const boxes = labels.map((label) => label.getBoundingClientRect());
      const numericBoxes = labels
        .filter((label) => !label.querySelector('textPath'))
        .map((label) => label.getBoundingClientRect());
      let collisions = 0;
      numericBoxes.forEach((a, index) =>
        numericBoxes.slice(index + 1).forEach((b) => {
          if (
            a.left < b.right + 1.9 &&
            a.right + 1.9 > b.left &&
            a.top < b.bottom + 1.9 &&
            a.bottom + 1.9 > b.top
          ) {
            collisions++;
          }
        }),
      );
      results.push({
        size,
        count: labels.length,
        collisions,
        inside: boxes.every(
          (box) =>
            box.left >= viewport.left &&
            box.right <= viewport.right &&
            box.top >= viewport.top &&
            box.bottom <= viewport.bottom,
        ),
        minimumFont: Math.min(
          ...labels.map((label) => {
            const matrix = label.getScreenCTM()!;
            return parseFloat(getComputedStyle(label).fontSize) * Math.hypot(matrix.a, matrix.b);
          }),
        ),
        match: labels.some(
          (label) => label.closest('[data-label-layer=resistance]') && label.textContent === '1.0',
        ),
        paths: svg.querySelectorAll('[data-layer=resistance] path').length,
        captions: labels
          .filter((label) => label.querySelector('textPath'))
          .map((label) => label.textContent),
        svg: chart.toSvg(),
      });
    }
    chart.destroy();
    return results;
  });
  for (const result of results) {
    expect(result).toMatchObject({ collisions: 0, inside: true, match: true });
    expect(result.minimumFont).toBeGreaterThanOrEqual(8.99);
    expect(result.count).toBeGreaterThan(15);
    expect(result.paths).toBe(results[0].paths);
  }
  expect(results[0].count).toBeLessThan(results[3].count);
  expect(results[4].count).toBe(results[0].count);
  expect(results[0].captions).toContain('TRANSMISSION · °');
  expect(results[3].captions).toHaveLength(4);
  expect(results[3].captions).toContain('WAVELENGTHS TOWARD GENERATOR →');
  for (const result of [results[0], results[2], results[3]]) {
    await testInfo.attach(`chart-${result.size}.svg`, {
      body: result.svg,
      contentType: 'image/svg+xml',
    });
  }
});

test('layout reacts to layer visibility, text styling, zoom and reset', async ({ page }) => {
  await page.setContent('<div id="chart" style="width:320px;height:320px"></div>');
  await loadLibrary(page);
  const result = await page.evaluate(async () => {
    const chart = new window.SmithTest.Smith();
    chart.draw('#chart');
    const svg = document.querySelector<SVGSVGElement>('svg')!;
    const visible = () =>
      [...svg.querySelectorAll<SVGTextElement>('[data-layer=labels] text')].filter((label) => {
        for (let node: Element | null = label; node && node !== svg; node = node.parentElement) {
          const style = getComputedStyle(node);
          if (style.opacity === '0' || style.visibility === 'hidden' || style.display === 'none') {
            return false;
          }
        }
        return true;
      });
    const initial = visible().map((label) => label.outerHTML);
    chart.layers.conductance.setVisible(true);
    chart.layers.susceptance.setVisible(true);
    chart.layers.resistance.setStyle({ textFontFamily: 'monospace', textFontSize: 18 });
    const boxes = visible()
      .filter((label) => !label.querySelector('textPath'))
      .map((label) => label.getBoundingClientRect());
    const collisions = boxes.flatMap((a, i) =>
      boxes
        .slice(i + 1)
        .filter(
          (b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top,
        ),
    ).length;
    chart.layers.resistance.setVisible(false);
    chart.layers.reactance.setVisible(false);
    const admittance = visible().some((label) => label.closest('[data-label-layer=conductance]'));
    chart.layers.conductance.setVisible(false);
    chart.layers.susceptance.setVisible(false);
    chart.layers.resistance.setStyle({ textFontFamily: 'Verdana', textFontSize: 7 });
    chart.layers.resistance.setVisible(true);
    chart.layers.reactance.setVisible(true);
    const restored = visible().map((label) => label.outerHTML);
    chart.peripheralScales.setVisible(false);
    const noPeripheral = visible().every(
      (label) => !label.closest('[data-label-layer=peripheral-scales]'),
    );
    chart.peripheralScales.setVisible(true);
    svg.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: -450,
        clientX: 160,
        clientY: 160,
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 200));
    const zoomed = visible().map((label) => label.outerHTML);
    chart.resetView();
    const reset = visible().map((label) => label.outerHTML);
    chart.destroy();
    return { initial, restored, zoomed, reset, collisions, admittance, noPeripheral };
  });
  expect(result).toMatchObject({ collisions: 0, admittance: true, noPeripheral: true });
  expect(result.restored).toEqual(result.initial);
  expect(result.zoomed).toEqual(result.initial);
  expect(result.reset).toEqual(result.initial);
});

test('successive zoom frames and reset preserve labels, including after a zoomed resize', async ({
  page,
}) => {
  await page.setContent('<div id="chart" style="width:320px;height:320px"></div>');
  await loadLibrary(page);
  const result = await page.evaluate(async () => {
    const chart = new window.SmithTest.Smith();
    chart.draw('#chart');
    const host = document.getElementById('chart')!;
    const svg = host.querySelector('svg')!;
    const layout = () =>
      [...svg.querySelectorAll('[data-layer=labels] text')].map((text) => ({
        text: text.textContent,
        hidden: text.getAttribute('visibility'),
        font: text.getAttribute('style'),
      }));
    const frame = () =>
      new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await frame();
    const initial = layout();
    const frames = [];
    const transforms = [];
    for (const deltaY of [-120, -120, -120, 120, 120]) {
      svg.dispatchEvent(
        new WheelEvent('wheel', {
          deltaY,
          clientX: 160,
          clientY: 160,
          bubbles: true,
          cancelable: true,
          view: window,
        }),
      );
      await frame();
      frames.push(layout());
      transforms.push(
        svg.querySelector('[data-layer=labels]')!.parentElement!.getAttribute('transform'),
      );
    }
    host.style.width = host.style.height = '500px';
    await frame();
    const resized = layout();
    chart.resetView();
    const reset = layout();
    chart.destroy();
    return { initial, frames, transforms, resized, reset };
  });
  for (const frame of result.frames) {
    expect(frame).toEqual(result.initial);
  }
  expect(new Set(result.transforms).size).toBeGreaterThan(2);
  expect(result.resized).not.toEqual(result.initial);
  expect(result.reset).toEqual(result.resized);
});
