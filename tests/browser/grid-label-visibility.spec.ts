import { expect, test } from '@playwright/test';
import { loadLibrary } from './library';

test('grid labels toggle independently and preserve their preference through updates and export', async ({
  page,
}) => {
  await page.setContent('<div id="chart" style="width:600px;height:600px"></div>');
  await loadLibrary(page);
  const result = await page.evaluate(() => {
    const chart = new window.SmithTest.Smith();
    // Layer controls also work before mounting.
    chart.layers.resistance.setLabelsVisible(false);
    chart.draw('#chart');
    const initiallyHidden = getComputedStyle(
      document.querySelector('[data-label-layer=resistance]')!,
    ).display;
    chart.layers.resistance.setLabelsVisible(true);
    const states = (['resistance', 'reactance', 'conductance', 'susceptance'] as const).map(
      (name) => {
        const layer = chart.layers[name];
        layer.setVisible(true);
        const geometry = document.querySelector(`[data-layer=${name}]`)!;
        const labels = document.querySelector(`[data-label-layer=${name}]`)!;
        const originalGeometry = geometry.outerHTML;
        layer.setLabelsVisible(false);
        const unchangedGeometry = originalGeometry === geometry.outerHTML;
        const otherLabels = [...document.querySelectorAll('[data-label-layer]')]
          .filter((group) => group !== labels)
          .every((group) => getComputedStyle(group).display !== 'none');
        layer.setDetail('basic');
        layer.setStyle({ textColor: '#123456' });
        chart.setAppearance({ theme: 'dark' });
        layer.setVisible(false);
        layer.setVisible(true);
        const staysHidden = getComputedStyle(labels).display === 'none';
        const exported = new DOMParser().parseFromString(chart.toSvg(), 'image/svg+xml');
        const exportedHidden =
          exported.querySelector<SVGElement>(`[data-label-layer=${name}]`)!.style.display ===
          'none';
        // Enabling labels must not reveal an explicitly hidden layer.
        layer.setVisible(false);
        layer.setLabelsVisible(true);
        const layerStaysHidden = getComputedStyle(labels).opacity === '0';
        layer.setVisible(true);
        const restored = getComputedStyle(labels).display !== 'none';
        const basicLabels = [...labels.querySelectorAll('text')].filter(
          (text) => getComputedStyle(text).display !== 'none',
        );
        const visibleLabels = basicLabels.filter(
          (text) => getComputedStyle(text).visibility !== 'hidden',
        ).length;
        const textColor = getComputedStyle(basicLabels[0]).fill;
        layer.setDetail('detailed');
        return {
          name,
          unchangedGeometry,
          otherLabels,
          staysHidden,
          exportedHidden,
          layerStaysHidden,
          restored,
          basicLabels: basicLabels.length,
          visibleLabels,
          textColor,
        };
      },
    );
    chart.destroy();
    let destroyedRejected = false;
    try {
      chart.layers.resistance.setLabelsVisible(false);
    } catch {
      destroyedRejected = true;
    }
    return { initiallyHidden, states, destroyedRejected };
  });
  expect(result.initiallyHidden).toBe('none');
  expect(result.destroyedRejected).toBe(true);
  for (const state of result.states) {
    expect(state).toMatchObject({
      unchangedGeometry: true,
      otherLabels: true,
      staysHidden: true,
      exportedHidden: true,
      layerStaysHidden: true,
      restored: true,
      basicLabels: state.name === 'resistance' || state.name === 'conductance' ? 6 : 10,
      textColor: 'rgb(18, 52, 86)',
    });
    expect(state.visibleLabels).toBeGreaterThan(0);
  }
});

test('demo checkbox controls all grid labels across detail, visibility, zoom, and resize changes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('./');
  const checkbox = page.getByRole('checkbox', { name: 'Grid labels', exact: true });
  await expect(checkbox).toBeChecked();
  await checkbox.uncheck();
  const groups = page
    .locator('[data-label-layer]')
    .filter({ has: page.locator('[data-basic-label]') });
  await expect(groups).toHaveCount(4);
  await page.getByLabel('Grid detail').selectOption('basic');
  await page.getByLabel('Impedance', { exact: true }).uncheck();
  await page.getByLabel('Admittance', { exact: true }).check();
  await page.locator('#theme').selectOption('dark');
  await page.locator('#smith').hover();
  await page.mouse.wheel(0, -100);
  await page.setViewportSize({ width: 1100, height: 800 });
  for (const group of await groups.all()) {
    await expect(group).toHaveCSS('display', 'none');
  }
  await expect(page.locator('[data-label-layer=peripheral-scales]')).not.toHaveCSS(
    'display',
    'none',
  );
  await expect(page.locator('[data-layer=conductance]')).not.toHaveAttribute('opacity', '0');
  await checkbox.check();
  for (const group of await groups.all()) {
    await expect(group).not.toHaveCSS('display', 'none');
  }
  await expect(page.locator('[data-label-layer=resistance]')).toHaveAttribute('opacity', '0');
  await expect(page.locator('[data-label-layer=conductance]')).not.toHaveAttribute('opacity', '0');
  await page.getByRole('button', { name: 'Reset view' }).click();
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.screenshot({ path: 'test-results/grid-label-visibility-demo.png' });
});
