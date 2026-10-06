import { expect, it } from 'vitest';
// @ts-expect-error Release tooling is JavaScript executed directly by Node.js.
import { isPublished } from '../scripts/release-status.mjs';

const manifest = { name: 'smithkit', version: '0.1.0', integrity: 'sha512-example' };
const fetchMetadata = (status: number, body: unknown) => async () =>
  new Response(JSON.stringify(body), { status });

it('allows a new version and recognizes only an identical published archive', async () => {
  expect(await isPublished(manifest, fetchMetadata(404, { error: 'Not found' }))).toBe(false);
  expect(
    await isPublished(
      manifest,
      fetchMetadata(200, { ...manifest, dist: { integrity: manifest.integrity } }),
    ),
  ).toBe(true);
});

it('rejects different contents and registry errors instead of treating them as a new version', async () => {
  await expect(
    isPublished(
      manifest,
      fetchMetadata(200, { ...manifest, dist: { integrity: 'sha512-different' } }),
    ),
  ).rejects.toThrow('different contents');
  await expect(isPublished(manifest, fetchMetadata(503, {}))).rejects.toThrow('HTTP 503');
  await expect(
    isPublished(manifest, async () => {
      throw new Error('Network unavailable');
    }),
  ).rejects.toThrow('Network unavailable');
});
