import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';

it('publishes first and subsequent builds without rewriting master or retaining stale assets', () => {
  const root = mkdtempSync(join(tmpdir(), 'smith-pages-test-'));
  const origin = join(root, 'origin.git');
  const target = join(root, 'target');
  const build = join(root, 'build');
  const git = (...args: string[]) =>
    execFileSync('git', args, {
      cwd: target,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  const commit = (message: string) =>
    git('-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-m', message);
  const deploy = () =>
    execFileSync('bash', [resolve('scripts/deploy-pages.sh'), build, target], { stdio: 'pipe' });
  try {
    mkdirSync(target);
    mkdirSync(build);
    git('init', '--bare', origin);
    git('init', '-b', 'master');
    git('remote', 'add', 'origin', origin);
    writeFileSync(join(target, 'index.html'), 'Legacy Angular app');
    git('add', '.');
    commit('Legacy app');
    git('push', 'origin', 'master');
    const originalMaster = git('rev-parse', 'master');
    writeFileSync(join(build, 'index.html'), 'New demo');
    writeFileSync(join(build, 'old.js'), 'first bundle');
    deploy();
    expect(git('branch', '--show-current')).toBe('gh-pages');
    expect(readFileSync(join(target, 'index.html'), 'utf8')).toBe('New demo');
    expect(readFileSync(join(target, '.nojekyll'), 'utf8')).toBe('');
    writeFileSync(join(target, 'CNAME'), 'example.com');
    git('add', 'CNAME');
    commit('Custom domain');
    git('push', 'origin', 'gh-pages');
    const beforeUpdate = git('rev-parse', 'HEAD');
    rmSync(join(build, 'old.js'));
    writeFileSync(join(build, 'new.js'), 'second bundle');
    deploy();
    expect(git('ls-tree', '--name-only', 'HEAD')).not.toContain('old.js');
    expect(readFileSync(join(target, 'new.js'), 'utf8')).toBe('second bundle');
    expect(readFileSync(join(target, 'CNAME'), 'utf8')).toBe('example.com');
    expect(git('rev-parse', 'HEAD^')).toBe(beforeUpdate);
    const current = git('rev-parse', 'HEAD');
    deploy();
    expect(git('rev-parse', 'HEAD')).toBe(current);
    expect(git('ls-remote', 'origin', 'refs/heads/master').split(/\s/)[0]).toBe(originalMaster);
    writeFileSync(join(target, 'uncommitted.txt'), 'keep');
    expect(deploy).toThrow();
    expect(readFileSync(join(target, 'uncommitted.txt'), 'utf8')).toBe('keep');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
