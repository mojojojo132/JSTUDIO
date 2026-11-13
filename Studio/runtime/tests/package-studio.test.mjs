import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { packageStudio } from '../scripts/package-studio.mjs';

async function fixture(t) {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'package-test-'));
  t.after(() => fs.rm(base, { recursive: true, force: true }));
  const workspace = path.join(base, 'workspace');
  const source = path.join(workspace, 'Studio');
  const put = async (name, content = 'fixture') => { const target = path.join(workspace, name); await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, content); };
  await put('Studio/STUDIO.json', JSON.stringify({ runtime: 'runtime', operations: '../Content/profile', library: '../Content/library', brands: '../Brands', projects: '../Content/projects', defaultBrand: { id: 'jstudio', version: '1.0.0' } }));
  const packageContent = JSON.stringify({ name: 'jstudio', scripts: { improve: 'node runtime/scripts/improvement-loop.mjs' } });
  await put('Studio/package.json', packageContent);
  for (const name of ['Studio/Launch JStudio.command', 'Studio/.agents/skills/director/SKILL.md', 'Studio/.agents/skills/director/references/continuous-improvement.md', 'Studio/.agents/skills/director/references/render-review.md', 'Studio/runtime/REFERENCE-BENCHMARK.md', 'Studio/runtime/IMPROVEMENT-VALIDATION.md', 'Studio/runtime/IMPROVEMENT-VALIDATION-DISPLAY-TARGET.md', 'Studio/runtime/package-lock.json', 'Studio/runtime/scripts/setup.mjs', 'Studio/runtime/scripts/improvement-loop.mjs', 'Studio/runtime/scripts/editor-lint.mjs', 'Studio/runtime/tests/editor-lint.test.mjs', 'Studio/runtime/tests/improvement-loop.test.mjs', 'Studio/runtime/licenses/LICENSE', 'Studio/runtime/vendor/engine/app/src/main.ts', 'Brands/jstudio/1.0.0/brand.json', 'Brands/jstudio/1.0.0/assets/logo.svg', 'Content/library/templates/VIDEO-BRIEF.md']) await put(name);
  for (const name of ['DEFAULTS', 'WORKFLOW', 'CREATIVE-DIRECTION', 'PLATFORM-EXPORTS']) await put(`Content/profile/${name}.md`);
  for (const name of ['Studio/runtime/node_modules/dependency/a.js', 'Studio/runtime/.runtime/state.json', 'Studio/runtime/vendor/engine/app/projects/private.txt', 'Studio/runtime/scripts/.env', 'Studio/runtime/scripts/private.key', 'Content/projects/private/script.md', 'Content/library/media/client.mp4', 'Content/profile/WORKFLOW 2.md', 'Studio/private.md']) await put(name, 'PRIVATE');
  return { base, source, put, packageContent, output: path.join(base, 'release') };
}

test('inventory excludes private content and dependencies; portable layout and checksums are explicit', async t => {
  const f = await fixture(t);
  await fs.symlink(path.join(f.base, 'workspace/Content/projects/private/script.md'), path.join(f.source, 'runtime/scripts/escape.md'));
  const result = await packageStudio(f);
  const names = result.files.map(x => x.path);
  assert(names.includes('Studio/.agents/skills/director/SKILL.md'));
  assert(names.includes('Studio/.agents/skills/director/references/continuous-improvement.md'));
  assert(names.includes('Studio/runtime/scripts/improvement-loop.mjs'));
  assert(names.includes('Studio/runtime/scripts/editor-lint.mjs'));
  assert(names.includes('Studio/runtime/tests/improvement-loop.test.mjs'));
  assert(names.includes('Studio/runtime/tests/editor-lint.test.mjs'));
  assert(names.includes('Studio/runtime/IMPROVEMENT-VALIDATION.md'));
  assert(names.includes('Studio/runtime/REFERENCE-BENCHMARK.md'));
  assert(names.includes('Studio/runtime/package-lock.json'));
  assert(names.includes('Studio/package.json'));
  assert.equal(JSON.parse(f.packageContent).scripts.improve, 'node runtime/scripts/improvement-loop.mjs');
  assert(names.includes('Studio Brand Packs/jstudio/1.0.0/assets/logo.svg'));
  assert(names.includes('Studio Content/default/profile/WORKFLOW.md'));
  assert(!names.some(x => /private|node_modules|\.runtime|escape|WORKFLOW 2|client\.mp4|\.env/.test(x)));
  assert(result.excluded.some(x => x.reason === 'symlink'));
  const digest = result.files.find(x => x.path === 'Studio/package.json').sha256;
  assert.equal(digest, crypto.createHash('sha256').update(f.packageContent).digest('hex'));
  assert.equal(JSON.parse(await fs.readFile(path.join(f.output, 'package-manifest.json'))).files.length, names.length);
  await assert.rejects(fs.access(path.join(f.output, 'JStudio.zip')));
});

test('rejects output inside workspace including through symlink', async t => {
  const f = await fixture(t);
  await assert.rejects(packageStudio({ ...f, output: path.join(f.source, 'release') }), /outside/);
  await fs.symlink(f.source, path.join(f.base, 'alias'));
  await assert.rejects(packageStudio({ ...f, output: path.join(f.base, 'alias/release') }), /outside/);
});

test('rejects selected source traversing a symlink', async t => {
  const f = await fixture(t);
  const skills = path.join(f.source, '.agents/skills');
  await fs.rename(skills, path.join(f.base, 'skills'));
  await fs.symlink(path.join(f.base, 'skills'), skills);
  await assert.rejects(packageStudio(f), /symlink/);
});

test('ZIP contains portable config, empty projects, matching bytes, and refuses overwrite', async t => {
  try { execFileSync('zip', ['-v'], { stdio: 'ignore' }); execFileSync('unzip', ['-v'], { stdio: 'ignore' }); } catch { t.skip('zip/unzip required'); return; }
  const f = await fixture(t);
  const manifest = await packageStudio({ ...f, zip: true });
  const archive = path.join(f.output, 'JStudio.zip');
  const extracted = path.join(f.base, 'extracted');
  execFileSync('unzip', ['-q', archive, '-d', extracted]);
  const config = JSON.parse(await fs.readFile(path.join(extracted, 'Studio/STUDIO.json')));
  assert.equal(config.projects, '../Studio Content/default/projects');
  assert.deepEqual(await fs.readdir(path.join(extracted, 'Studio Content/default/projects')), []);
  for (const file of manifest.files) assert.equal(crypto.createHash('sha256').update(await fs.readFile(path.join(extracted, file.path))).digest('hex'), file.sha256);
  await assert.rejects(packageStudio({ ...f, zip: true }), /overwrite/);
});

test('every pinned vendor file survives, including engineering project configs; untracked projects do not', async t => {
  const f = await fixture(t);
  const inventory = {};
  for (const relative of ['LICENSE', 'app/src/main.ts', 'app/projects/brand-showcase.json', 'app/projects/engineering-test.json']) {
    const content = relative.endsWith('.json') ? '{"fixture":true}' : 'pinned engine source';
    await f.put(`Studio/runtime/vendor/engine/${relative}`, content);
    inventory[relative] = crypto.createHash('sha256').update(content).digest('hex');
  }
  await f.put('Studio/runtime/vendor/engine/SOURCE-SHA256.json', JSON.stringify(inventory));
  await f.put('Studio/runtime/vendor/engine/untracked.txt', 'private');
  await f.put('Studio/PRODUCTION.md');
  await f.put('Studio/RESEARCH-REVIEW.md');
  await f.put('Studio/runtime/tests/smoke.test.mjs');
  const manifest = await packageStudio(f);
  const prefix = 'Studio/runtime/vendor/engine/';
  const payload = manifest.files.filter(file => file.path.startsWith(prefix));
  assert.deepEqual(payload.map(file => file.path.slice(prefix.length)).sort(), [...Object.keys(inventory), 'SOURCE-SHA256.json'].sort());
  for (const [relative, expected] of Object.entries(inventory)) assert.equal(payload.find(file => file.path === prefix + relative).sha256, expected);
  for (const name of ['Studio/PRODUCTION.md', 'Studio/RESEARCH-REVIEW.md', 'Studio/runtime/tests/smoke.test.mjs']) assert(manifest.files.some(file => file.path === name));
  await f.put('Studio/runtime/vendor/engine/app/projects/brand-showcase.json', 'tampered');
  await assert.rejects(packageStudio(f), /checksum mismatch/);
});

test('vendor inventory cannot pull files outside the payload', async t => {
  const f = await fixture(t);
  await f.put('Studio/runtime/vendor/engine/SOURCE-SHA256.json', JSON.stringify({ '../../private.md': '0'.repeat(64) }));
  await assert.rejects(packageStudio(f), /Unsafe vendor inventory/);
});
