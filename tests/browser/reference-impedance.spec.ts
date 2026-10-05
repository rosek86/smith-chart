import { expect, test } from '@playwright/test';
import { loadLibrary } from './library';

test('chart renormalization preserves physical Z, marker samples, identity, and visibility', async ({
  page,
}) => {
  await page.setContent('<div id="chart"></div>');
  await loadLibrary(page);
  const result = await page.evaluate(async () => {
    const { Smith, SmithEventType } = window.SmithTest;
    const chart = new Smith(50);
    chart.draw('#chart');
    const trace = chart.addTrace(
      [
        { frequencyHz: 1, reflectionCoefficient: [0, 0] },
        { frequencyHz: 2, reflectionCoefficient: [0.5, 0] },
      ],
      { name: 'DUT', color: '#123456', visible: false },
    );
    const marker = chart.addMarker(trace, 1)!;
    const before = chart.getMarker(marker)!;
    const events: number[] = [];
    chart.onEvent((event) => {
      if (event.type === SmithEventType.Marker) {
        events.push(event.data.impedanceOhms!.re);
      }
    });
    chart.renormalize(75);
    await new Promise((resolve) => setTimeout(resolve, 20));
    const after = chart.getMarker(marker)!;
    const metadata = chart.getTraces()[0];
    const reference = chart.referenceImpedanceOhms;
    chart.destroy();
    let destroyed = false;
    try {
      chart.renormalize(50);
    } catch {
      destroyed = true;
    }
    return {
      before: { id: before.markerId, z: before.impedanceOhms!.re },
      after: {
        id: after.markerId,
        z: after.impedanceOhms!.re,
        sample: after.sampleIndex,
        frequency: after.frequencyHz,
        gamma: after.reflectionCoefficient.re,
      },
      metadata: { name: metadata.name, color: metadata.color, visible: metadata.visible },
      reference,
      events,
      destroyed,
    };
  });
  expect(result.reference).toBe(75);
  expect(result.after.id).toBe(result.before.id);
  expect(result.after.z).toBeCloseTo(result.before.z, 12);
  expect(result.after.gamma).toBeCloseTo(1 / 3, 13);
  expect(result.after).toMatchObject({ sample: 1, frequency: 2 });
  expect(result.metadata).toEqual({ name: 'DUT', color: '#123456', visible: false });
  expect(result.events.some((value) => Math.abs(value - 150) < 1e-10)).toBe(true);
  expect(result.destroyed).toBe(true);
});

test('a singular trace rejects the complete chart change without partial mutations', async ({
  page,
}) => {
  await page.setContent('<div id="chart"></div>');
  await loadLibrary(page);
  const result = await page.evaluate(() => {
    const chart = new window.SmithTest.Smith(50);
    chart.draw('#chart');
    chart.addTrace([{ frequencyHz: 1, reflectionCoefficient: [0, 0] }]);
    chart.addTrace([{ frequencyHz: 1, reflectionCoefficient: [5, 0] }]);
    const marker = chart.getTraces()[0].markers[0].id;
    let rejected = false;
    try {
      chart.renormalize(75);
    } catch {
      rejected = true;
    }
    const reference = chart.referenceImpedanceOhms;
    const gamma = chart.getMarker(marker)!.reflectionCoefficient.re;
    chart.clearTraces();
    let invalid = false;
    try {
      chart.renormalize(0);
    } catch {
      invalid = true;
    }
    chart.destroy();
    return { rejected, reference, gamma, invalid };
  });
  expect(result).toEqual({ rejected: true, reference: 50, gamma: 0, invalid: true });
});

test('demo explicitly converts imported references and retains physical readouts after changing Z0', async ({
  page,
}) => {
  await page.goto('./');
  const file = {
    name: '75-ohm.s1p',
    mimeType: 'text/plain',
    buffer: Buffer.from('# GHz S RI R 75\n1 0 0\n2 0.5 0'),
  };
  await page.locator('#file').setInputFiles(file);
  await page.getByRole('tab', { name: 'Marker', exact: true }).click();
  await expect(page.locator('#parameter-impedance')).toHaveText('75.000 + 0.000i');
  await expect(page.locator('#parameter-gamma')).toHaveText('0.200 + 0.000i');
  await expect(page.locator('#file-status')).toContainText('converted to 50 Ω');
  await page.locator('#reference-impedance').fill('75');
  await page.locator('#apply-reference').click();
  await expect(page.locator('#reference-value')).toHaveText('Z₀ = 75 Ω');
  await expect(page.locator('#parameter-impedance')).toHaveText('75.000 + 0.000i');
  // Floating-point round trips may format a signed zero.
  await expect(page.locator('#parameter-gamma')).toHaveText(/^-?0\.000 [+-] 0\.000i\s*$/);
  await page.locator('#reference-impedance').fill('0');
  await page.locator('#apply-reference').click();
  await expect(page.locator('#reference-value')).toHaveText('Z₀ = 75 Ω');
  await expect(page.locator('#reference-impedance')).toHaveValue('75');
  await page.locator('#renormalize-import').uncheck();
  await page
    .locator('#file')
    .setInputFiles({ ...file, name: '50-ohm.s1p', buffer: Buffer.from('# GHz S RI R 50\n1 0 0') });
  await expect(page.locator('#file-status')).toHaveAttribute('data-error', 'true');
  await expect(page.locator('.trace-controls')).toHaveCount(1);
  await expect(page.locator('#parameter-impedance')).toHaveText('75.000 + 0.000i');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
