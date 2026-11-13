import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildStageContext } from './stage-context.mjs';
test('bounded stage excerpts preserve source hashes and explicitly mark partial approval history', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage-context-'));
  try {
    fs.writeFileSync(path.join(dir, 'INTERACTION-LOG.md'), 'approved old version\n' + 'x'.repeat(3000) + '\nrecent revision');
    fs.writeFileSync(path.join(dir, 'PROJECT.json'), '{}');
    const packet = buildStageContext(dir, 'animation', 1000);
    const log = packet.files.find(f => f.path === 'INTERACTION-LOG.md');
    assert.equal(log.truncated, true);
    assert.equal(log.excerptLocation, 'tail');
    assert.ok(log.text.endsWith('recent revision'));
    assert.equal(log.sha256.length, 64);
    assert.ok(packet.files.reduce((n, f) => n + (f.text?.length ?? 0), 0) <= 1000);
    assert.equal(packet.files.find(f => f.path === 'STORYBOARD.md').status, 'missing');
    assert.throws(() => buildStageContext(dir, 'unknown'));
    assert.throws(() => buildStageContext(dir, 'review', 0));
  } finally { fs.rmSync(dir, { recursive: true }); }
});
test('does not follow project files into other client folders', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage-context-'));
  try {
    fs.mkdirSync(path.join(dir, 'project'));
    fs.writeFileSync(path.join(dir, 'private.md'), 'private');
    fs.symlinkSync(path.join(dir, 'private.md'), path.join(dir, 'project', 'STORYBOARD.md'));
    const packet = buildStageContext(path.join(dir, 'project'), 'review');
    assert.equal(packet.files.find(f => f.path === 'STORYBOARD.md').status, 'outside-project');
    assert.ok(!JSON.stringify(packet).includes('"text":"private"'));
  } finally { fs.rmSync(dir, { recursive: true }); }
});
test('stage packets have deterministic role-scoped content hashes and identify changed inputs',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'stage-context-'));
  try{
    fs.writeFileSync(path.join(dir,'STORYBOARD.md'),'Bridge becomes a dated promise.');
    const first=buildStageContext(dir,'animation'),again=buildStageContext(dir,'animation');
    assert.equal(first.role,'Animator');assert.equal(first.snapshotId,again.snapshotId);
    assert.match(first.snapshotId,/^stage-context-sha256:[a-f0-9]{64}$/);
    assert.equal(first.manifest.find(f=>f.path==='STORYBOARD.md').sha256.length,64);
    assert.match(first.reuse,/does not measure or claim model token savings/);
    assert.notEqual(first.snapshotId,buildStageContext(dir,'review').snapshotId);
    fs.writeFileSync(path.join(dir,'STORYBOARD.md'),'Bridge explains coupon dates.');
    assert.notEqual(first.snapshotId,buildStageContext(dir,'animation').snapshotId);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
