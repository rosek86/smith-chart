import { expect, test } from '@playwright/test';
import { loadLibrary } from './library';

for (const captionsVisible of [true, false]) {
  for (const tickLabelsVisible of [true, false]) {
    test(`peripheral captions=${captionsVisible}, values=${tickLabelsVisible} persist through lifecycle and export`, async ({
      page,
    }) => {
      await page.setContent(
        '<div id="chart" style="width:600px;height:600px"></div><div id="next" style="width:360px;height:360px"></div>',
      );
      await loadLibrary(page);
      const result = await page.evaluate(
        async ({ captionsVisible, tickLabelsVisible }) => {
          const { Smith, Complex } = window.SmithTest;
          const chart = new Smith({
            peripheralScales: { visible: true, captionsVisible, tickLabelsVisible },
          });
          chart.draw('#chart');
          const counts = () => {
            const visible = (selector: string) =>
              [...document.querySelectorAll(selector)].filter(
                (node) => getComputedStyle(node).display !== 'none',
              ).length;
            return {
              captions: visible('.peripheral-caption'),
              numbers: visible('.peripheral-tick-label'),
              boundaries: document.querySelectorAll('.peripheral-boundary').length,
              ticks: document.querySelectorAll('[data-layer=peripheral-scales] line').length,
            };
          };
          const before = counts();
          chart.peripheralScales.setVisible(false);
          chart.setOptions({ grid: { labelsVisible: false } });
          chart.peripheralScales.setVisible(true);
          chart.setAppearance({ theme: 'dark' });
          chart.peripheralScales.update(Complex.from(0.4, 0.3));
          chart.resetView();
          chart.draw('#next');
          await new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          );
          const after = counts();
          const exported = new DOMParser().parseFromString(chart.toSvg(), 'image/svg+xml');
          const exportedTexts = [...exported.querySelectorAll('text')];
          // Export removes CSS classes, so match texts by their unchanged geometry/content.
          const signature = (text: Element) =>
            [
              text.textContent,
              text.getAttribute('x'),
              text.getAttribute('y'),
              text.getAttribute('transform'),
            ].join('|');
          const exportMatches = [
            ...document.querySelectorAll('[data-label-layer=peripheral-scales] text'),
          ].every((text) => {
            const copy = exportedTexts.find((node) => signature(node) === signature(text));
            return (
              copy &&
              (copy.style.display === 'none') === (getComputedStyle(text).display === 'none')
            );
          });
          const indicators = document.querySelectorAll(
            '.peripheral-indicator:not([visibility=hidden])',
          ).length;
          // A patch changes only the supplied field and leaves rulers/indicators intact.
          chart.setOptions({ peripheralScales: { captionsVisible: !captionsVisible } });
          const patched = counts();
          chart.peripheralScales.setTickLabelsVisible(!tickLabelsVisible);
          const direct = counts();
          chart.peripheralScales.setCaptionsVisible(captionsVisible);
          const restoredCaptions = counts().captions;
          const controls = chart.peripheralScales;
          chart.destroy();
          let destroyed = 0;
          for (const change of [
            () => controls.setCaptionsVisible(true),
            () => controls.setTickLabelsVisible(true),
          ]) {
            try {
              change();
            } catch {
              destroyed++;
            }
          }
          return {
            before,
            after,
            exportMatches,
            indicators,
            patched,
            direct,
            restoredCaptions,
            destroyed,
          };
        },
        { captionsVisible, tickLabelsVisible },
      );
      expect(result.before).toMatchObject({
        captions: captionsVisible ? 4 : 0,
        numbers: tickLabelsVisible ? (captionsVisible ? 147 : 171) : 0,
        boundaries: 3,
      });
      expect(result.before.ticks).toBeGreaterThan(800);
      expect(result.after).toEqual(result.before);
      expect(result.exportMatches).toBe(true);
      expect(result.indicators).toBe(4);
      expect(result.patched.numbers).toBe(tickLabelsVisible ? (captionsVisible ? 171 : 147) : 0);
      expect(result.patched.captions).toBe(captionsVisible ? 0 : 4);
      expect(result.direct.numbers).toBe(tickLabelsVisible ? 0 : captionsVisible ? 171 : 147);
      expect(result.restoredCaptions).toBe(captionsVisible ? 4 : 0);
      expect(result.destroyed).toBe(2);
    });
  }
}

test('invalid peripheral label options reject entire patches and direct setter changes', async ({
  page,
}) => {
  await page.setContent('<div id="chart" style="width:500px;height:500px"></div>');
  await loadLibrary(page);
  const result = await page.evaluate(() => {
    const chart = new window.SmithTest.Smith({ peripheralScales: { visible: true } });
    chart.draw('#chart');
    let rejected = 0;
    for (const key of ['captionsVisible', 'tickLabelsVisible'] as const) {
      for (const value of [null, 'false', 0]) {
        const options = {
          peripheralScales: { visible: false, [key]: value },
        } as unknown as import('../../src').SmithOptions;
        const setter =
          key === 'captionsVisible'
            ? chart.peripheralScales.setCaptionsVisible
            : chart.peripheralScales.setTickLabelsVisible;
        for (const operation of [
          () => new window.SmithTest.Smith(options),
          () => chart.setOptions(options),
          () => setter(value as unknown as boolean),
        ]) {
          try {
            operation();
          } catch (error) {
            if (error instanceof TypeError) {
              rejected++;
            }
          }
        }
      }
    }
    const visible =
      document.querySelector('[data-layer=peripheral-scales]')!.getAttribute('opacity') !== '0';
    const captions = [...document.querySelectorAll('.peripheral-caption')].every(
      (node) => getComputedStyle(node).display !== 'none',
    );
    chart.destroy();
    return { rejected, visible, captions };
  });
  expect(result).toEqual({ rejected: 18, visible: true, captions: true });
});

test('demo toggles peripheral captions and numbers independently and remembers them while hidden', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Chart settings', exact: true }).click();
  const captions = page.getByLabel('Axis captions', { exact: true });
  const values = page.getByLabel('Tick values', { exact: true });
  await captions.uncheck();
  await expect(page.locator('.peripheral-caption').first()).toBeHidden();
  await expect(page.locator('.peripheral-caption-sector').first()).toBeVisible();
  await values.uncheck();
  await expect(page.locator('.peripheral-tick-label').first()).toBeHidden();
  await expect(page.locator('.peripheral-boundary').first()).toBeVisible();
  await page.locator('#peripheral-scales').uncheck();
  await expect(captions).toBeDisabled();
  await expect(values).toBeDisabled();
  await page.locator('#peripheral-scales').check();
  await expect(captions).not.toBeChecked();
  await expect(values).not.toBeChecked();
  await captions.check();
  await expect(page.locator('.peripheral-caption').first()).toBeVisible();
  await expect(page.locator('.peripheral-tick-label').first()).toBeHidden();
  await page.screenshot({ path: 'test-results/peripheral-label-settings.png' });
});
