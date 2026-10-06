import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** A retry can skip publication only when the registry has the identical archive. */
export async function isPublished(manifest, fetchMetadata = fetch) {
  const url = `https://registry.npmjs.org/${encodeURIComponent(manifest.name)}/${encodeURIComponent(manifest.version)}`;
  const response = await fetchMetadata(url);
  if (response.status === 404) {
    return false;
  }
  assert.ok(response.ok, `Registry check failed: HTTP ${response.status}`);
  const published = await response.json();
  assert.equal(published.name, manifest.name);
  assert.equal(published.version, manifest.version);
  assert.equal(
    published.dist?.integrity,
    manifest.integrity,
    'This version exists with different contents. Publish a new version instead.',
  );
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const directory = resolve(process.argv[2] ?? 'artifacts');
  const manifest = JSON.parse(readFileSync(join(directory, 'release-manifest.json'), 'utf8'));
  assert.equal(manifest.name, 'smithkit');
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.equal(manifest.archive, `smithkit-${manifest.version}.tgz`);
  const archive = readFileSync(join(directory, manifest.archive));
  assert.equal(createHash('sha256').update(archive).digest('hex'), manifest.sha256);
  assert.equal(
    `sha512-${createHash('sha512').update(archive).digest('base64')}`,
    manifest.integrity,
  );
  const published = await isPublished(manifest);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `published=${published}\narchive=${manifest.archive}\n`,
    );
  }
  console.log(
    published
      ? 'The identical archive is already published; skipping publication.'
      : 'This version is not published.',
  );
}
