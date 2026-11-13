import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildProductionPacket, resolveProductionProject} from '../scripts/production.mjs';

function fixture(t, manifest = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-production-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.writeFileSync(path.join(root, 'PROJECT.json'), JSON.stringify(manifest));
  fs.writeFileSync(path.join(root, 'AGENTS.md'), 'Authoritative project instructions.');
  fs.writeFileSync(path.join(root, 'BRIEF.md'), 'Explain the energy transition.');
  fs.writeFileSync(path.join(root, 'STORYBOARD.md'), 'A connected visual journey.');
  return root;
}

test('all roles have explicit contracts and bounded deterministic context', t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, 'BRIEF.md'), 'Detailed brief. '.repeat(1000));
  for (const role of ['Director', 'Animator', 'Editor', 'Reviewer']) {
    const packet = buildProductionPacket(root, role, 1000);
    assert.equal(packet.role, role);
    assert.ok(packet.contract.dependencies.length);
    assert.ok(packet.contract.outputs.length);
    assert.ok(packet.contract.nextAction);
    assert.ok(packet.context.files.reduce((sum, file) => sum + (file.text?.length ?? 0), 0) <= 1000);
    assert.equal(packet.context.files.find(file => file.path === 'BRIEF.md').truncated, true);
    assert.deepEqual(packet, buildProductionPacket(root, role, 1000));
    assert.match(packet.execution, /no model calls/);
  }
});

test('Director declares output display targets and Reviewer records exact-candidate readability at that size', t => {
  const root = fixture(t);
  const director = buildProductionPacket(root, 'Director');
  const reviewer = buildProductionPacket(root, 'Reviewer');
  assert.match(director.contract.outputs.join(' '), /minimum rendered player width/);
  assert.match(director.contract.nextAction, /viewing context and minimum player width/);
  assert.match(reviewer.contract.nextAction, /exact candidate at the declared minimum display width/);
  assert.match(reviewer.contract.nextAction, /readable\/unreadable outcomes/);
  assert.match(reviewer.contract.acceptance.join(' '), /Required claims and disclaimers checked at the target width/);
});

test('respects configured handoff paths and reports unavailable records without inferring approval', t => {
  const root = fixture(t, {nativeProject: 'edit', animationProject: 'motion', workflow: {ledger: 'reviews/ledger.json', exchange: 'edit/mapping.json'}});
  const packet = buildProductionPacket(root, 'editor');
  assert.equal(packet.paths.editor, 'edit');
  assert.ok(packet.missingRecords.some(record => record.path === 'reviews/ledger.json'));
  assert.match(packet.authority, /Read exact decision records/);
  assert.equal(packet.approved, undefined);
});

test('changed source changes its fingerprint while unchanged files retain theirs', t => {
  const root = fixture(t);
  const before = buildProductionPacket(root);
  fs.appendFileSync(path.join(root, 'STORYBOARD.md'), '\nStronger opening.');
  const after = buildProductionPacket(root);
  const hash = (packet, name) => packet.context.files.find(file => file.path === name).sha256;
  assert.notEqual(hash(before, 'STORYBOARD.md'), hash(after, 'STORYBOARD.md'));
  assert.equal(hash(before, 'BRIEF.md'), hash(after, 'BRIEF.md'));
});

test('rejects traversal, absolute and symlink escaping manifest paths', t => {
  for (const nativeProject of ['../outside', '/tmp/outside']) {
    const root = fixture(t, {nativeProject});
    assert.throws(() => buildProductionPacket(root), /relative|escapes/);
  }
  const root = fixture(t, {nativeProject: 'escape/not-yet-created'});
  fs.symlinkSync(os.tmpdir(), path.join(root, 'escape'));
  assert.throws(() => buildProductionPacket(root), /Symlink escapes/);
});

test('refuses external and dangling source symlinks', t => {
  const root = fixture(t);
  fs.unlinkSync(path.join(root, 'BRIEF.md'));
  fs.symlinkSync(path.join(os.tmpdir(), 'nonexistent-studio-brief'), path.join(root, 'BRIEF.md'));
  assert.throws(() => buildProductionPacket(root), /Dangling/);
  fs.unlinkSync(path.join(root, 'BRIEF.md'));
  fs.symlinkSync(os.tmpdir(), path.join(root, 'BRIEF.md'));
  assert.throws(() => buildProductionPacket(root), /Symlink escapes/);
});

test('configured project lookup rejects traversal and external project symlinks', t => {
  const root = fixture(t);
  fs.mkdirSync(path.join(root, 'runtime'));
  fs.mkdirSync(path.join(root, 'projects'));
  fs.mkdirSync(path.join(root, 'projects', 'film'));
  fs.writeFileSync(path.join(root, 'STUDIO.json'), JSON.stringify({projects: 'projects'}));
  assert.equal(resolveProductionProject(path.join(root, 'runtime'), 'film'), fs.realpathSync(path.join(root, 'projects', 'film')));
  assert.throws(() => resolveProductionProject(path.join(root, 'runtime'), '../film'), /slug/);
  fs.symlinkSync(os.tmpdir(), path.join(root, 'projects', 'escape'));
  assert.throws(() => resolveProductionProject(path.join(root, 'runtime'), 'escape'), /escapes/);
});

test('Director handoffs receive open shared learnings and review coverage from the configured Studio',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'studio-learning-handoff-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const studio=path.join(root,'Studio'),runtime=path.join(studio,'runtime'),projects=path.join(root,'Content/projects'),operations=path.join(root,'Content/profile'),project=path.join(projects,'bond-film');
  fs.mkdirSync(runtime,{recursive:true});fs.mkdirSync(project,{recursive:true});fs.mkdirSync(operations,{recursive:true});
  fs.writeFileSync(path.join(studio,'STUDIO.json'),JSON.stringify({runtime:'runtime',projects:'../Content/projects',operations:'../Content/profile'}));
  fs.writeFileSync(path.join(project,'PROJECT.json'),'{}');fs.writeFileSync(path.join(project,'AGENTS.md'),'Project rules.');
  fs.writeFileSync(path.join(operations,'STUDIO-IMPROVEMENTS.json'),JSON.stringify({schemaVersion:1,createdAt:'now',updatedAt:'now',runs:[],decisions:[],issues:[{id:'SI-0123456789ab',key:'studio:review-coverage:transition-checks',scope:'studio',category:'review-coverage',priority:'P1',state:'accepted',title:'Check text through transitions',owner:'JStudio',occurrences:3,firstSeenAt:'now',lastSeenAt:'now',acceptance:['Transition frames are sampled'],observations:[{recommendedChange:'Add transition-aware review samples'}]}]}));
  const packet=buildProductionPacket(project,'Director',8000,runtime);
  assert.equal(packet.systemImprovements.openItems.length,1);assert.equal(packet.systemImprovements.openItems[0].id,'SI-0123456789ab');
  assert.equal(packet.systemImprovements.coverage.runs,0);assert.match(packet.systemImprovements.instruction,/exact-artifact QA/);
  assert.equal(buildProductionPacket(project,'Reviewer',8000,runtime).systemImprovements,null);
});

test('validates role, budget and manifest type', t => {
  const root = fixture(t);
  assert.throws(() => buildProductionPacket(root, 'Publisher'), /Role/);
  assert.throws(() => buildProductionPacket(root, 'Director', 999), /maxChars/);
  assert.throws(() => buildProductionPacket(root, 'Director', NaN), /maxChars/);
  fs.writeFileSync(path.join(root, 'PROJECT.json'), 'null');
  assert.throws(() => buildProductionPacket(root), /object/);
});

test('role packets expose visual decisions and invalid plans honestly without breaking legacy projects',t=>{
 const root=fixture(t);assert.equal(buildProductionPacket(root).visualProduction.status,'not-planned');
 fs.writeFileSync(path.join(root,'VIDEO-PLAN.json'),JSON.stringify({schemaVersion:1,beats:[{id:'demo',startSeconds:0,durationSeconds:5,intent:'demonstrate-interface',takeaway:'Open the export controls',visualBrief:'Record the actual export menu and click sequence',authenticity:'required',available:{screenCapture:true}}]}));
 for(const role of ['Director','Animator','Editor','Reviewer']){const p=buildProductionPacket(root,role);assert.equal(p.visualProduction.status,'planned');assert.equal(p.visualProduction.plan.beats[0].route,'screen-recording');}
 fs.writeFileSync(path.join(root,'VIDEO-PLAN.json'),'{}');assert.equal(buildProductionPacket(root).visualProduction.status,'invalid');
});


test('large visual plans remain bounded in role packets and direct the host to full jobs',t=>{
 const root=fixture(t),beats=Array.from({length:30},(_,i)=>({id:'beat-'+i,startSeconds:i*5,durationSeconds:5,intent:'explain-mechanism',takeaway:'Show the source-backed relationship '+i,visualBrief:'Reveal a meaningful visual cause and effect with editable elements',authenticity:'illustrative'}));
 fs.writeFileSync(path.join(root,'VIDEO-PLAN.json'),JSON.stringify({schemaVersion:1,beats}));
 const p=buildProductionPacket(root,'Director',1000);assert.equal(p.visualProduction.status,'planned');assert.equal(p.visualProduction.truncated,true);assert.ok(p.visualProduction.excerpt.length<=500);assert.equal(p.visualProduction.beatCount,30);assert.match(p.visualProduction.action,/full jobs/);
});
