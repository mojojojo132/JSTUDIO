import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {productionReadiness} from '../scripts/production-readiness.mjs';
import {reviewReadiness} from '../scripts/review-readiness.mjs';

async function fixture(t) {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'jstudio-production-readiness-'));
  t.after(() => fs.promises.rm(root, {recursive: true, force: true}));
  await fs.promises.mkdir(path.join(root, 'editor'), {recursive: true});
  await fs.promises.writeFile(path.join(root, 'PROJECT.json'), JSON.stringify({nativeProject: 'editor'}));
  await fs.promises.writeFile(path.join(root, 'BRIEF.md'), '# Video brief\n\n- Source material and provenance:\n- Voice, captions, and audio:\n- Audio strategy: narration/music/sound effects/silence, source, permission, availability, fallback and unresolved constraints:\n');
  await fs.promises.writeFile(path.join(root, 'STORYBOARD.md'), '# Storyboard\n\n| Scene / time | Viewer takeaway | Medium and source |\n|---|---|---|\n');
  return root;
}

function check(result, id) { return result.checks.find(item => item.id === id); }

test('empty template returns actionable needs-evidence states without creating approval', async t => {
  const root = await fixture(t), result = productionReadiness(root);
  assert.equal(check(result, 'source-provenance').state, 'needs-evidence');
  assert.equal(check(result, 'asset-rights-basis').state, 'needs-evidence');
  assert.equal(check(result, 'audio').state, 'needs-evidence');
  assert.equal(check(result, 'captions').state, 'needs-evidence');
  assert.match(check(result, 'audio').action, /Record the intended audio/);
  assert.match(result.notice, /never|approval/i);
  assert.deepEqual(reviewReadiness(root).production, result);
});

test('records and bounded audio/caption evidence stay explicitly unverified', async t => {
  const root = await fixture(t);
  await fs.promises.writeFile(path.join(root, 'BRIEF.md'), '# Video brief\n\n- Source material and provenance: City archive footage, original diagrams.\n- Voice, captions, and audio: Local narration with an SRT sidecar.\n- Audio strategy: Narration from a local voice, permission basis recorded in the project log, fallback is captions, no unresolved constraints.\n');
  await fs.promises.mkdir(path.join(root, 'editor/assets/captions'), {recursive: true});
  await fs.promises.mkdir(path.join(root, 'editor/assets/audio'), {recursive: true});
  await fs.promises.writeFile(path.join(root, 'editor/assets/captions/captions.srt'), '1\n00:00:00,000 --> 00:00:01,000\nWords\n');
  await fs.promises.writeFile(path.join(root, 'editor/assets/audio/voice.wav'), 'fixture bytes');
  await fs.promises.writeFile(path.join(root, 'editor/index.html'), '<main>composition</main>');
  const result = productionReadiness(root);
  assert.equal(check(result, 'source-provenance').state, 'record-found-unverified');
  assert.equal(check(result, 'asset-rights-basis').state, 'needs-evidence');
  assert.equal(check(result, 'captions').state, 'evidence-found-unverified');
  assert.equal(check(result, 'audio').state, 'evidence-found-unverified');
  assert.equal(check(result, 'captions').evidence[0].path, 'editor/assets/captions/captions.srt');
  assert.match(check(result, 'asset-rights-basis').action, /does not establish clearance/);
});

test('only an explicit plan can mark audio or captions not applicable', async t => {
  const root = await fixture(t);
  await fs.promises.writeFile(path.join(root, 'BRIEF.md'), '# Video brief\n\n- Source material and provenance: Original diagrams.\n- Voice, captions, and audio: No captions are needed for this silent visual.\n- Audio strategy: Silent, no audio.\n');
  const result = productionReadiness(root);
  assert.equal(check(result, 'captions').state, 'declared-not-applicable-unverified');
  assert.equal(check(result, 'audio').state, 'declared-not-applicable-unverified');
});

test('asset discovery stays within named audio and caption directories', async t => {
  const root = await fixture(t);
  await fs.promises.mkdir(path.join(root, 'media/audio/nested'), {recursive: true});
  await fs.promises.writeFile(path.join(root, 'media/audio/nested/hidden.mp3'), 'bytes');
  await fs.promises.writeFile(path.join(root, 'BRIEF.md'), '# Video brief\n\n- Voice, captions, and audio: Voice intended.\n- Audio strategy: Narration expected.\n');
  assert.equal(check(productionReadiness(root), 'audio').state, 'plan-found-asset-not-discovered');
});

test('free-form source and rights records are discovered but blank table headings are not evidence',async t=>{
 const root=await fixture(t);
 assert.equal(check(productionReadiness(root),'storyboard-source-cues').state,'needs-evidence');
 await fs.promises.writeFile(path.join(root,'SOURCES.md'),'# Sources\n\n| Asset | Basis |\n|---|---|\n| diagram | Original drawing owned by creator; verify specific usage |\n');
 const result=productionReadiness(root);
 assert.equal(check(result,'source-provenance').state,'record-found-unverified');
 assert.equal(check(result,'asset-rights-basis').state,'evidence-found-unverified');
 assert.ok(check(result,'asset-rights-basis').evidence.some(e=>e.path==='SOURCES.md'));
});

test('omitting music does not declare narration or all audio inapplicable',async t=>{
 const root=await fixture(t);await fs.promises.writeFile(path.join(root,'BRIEF.md'),'- Audio strategy: Narration without music.\n');
 assert.equal(check(productionReadiness(root),'audio').state,'plan-found-asset-not-discovered');
});

test('asset discovery refuses a symlink in an ancestor of a named directory',async t=>{
 const root=await fixture(t),outside=await fs.promises.mkdtemp(path.join(os.tmpdir(),'external-audio-'));t.after(()=>fs.promises.rm(outside,{recursive:true,force:true}));
 await fs.promises.mkdir(path.join(outside,'audio'));await fs.promises.writeFile(path.join(outside,'audio','private.wav'),'private');await fs.promises.symlink(outside,path.join(root,'media'));
 assert.equal(check(productionReadiness(root),'audio').evidence.length,1); // brief only, never the external asset
 assert.ok(!JSON.stringify(productionReadiness(root)).includes('private.wav'));
});
