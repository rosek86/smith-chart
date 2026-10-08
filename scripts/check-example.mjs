import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { basename, extname, join, resolve } from 'node:path';
import { chromium, webkit, expect } from '@playwright/test';

const repo = resolve(import.meta.dirname, '..');
const temp = mkdtempSync(join(tmpdir(), 'smithkit-example-'));
const run = (command, args, cwd = temp) =>
  execFileSync(command, args, { cwd, encoding: 'utf8', timeout: 120_000 });
let server;
try {
  const archive = process.argv[2]
    ? resolve(process.argv[2])
    : join(
        temp,
        JSON.parse(run('npm', ['pack', '--json', '--pack-destination', temp], repo))[0].filename,
      );
  const app = join(temp, 'app');
  cpSync(join(repo, 'examples'), app, {
    recursive: true,
    filter: (path) => !['node_modules', 'dist', 'package-lock.json'].includes(basename(path)),
  });
  const manifest = JSON.parse(readFileSync(join(app, 'package.json'), 'utf8'));
  manifest.dependencies.smithkit = `file:${archive}`;
  writeFileSync(join(app, 'package.json'), JSON.stringify(manifest));
  run('npm', ['install', '--prefer-offline', '--ignore-scripts', '--no-audit', '--no-fund'], app);
  run(join(repo, 'node_modules/.bin/tsc'), ['--project', 'tsconfig.json'], app);
  run('npm', ['run', 'build'], app);

  // Serve only files from the consumer's built output, never the repository sources.
  const files = new Map();
  const collect = (directory, prefix = '') => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const name = `${prefix}/${entry.name}`;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        collect(path, name);
      } else {
        files.set(name, readFileSync(path));
      }
    }
  };
  collect(join(app, 'dist'));
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
  server = createServer((request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    const name = path === '/' ? '/index.html' : path;
    const content = files.get(name);
    response.writeHead(content ? 200 : 404, {
      'content-type': mime[extname(name)] ?? 'application/octet-stream',
    });
    response.end(content ?? 'Not found');
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const url = `http://127.0.0.1:${server.address().port}/`;
  for (const engine of [chromium, webkit]) {
    const browser = await engine.launch(
      engine === chromium && process.env.PLAYWRIGHT_CHANNEL
        ? { channel: process.env.PLAYWRIGHT_CHANNEL }
        : {},
    );
    try {
      const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${url}basic/index.html`);
      await expect(page.locator('#chart svg')).toHaveCount(1);
      await expect(page.locator('#reading')).toContainText('1.5 GHz');
      const first = await page.locator('#reading').textContent();
      await page.getByRole('button', { name: 'Replace sweep' }).click();
      await expect(page.locator('#reading')).not.toHaveText(first);
      await expect(page.locator('#reading')).toContainText('1.5 GHz');
      await page.getByLabel('Compact chart').check();
      await expect.poll(async () => (await page.locator('#chart').boundingBox()).width).toBe(360);
      await expect
        .poll(
          async () =>
            (await page.locator('[data-role=samples] circle').first().boundingBox()).width,
        )
        .toBeCloseTo(4, 1);
      for (let i = 0; i < 3; i++) {
        await page.getByRole('button', { name: 'Unmount chart', exact: true }).click();
        await expect(page.locator('#chart svg')).toHaveCount(0);
        await expect(page.locator('#reading')).toHaveText('No chart mounted.');
        await expect(page.getByRole('button', { name: 'Replace sweep' })).toBeDisabled();
        await page.getByRole('button', { name: 'Mount chart', exact: true }).click();
        await expect(page.locator('#chart svg')).toHaveCount(1);
        await expect(page.locator('#reading')).toContainText('1.5 GHz');
      }
      await page.getByRole('button', { name: 'Mount chart', exact: true }).click();
      await expect(page.locator('#chart svg')).toHaveCount(1);
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.locator('html').evaluate((node) => node.scrollWidth), 390);
      await page.setViewportSize({ width: 900, height: 900 });
      await page.goto(url);
      await expect(page.getByRole('heading', { name: 'One example, one task.' })).toBeVisible();
      for (const example of ['static', 'markers', 'appearance', 'export']) {
        await page.goto(`${url}${example}/index.html`);
        await expect(page.locator('#chart svg')).toHaveCount(1);
        await expect(page.locator('#source')).toContainText("from 'smithkit'");
        if (example === 'markers') {
          await page.locator('#sample').fill('2');
          await expect(page.locator('#reading')).toContainText('1.5 GHz');
        }
        if (example === 'appearance') {
          await page.locator('#theme').selectOption('dark');
        }
        if (example === 'export') {
          const download = page.waitForEvent('download');
          await page.getByRole('button', { name: 'Download SVG' }).click();
          assert.equal((await download).suggestedFilename(), 'smithkit-report.svg');
        }
      }
      assert.deepEqual(errors, []);
      console.log(
        `Verified installed consumer in ${engine.name()}: mount, update, events, resize, destroy, remount, mobile, and integration gallery.`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  if (server?.listening) {
    await new Promise((resolve) => server.close(resolve));
  }
  rmSync(temp, { recursive: true, force: true });
}
