import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {patchStudioTemplateEntry, verifyStudioTemplateEntry, templateEntrySignatures} from '../scripts/patch-studio-template-entry.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const native = fs.readFileSync(path.join(root, 'node_modules/hyperframes/dist/cli.js'), 'utf8');
function fixture(t, source = templateEntrySignatures.map(([before]) => before).join('\n'), version = '0.8.77') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'torq-template-entry-'));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  fs.mkdirSync(path.join(dir, 'dist'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({version}));
  fs.writeFileSync(path.join(dir, 'dist/cli.js'), source);
  return dir;
}
test('patch is atomic, idempotent and verification requires both repairs', t => {
  const dir = fixture(t);
  assert.throws(() => verifyStudioTemplateEntry(dir), /missing/);
  assert.equal(patchStudioTemplateEntry(dir).changed, true);
  verifyStudioTemplateEntry(dir);
  const bytes = fs.readFileSync(path.join(dir, 'dist/cli.js'));
  assert.equal(patchStudioTemplateEntry(dir).changed, false);
  assert.deepEqual(fs.readFileSync(path.join(dir, 'dist/cli.js')), bytes);
});
test('unknown version, changed/duplicate signatures and partial repairs fail without mutation', t => {
  const original = templateEntrySignatures.map(([before]) => before).join('\n');
  for (const [source, version] of [
    [original, '0.8.78'], ['unknown', '0.8.77'],
    [original + templateEntrySignatures[0][0], '0.8.77'],
    [original.replace(...templateEntrySignatures[1]), '0.8.77'],
    [original.replace(templateEntrySignatures[1][0], 'changed'), '0.8.77']
  ]) {
    const dir = fixture(t, source, version);
    assert.throws(() => patchStudioTemplateEntry(dir));
    assert.equal(fs.readFileSync(path.join(dir, 'dist/cli.js'), 'utf8'), source);
  }
});

function section(source, start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert.ok(a >= 0 && b > a, `Native test extraction: ${start}`);
  return source.slice(a, b);
}
async function nativeHelpers(t) {
  // Evaluate the installed native DOM parser and exact helper functions, never the CLI entry point.
  const dir = fixture(t, native);
  patchStudioTemplateEntry(dir);
  const patched = fs.readFileSync(path.join(dir, 'dist/cli.js'), 'utf8');
  const parserEnd = native.indexOf('// ../core/dist/compiler/htmlDocument.js');
  assert.ok(parserEnd > 0);
  const helpers = native.slice(0, parserEnd)
    + section(native, 'function parseHTMLContent(html)', 'function lowerAscii(')
    + section(native, 'function getSingleMeaningfulChild(container)', 'var init_htmlTemplate =')
    + section(patched, 'function normalizeCompositionSrcPath(srcPath)', 'function explainStreamingEncodeGate(')
    + section(patched, 'function extractStandaloneEntryFromIndex(', 'function deVerifyFallbackTelemetry(')
    + '\ninit_esm10();\nexport {parseHTML, unwrapTemplate, extractStandaloneEntryFromIndex};\n';
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(dir, 'node_modules'), 'junction');
  fs.writeFileSync(path.join(dir, 'native-helpers.mjs'), helpers);
  return import(pathToFileURL(path.join(dir, 'native-helpers.mjs')).href);
}
test('native wrapped-template routing preserves ordinary HTML and excludes non-root templates', async t => {
  const {unwrapTemplate} = await nativeHelpers(t);
  const scene = '<div data-composition-id="scene" data-duration="8"></div>';
  for (const html of [`<template>${scene}</template>`, `<!doctype html><html><head></head><body><!-- native save --><template>${scene}</template></body></html>`]) {
    assert.equal(unwrapTemplate(html), scene);
  }
  for (const html of [
    '<!doctype html><html><body><div data-composition-id="main"></div></body></html>',
    `<html><body><div data-composition-id="main"><template>${scene}</template></div></body></html>`,
    `<html><body><div data-composition-id="main"></div><template>${scene}</template></body></html>`
  ]) assert.equal(unwrapTemplate(html), html);
});
test('neutral linked scenes extract at eight seconds with assets, source and local GSAP retained', async t => {
  const {parseHTML, unwrapTemplate, extractStandaloneEntryFromIndex} = await nativeHelpers(t);
  const fixtures=path.join(root,'tests/fixtures/native-templates');
  const master = fs.readFileSync(path.join(fixtures,'index.html'), 'utf8');
  for (const name of ['one-clear-outcome', 'compare-approaches']) {
    const entry = `compositions/${name}.html`;
    const original = fs.readFileSync(path.join(fixtures, entry), 'utf8');
    for (const scene of [original, original.replace('One clear outcome', 'QA saved title').replace('<body>', '<head></head><body>')]) {
      assert.notEqual(unwrapTemplate(scene), scene);
      const shell = extractStandaloneEntryFromIndex(master, entry, scene);
      const doc = parseHTML(shell).document;
      const outer = doc.querySelector('[data-composition-id]');
      assert.equal(outer.getAttribute('data-duration'), '8');
      assert.equal(outer.getAttribute('data-width'), '1920');
      assert.equal(outer.getAttribute('data-height'), '1080');
      assert.equal(outer.hasAttribute('data-no-timeline'), true);
      assert.equal(doc.querySelectorAll('[data-composition-src]').length, 1);
      const host = doc.querySelector('[data-composition-src]');
      assert.equal(host.getAttribute('data-composition-src'), entry);
      assert.equal(host.getAttribute('data-start'), '0');
      assert.equal(host.hasAttribute('data-no-timeline'), false);
      // Run the actual native readiness expression: only the generated shell opts out.
      const expression = native.match(/async function pollSubCompositionTimelines[\s\S]*?const expression = `([\s\S]*?)`;/)?.[1];
      assert.ok(expression, 'native timeline-readiness expression must be found');
      const ready = new Function('document', 'window', `return ${expression}`);
      assert.equal(ready(doc, {__timelines: {[name]: {}}}), true);
      assert.equal(ready(doc, {__timelines: {}}), false, 'missing scene timeline must still fail readiness');
      assert.equal(doc.querySelector('script[src]').getAttribute('src'), 'assets/gsap.min.js');
      assert.ok(fs.existsSync(path.join(root, 'node_modules/gsap/dist/gsap.min.js')));
      assert.ok(scene.includes(`window.__timelines['${name}']=tl`));
      assert.ok(scene.includes('assets/fixture.svg'));
      assert.ok(!shell.includes('window.__timelines.main='));
      assert.equal(fs.readFileSync(path.join(fixtures, entry), 'utf8'), original);
    }
  }
  assert.equal(extractStandaloneEntryFromIndex(master, 'compositions/missing.html', '<template></template>'), null);
});
