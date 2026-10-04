import { expect, test } from '@playwright/test';
import { loadLibrary } from './library';

test('peripheral indicators share marker selection and follow chart zoom', async ({ page }) => {
  await page.goto('./');
  const rings = page.locator('#smith [data-layer=peripheral-scales]');
  await expect(rings.locator('[data-scale]')).toHaveCount(4);
  await page.locator('#file').setInputFiles({
    name: 'phase.s1p',
    mimeType: 'text/plain',
    buffer: Buffer.from('# GHz S RI R 50\n1 0 0.5'),
  });
  await page.getByRole('tab', { name: 'Marker', exact: true }).click();
  const dot = (id: string) => rings.locator(`[data-scale=${id}] .peripheral-indicator`);
  await expect(dot('reflection-phase')).toHaveAttribute('data-value', '90');
  await expect(dot('wavelengths-generator')).toHaveAttribute('data-value', '0.125');
  await expect(dot('wavelengths-load')).toHaveAttribute('data-value', '0.375');
  expect(Number(await dot('transmission-phase').getAttribute('data-value'))).toBeCloseTo(
    26.565051177,
  );
  expect(Number(await dot('transmission-phase').getAttribute('cx'))).toBeCloseTo(250 + 250 * 0.6);
  expect(Number(await dot('transmission-phase').getAttribute('cy'))).toBeCloseTo(250 - 250 * 0.8);
  const before = await dot('reflection-phase').boundingBox();
  const surface = page.locator('#smith circle[fill=transparent]');
  await surface.hover();
  await page.mouse.wheel(0, -160);
  await expect.poll(() => dot('reflection-phase').boundingBox()).not.toEqual(before);
  await expect(dot('reflection-phase')).toHaveAttribute('data-value', '90');
  await page.getByRole('button', { name: 'Reset view' }).click();
  await expect.poll(() => dot('reflection-phase').boundingBox()).toEqual(before);

  await page.getByRole('tab', { name: 'Cursor', exact: true }).click();
  await surface.dispatchEvent('pointerleave');
  for (const indicator of await rings.locator('.peripheral-indicator').all()) {
    await expect(indicator).toHaveAttribute('visibility', 'hidden');
  }
});

test('peripheral scales hide undefined angles and invalid input', async ({ page }) => {
  await page.setContent('<div id="chart"></div>');
  await loadLibrary(page);
  const result = await page.evaluate(() => {
    const { Smith, Complex } = window.SmithTest;
    const chart = new Smith();
    chart.draw('#chart');
    const scales = chart.PeripheralScales;
    const visible = () =>
      [...document.querySelectorAll('.peripheral-indicator')]
        .filter((dot) => dot.getAttribute('visibility') !== 'hidden')
        .map((dot) => dot.parentElement!.getAttribute('data-scale'));
    scales.update(Complex.zero());
    const center = visible();
    scales.update(Complex.from(-1));
    const short = visible();
    const invalid = [null, Complex.from(1.1), Complex.from(NaN), Complex.from(Infinity)].map(
      (gamma) => {
        scales.update(gamma);
        return visible();
      },
    );
    scales.hide();
    const hidden = scales.Node!.getAttribute('opacity');
    scales.show();
    const shown = scales.Node!.getAttribute('opacity');
    chart.destroy();
    return {
      center,
      short,
      invalid,
      hidden,
      shown,
      remaining: document.querySelectorAll('svg').length,
    };
  });
  expect(result).toEqual({
    center: ['transmission-phase'],
    short: ['reflection-phase', 'wavelengths-load', 'wavelengths-generator'],
    invalid: [[], [], [], []],
    hidden: '0',
    shown: null,
    remaining: 0,
  });
});

test('cursor dots follow all twelve scales, including voltage and current transmission', async ({
  page,
}) => {
  await page.goto('./');
  const svg = page.locator('#smith svg');
  const dots = page.locator('#smith-scales .scale-indicator');
  await expect(dots).toHaveCount(12);
  await expect(dots.first()).toHaveAttribute('visibility', 'hidden');
  const surface = svg.locator('circle[fill=transparent]');
  for (const [re, im] of [
    [0, 0],
    [0.5, 0],
    [-0.5, 0],
    [0, 0.5],
  ]) {
    await surface.evaluate(
      (node, [real, imaginary]) => {
        const box = node.getBoundingClientRect();
        node.dispatchEvent(
          new PointerEvent('pointermove', {
            clientX: box.x + box.width * (0.5 + real / 2),
            clientY: box.y + box.height * (0.5 - imaginary / 2),
          }),
        );
      },
      [re, im],
    );
    await expect(dots.first()).not.toHaveAttribute('visibility', 'hidden');
    await expect(async () => {
      const positions = await dots.evaluateAll((nodes) =>
        nodes.map((node) => Number(node.getAttribute('data-position'))),
      );
      for (const position of positions.slice(0, 10)) {
        expect(position).toBeCloseTo(Math.hypot(re, im), 2);
      }
      expect(positions[10]).toBeCloseTo(Math.hypot(1 + re, im) / 2, 2);
      expect(positions[11]).toBeCloseTo(Math.hypot(1 - re, im) / 2, 2);
    }).toPass();
  }
  await expect(page.getByRole('heading', { name: 'Cursor', exact: true })).toHaveCount(0);
  const readout = page.locator('.scales-panel #parameter-readout');
  await expect(readout).toContainText('Z · Ω');
  await expect(readout).toContainText('Y · mS');
  await expect(readout.locator('#parameter-impedance')).toHaveText('30.000 + 40.000i');
  await expect(readout.locator('#parameter-admittance')).toHaveText('12.000 - 16.000i');
  await expect(page.locator('[data-scale=vswr] .scale-value')).toHaveText('3 : 1');
  await expect(page.locator('[data-scale=return-loss] .scale-value')).toHaveText('6.021 dB');
  await expect(page.locator('[data-scale=mismatch-loss] .scale-value')).toHaveText('1.249 dB');
  await page.screenshot({ path: 'test-results/cursor-scales.png', fullPage: true });
  await surface.dispatchEvent('pointerleave');
  await expect(page.locator('#parameter-gamma')).toHaveText('—');
  for (const value of await page.locator('.scale-value').all()) {
    await expect(value).toHaveText('—');
  }
  for (const dot of await dots.all()) {
    await expect(dot).toHaveAttribute('visibility', 'hidden');
  }
});

test('zoom and pan affect only the Smith chart; wheel over scales does not zoom it', async ({
  page,
}) => {
  await page.goto('./');
  const svg = page.locator('#smith svg');
  const chart = svg.locator(':scope > g');
  const axes = page.locator('#smith-scales svg');
  const before = await axes.evaluateAll((nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        transform: node.getAttribute('transform'),
      };
    }),
  );
  const box = (await svg.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const initial = await chart.getAttribute('transform');
  await page.mouse.wheel(0, -240);
  await expect(chart).not.toHaveAttribute('transform', initial!);
  const zoomed = await chart.getAttribute('transform');
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 20, { steps: 3 });
  await page.mouse.up();
  await expect(chart).not.toHaveAttribute('transform', zoomed!);
  const after = await axes.evaluateAll((nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        transform: node.getAttribute('transform'),
      };
    }),
  );
  expect(after).toEqual(before);
  const panned = await chart.getAttribute('transform');
  await axes.first().scrollIntoViewIfNeeded();
  await axes.first().hover();
  await page.mouse.wheel(0, -100);
  await expect(chart).toHaveAttribute('transform', panned!);
});

test('independent scale components handle boundaries, invalid input, mounting and destruction', async ({
  page,
}) => {
  await page.setContent(
    '<div id="one" style="width:640px"></div><div id="two" style="width:320px"></div>',
  );
  await loadLibrary(page);
  const result = await page.evaluate(() => {
    const { SmithScales, Complex } = window.SmithTest;
    const first = new SmithScales();
    const second = new SmithScales();
    first.draw('#one');
    first.draw('#one');
    second.draw(document.getElementById('two')!);
    const count = document.querySelectorAll('.radial-scales').length;
    const positions = () =>
      [...document.querySelectorAll('#one circle')].map((node) =>
        Number(node.getAttribute('data-position')),
      );
    first.update(Complex.from(-1));
    const negative = positions();
    first.update(Complex.one());
    const positive = positions();
    const geometry = [...document.querySelectorAll('#one circle')].every((node) =>
      Number.isFinite(Number(node.getAttribute('cx'))),
    );
    const endpoints = document.querySelector('#one [data-scale=vswr]')?.getAttribute('aria-label');
    const hidden = [];
    for (const gamma of [null, Complex.from(1.1), Complex.from(NaN), Complex.from(Infinity)]) {
      first.update(gamma);
      hidden.push(
        [...document.querySelectorAll('#one circle')].every(
          (node) => node.getAttribute('visibility') === 'hidden',
        ),
      );
    }
    let missing = false;
    try {
      first.draw('#missing');
    } catch {
      missing = true;
    }
    first.destroy();
    first.destroy();
    let disposed = false;
    try {
      first.update(Complex.zero());
    } catch {
      disposed = true;
    }
    second.update(Complex.zero());
    const remaining = document.querySelectorAll('.radial-scales').length;
    const otherVisible = document.querySelector('#two circle')?.getAttribute('visibility') === null;
    second.destroy();
    return {
      count,
      negative,
      positive,
      geometry,
      endpoints,
      hidden,
      missing,
      disposed,
      remaining,
      otherVisible,
    };
  });
  expect(result).toEqual({
    count: 2,
    negative: [...Array(10).fill(1), 0, 1],
    positive: [...Array(10).fill(1), 1, 0],
    geometry: true,
    endpoints: 'VSWR: ∞ : 1',
    hidden: [true, true, true, true],
    missing: true,
    disposed: true,
    remaining: 1,
    otherVisible: true,
  });
});

test('leaving the chart cancels queued cursor updates before they can restore dots', async ({
  page,
}) => {
  await page.setContent(
    '<div id="chart" style="width:500px;height:500px"></div><div id="scales"></div>',
  );
  await loadLibrary(page);
  const result = await page.evaluate(async () => {
    const { Smith, SmithScales, SmithEventType } = window.SmithTest;
    const chart = new Smith();
    const scales = new SmithScales();
    chart.draw('#chart');
    scales.draw('#scales');
    const events: boolean[] = [];
    chart.setUserActionHandler((event) => {
      if (event.type === SmithEventType.Cursor) {
        events.push(Boolean(event.data));
        scales.update(event.data?.reflectionCoefficient ?? null);
      }
    });
    const surface = document.querySelector<SVGCircleElement>('#chart circle[fill=transparent]')!;
    const box = surface.getBoundingClientRect();
    surface.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: box.x + box.width / 2,
        clientY: box.y + box.height / 2,
      }),
    );
    surface.dispatchEvent(new PointerEvent('pointerleave'));
    await new Promise((resolve) => setTimeout(resolve, 20));
    const hidden = [...document.querySelectorAll('#scales circle')].every(
      (node) => node.getAttribute('visibility') === 'hidden',
    );
    chart.destroy();
    scales.destroy();
    return { events, hidden };
  });
  expect(result).toEqual({ events: [false], hidden: true });
});

test('demo throttles continuous movement and cancels pending updates on leave or tab selection', async ({
  page,
}) => {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await page.goto('./');
  const surface = page.locator('#smith circle[fill=transparent]');
  const move = async (re: number) => {
    await surface.evaluate((node, value) => {
      const box = node.getBoundingClientRect();
      node.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: box.x + box.width * (0.5 + value / 2),
          clientY: box.y + box.height / 2,
        }),
      );
    }, re);
  };
  const value = page.locator('[data-scale=vswr] .scale-value');
  await move(0.25);
  await page.clock.runFor(20);
  await move(0.5);
  await expect(value).toHaveText('—');
  await page.clock.runFor(14);
  await expect(value).toHaveText('3 : 1');
  await expect(page.locator('#parameter-gamma')).toHaveText('0.500 + 0.000i');

  await move(0.2);
  await page.clock.runFor(20);
  await expect(value).toHaveText('3 : 1');
  await move(0);
  await page.clock.runFor(14);
  await expect(value).toHaveText('1 : 1');

  await move(0.2);
  await page.clock.runFor(3);
  await surface.dispatchEvent('pointerleave');
  await expect(value).toHaveText('—');
  await page.clock.runFor(50);
  await expect(value).toHaveText('—');

  await move(0.5);
  await page.clock.runFor(3);
  await page.locator('#marker-tab').evaluate((tab) => (tab as HTMLButtonElement).click());
  await expect(page.locator('#marker-readout')).toBeVisible();
  await expect(value).toHaveText('—');
  await page.clock.runFor(50);
  await expect(value).toHaveText('—');
});
