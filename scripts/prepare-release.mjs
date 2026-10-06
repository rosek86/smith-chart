import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const run = (command, args, options = {}) =>
  execFileSync(command, args, {
    cwd: repo,
    encoding: 'utf8',
    stdio: 'inherit',
    ...options,
  });
const git = (...args) => run('git', args, { stdio: 'pipe' }).trim();
assert.equal(
  git('status', '--porcelain'),
  '',
  'Commit source changes before preparing a release archive.',
);
const manifest = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8'));
assert.equal(manifest.name, 'smithkit');
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
const commit = git('rev-parse', 'HEAD');
run('npm', ['run', 'check']);
run('npm', ['run', 'test:e2e']);
const webkitEnv = { ...process.env };
delete webkitEnv.PLAYWRIGHT_CHANNEL;
run('npm', ['run', 'test:e2e:webkit'], { env: webkitEnv });
const directory = join(repo, 'artifacts');
mkdirSync(directory, { recursive: true });
// check already built the library; pack it once, then test this exact archive.
const [packed] = JSON.parse(
  run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', directory], {
    stdio: 'pipe',
  }),
);
const archive = join(directory, packed.filename);
run('npm', ['run', 'check:package', '--', archive]);
run('npm', ['run', 'check:example', '--', archive]);
assert.equal(
  git('rev-parse', 'HEAD'),
  commit,
  'The checked-out commit changed during verification.',
);
assert.equal(git('status', '--porcelain'), '', 'Source files changed during verification.');
const report = {
  name: packed.name,
  version: packed.version,
  commit,
  archive: packed.filename,
  sha256: createHash('sha256').update(readFileSync(archive)).digest('hex'),
  integrity: packed.integrity,
  size: packed.size,
  unpackedSize: packed.unpackedSize,
  verified: ['source', 'chromium', 'webkit', 'package-consumer', 'standalone-example'],
};
writeFileSync(join(directory, 'release-manifest.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Prepared ${packed.filename} from ${commit}. No publication performed.`);
