import { expect, test } from '@playwright/test';
import { loadLibrary } from './library';

declare global {
  interface Window {
    appearanceChart: import('../../src').Smith;
    appearanceScales: import('../../src').SmithScales;
  }
}

test.beforeEach(async ({ page }) => {
  await page.setContent(
    '<div id="chart" style="width:500px;height:500px"></div><div id="scales" style="width:650px"></div><div id="other" style="width:320px;height:320px"></div>',
  );
  await loadLibrary(page);
});

test('live themes preserve chart state, focus, explicit styles, and other chart instances', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const { Smith, SmithScales, Complex } = window.SmithTest;
    const chart = (window.appearanceChart = new Smith());
    const scales = (window.appearanceScales = new SmithScales());
    chart.draw('#chart');
    scales.draw('#scales');
    const other = new Smith();
    other.draw('#other');
    const samples: import('../../src').TraceSamples = [
      { frequencyHz: 1e9, reflectionCoefficient: [0, 0] },
      { frequencyHz: 2e9, reflectionCoefficient: [0.4, 0.2] },
    ];
    chart.addMarker(chart.addTrace(samples));
    chart.addMarker(chart.addTrace(samples, { color: '#123456', visible: false }));
    const marker = chart.getTraces()[0].markers[0].id;
    chart.setMarkerSample(marker, 1);
    chart.layers.resistance.setStyle({
      stroke: 'purple',
      textFontFamily: 'Georgia',
      majorWidth: 2,
    });
    chart.layers.conductance.setVisible(true);
    chart.layers.reactance.setDetail('standard');
    chart.peripheralScales.update(Complex.from(0.4, 0.2));
    scales.update(Complex.from(0.4, 0.2));
    const svg = document.querySelector('#chart svg')!;
    svg.dispatchEvent(
      new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaY: -150,
        clientX: 250,
        clientY: 250,
      }),
    );
    chart.focusMarker(marker);
    const focused = document.activeElement;
    const elements = [...svg.querySelectorAll('*')];
    const view = svg.firstElementChild!.getAttribute('transform');
    const scaleReading = document.querySelector('#scales .scale-value')!.textContent;
    chart.setAppearance({
      theme: 'dark',
      overrides: {
        fontFamily: 'Arial',
        marker: { focusColor: 'yellow' },
        cursor: { impedanceColor: 'cyan' },
      },
    });
    scales.setAppearance({ theme: 'dark', overrides: { fontFamily: 'Arial' } });
    const style = (selector: string) => getComputedStyle(document.querySelector(selector)!);
    const themed = {
      background: style('#chart svg').backgroundColor,
      grid: style('#chart [data-layer=resistance] path').stroke,
      otherGrid: style('#chart [data-layer=reactance] path').stroke,
      font: style('#chart [data-label-layer=resistance]').fontFamily,
      scaleFont: style('#scales text').fontFamily,
      focus: style('#chart .marker-focus circle:last-child').stroke,
      cursor: style('#chart .smith-cursor > g:nth-of-type(2)').stroke,
      scaleText: style('#scales text').fill,
      otherBackground: style('#other svg').backgroundColor,
      otherColor: style('#other [data-layer=resistance] path').stroke,
      traceColors: chart.getTraces().map((t) => t.color),
      hidden: chart.getTraces()[1].visible,
      sameFocus: focused === document.activeElement,
      sameNodes: elements.every((node, i) => node === svg.querySelectorAll('*')[i]),
      sameView: view === svg.firstElementChild!.getAttribute('transform'),
      frequency: chart.getMarker(marker)!.frequencyHz,
      scaleReading: document.querySelector('#scales .scale-value')!.textContent === scaleReading,
      noPrivateMetadata: !('colorIndex' in chart.getTraces()[0]),
    };
    chart.addMarker(chart.addTrace(samples));
    const addedColor = chart.getTraces()[2].color;
    chart.setAppearance({});
    const resetColors = chart.getTraces().map((t) => t.color);
    const resetFocus = style('#chart .marker-focus circle:last-child').stroke;
    chart.setAppearance({ overrides: { traceColors: ['pink', 'teal'] } });
    const customColors = chart.getTraces().map((t) => t.color);
    return { themed, addedColor, resetColors, resetFocus, customColors };
  });
  expect(result.themed).toMatchObject({
    background: 'rgb(15, 23, 42)',
    grid: 'rgb(128, 0, 128)',
    otherGrid: 'rgb(148, 163, 184)',
    font: 'Georgia',
    scaleFont: 'Arial',
    focus: 'rgb(255, 255, 0)',
    cursor: 'rgb(0, 255, 255)',
    scaleText: 'rgb(226, 232, 240)',
    otherBackground: 'rgba(0, 0, 0, 0)',
    otherColor: 'rgb(100, 116, 139)',
    traceColors: ['#fb923c', '#123456'],
    hidden: false,
    sameFocus: true,
    sameNodes: true,
    sameView: true,
    frequency: 2e9,
    scaleReading: true,
    noPrivateMetadata: true,
  });
  expect(result.addedColor).toBe('#f87171');
  expect(result.resetColors).toEqual(['#ff7f0e', '#123456', '#d62728']);
  expect(result.resetFocus).toBe('rgb(29, 78, 216)');
  expect(result.customColors).toEqual(['pink', '#123456', 'pink']);
});

test('appearance validation is atomic and retained components reject changes after destruction', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const chart = new window.SmithTest.Smith({
      referenceImpedanceOhms: 50,
      appearance: { theme: 'dark' },
    });
    const scales = new window.SmithTest.SmithScales({ theme: 'dark' });
    chart.draw('#chart');
    scales.draw('#scales');
    const before = document.querySelector('#chart')!.innerHTML;
    const beforeScales = document.querySelector('#scales')!.innerHTML;
    let failures = 0;
    for (const component of [chart, scales]) {
      try {
        component.setAppearance({ theme: 'light', overrides: { cursor: { lineWidth: -1 } } });
      } catch {
        failures++;
      }
    }
    const unchanged =
      before === document.querySelector('#chart')!.innerHTML &&
      beforeScales === document.querySelector('#scales')!.innerHTML;
    chart.destroy();
    scales.destroy();
    for (const component of [chart, scales]) {
      try {
        component.setAppearance({ theme: 'light' });
      } catch {
        failures++;
      }
    }
    return { unchanged, failures };
  });
  expect(result).toEqual({ unchanged: true, failures: 4 });
});

test('dark SVG exports resolve theme tokens and include independent backgrounds', async ({
  page,
}) => {
  const exported = await page.evaluate(() => {
    const { Smith, SmithScales, Complex } = window.SmithTest;
    const appearance: import('../../src').SmithAppearance = {
      theme: 'dark',
      overrides: { fontFamily: 'Arial', scales: { indicatorColor: '#00ffff' } },
    };
    const chart = new Smith({ referenceImpedanceOhms: 50, appearance: appearance });
    const scales = new SmithScales(appearance);
    chart.draw('#chart');
    scales.draw('#scales');
    chart.addMarker(chart.addTrace([{ frequencyHz: 1e9, reflectionCoefficient: [0.4, 0.2] }]));
    scales.update(Complex.from(0.4, 0.2));
    return { chart: chart.toSvg(), scales: scales.toSvg() };
  });
  for (const svg of Object.values(exported)) {
    expect(svg).not.toContain('var(--smithkit');
    expect(svg).toContain('rgb(15, 23, 42)');
    expect(svg).toContain('Arial');
  }
  // Standalone images must paint the background even without application CSS.
  const colors = await page.evaluate(async (images) => {
    const output = [];
    for (const xml of Object.values(images)) {
      const image = new Image();
      image.src = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      // Fractional SVG heights can antialias the outer edge in WebKit; sample inside it.
      output.push([...context.getImageData(2, 2, 1, 1).data]);
      URL.revokeObjectURL(image.src);
    }
    return output;
  }, exported);
  expect(colors).toEqual([
    [15, 23, 42, 255],
    [15, 23, 42, 255],
  ]);
});

test('demo theme switch updates chart and scales without losing marker selection', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Load sample trace', exact: true }).click();
  await page.getByRole('tab', { name: 'Marker', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const selected = await page.locator('#marker-select').inputValue();
  await page.getByRole('button', { name: 'Chart settings', exact: true }).click();
  await page.getByLabel('Theme', { exact: true }).selectOption('dark');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('#smith svg')).toHaveCSS('background-color', 'rgb(15, 23, 42)');
  await expect(page.locator('#smith-scales .radial-scales')).toHaveCSS(
    'background-color',
    'rgb(15, 23, 42)',
  );
  await expect(page.locator('#marker-select')).toHaveValue(selected);
  await page.getByRole('button', { name: 'Focus on chart' }).click();
  await page.keyboard.press('End');
  await expect(page.locator('#marker-readout')).toContainText('2 GHz');
  await page.getByRole('button', { name: 'Chart settings', exact: true }).click();
  await page.getByLabel('Theme', { exact: true }).selectOption('light');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('#smith svg')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
});
