import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildRunReport, writeRunReport, unavailableRunInput, renderRunReportMarkdown } from '../scripts/run-report.mjs';
const entry = (id, participantId = 'parent') => ({ id, participantId, model: 'test-model', stage: 'direction', attempt: 1,
  source: { kind: 'provider-usage', reference: 'explicit-fixture.json', recordId: id },
  tokens: { input: 100, cachedInput: 40, output: 20, reasoningOutput: 10, total: 120 } });
const fixture = () => ({ schemaVersion: 1, runId: 'test-run', startedAt: '2026-10-11T00:00:00Z', endedAt: '2026-10-11T00:00:03Z',
  participantInventoryComplete: true, measurementScopeComplete: true, participants: [{ id: 'parent', role: 'director' }, { id: 'child', role: 'reviewer' }], entries: [entry('p'), entry('c', 'child')] });
test('aggregates parent and child once; subset counts never inflate total', () => {
  const report = buildRunReport(fixture());
  assert.equal(report.tokens.total.total, 240);
  assert.equal(report.tokens.input.total, 200);
  assert.equal(report.tokens.cachedInput.total, 80);
  assert.equal(report.tokens.reasoningOutput.total, 20);
  assert.equal(report.coverage.complete, true);
  assert.equal(report.byParticipant.length, 2);
  assert.equal(report.byModel[0].tokens.total.total, 240);
  assert.equal(report.elapsedMs, 3000);
});
test('partial field coverage preserves known subtotal without inventing a total', () => {
  const input = fixture(); input.entries[1].tokens.output = null; input.entries[1].tokens.total = null;
  const report = buildRunReport(input);
  assert.equal(report.tokens.total.total, null); assert.equal(report.tokens.total.knownSubtotal, 120);
  assert.equal(report.tokens.total.measuredEntries, 1); assert.equal(report.coverage.complete, false);
  assert.equal(report.entries[1].tokens.output, null);
  assert.match(report.entries[1].unavailableReasons.output, /Not exposed/);
});
test('even fully measured entries do not establish complete unverified run scope', () => {
  for (const key of ['participantInventoryComplete', 'measurementScopeComplete']) {
    const input = fixture(); input[key] = false;
    const report = buildRunReport(input); assert.equal(report.tokens.total.total, null); assert.equal(report.tokens.total.knownSubtotal, 240);
  }
});
test('missing child and empty entries cannot claim complete totals', () => {
  const input = fixture(); input.entries.pop();
  const report = buildRunReport(input); assert.deepEqual(report.coverage.missingParticipants, ['child']); assert.equal(report.tokens.total.total, null);
  input.entries = []; const empty = buildRunReport(input); assert.equal(empty.tokens.total.knownSubtotal, null); assert.equal(empty.coverage.complete, false);
});
test('unavailable telemetry preserves timing and reason with no estimated counts', () => {
  const report = buildRunReport(unavailableRunInput({ runId: 'missing', stage: 'render', reason: 'No host usage API' }));
  assert.equal(report.tokens.total.total, null); assert.equal(report.tokens.total.knownSubtotal, null);
  assert.equal(report.entries[0].unavailableReasons.total, 'No host usage API');
  assert.match(renderRunReportMarkdown(report), /No host usage API/);
  assert.equal(report.cost.totalMicros,null);assert.equal(report.coverage.costComplete,false);
});
test('actual billed cost is tracked separately from tokens and only totals with complete same-currency evidence',()=>{
 const input=fixture();
 input.entries[0].cost={amountMicros:125000,currency:'USD',source:{kind:'provider-billing',reference:'bill.json',recordId:'charge-parent'}};
 input.entries[1].cost={amountMicros:75000,currency:'USD',source:{kind:'provider-billing',reference:'bill.json',recordId:'charge-child'}};
 let report=buildRunReport(input);assert.equal(report.cost.totalMicros,200000);assert.equal(report.cost.currency,'USD');assert.equal(report.coverage.costComplete,true);
 assert.match(renderRunReportMarkdown(report),/200000 USD micro-units/);
 input.entries[1].cost={amountMicros:null,currency:null,source:null,unavailableReason:'Child charge was not exposed'};
 report=buildRunReport(input);assert.equal(report.cost.totalMicros,null);assert.equal(report.cost.knownSubtotalMicros,125000);assert.equal(report.cost.measuredEntries,1);
 input.entries[1].cost={amountMicros:75000,currency:'EUR',source:{kind:'provider-billing',reference:'bill.json',recordId:'charge-child-eur'}};
 report=buildRunReport(input);assert.equal(report.cost.totalMicros,null);assert.equal(report.cost.currencies.length,2);assert.match(report.cost.limitation,/Multiple currencies/);
});
test('cost values need an exact billing source and valid currency; estimates are rejected',()=>{
 for(const patch of [
  {amountMicros:-1,currency:'USD',source:{kind:'billing',reference:'bill',recordId:'a'}},
  {amountMicros:1.25,currency:'USD',source:{kind:'billing',reference:'bill',recordId:'a'}},
  {amountMicros:1000,currency:'usd',source:{kind:'billing',reference:'bill',recordId:'a'}},
  {amountMicros:1000,currency:'USD',source:{kind:'manual-estimate',reference:'tokens-times-rate',recordId:'a'}},
  {amountMicros:1000,currency:'USD'},
 ]){const input=fixture();input.entries[0].cost=patch;assert.throws(()=>buildRunReport(input));}
});
test('rejects duplicate records, entries, invalid subsets and impossible totals', () => {
  const mutations = [
    input => { input.entries[1].source = input.entries[0].source; },
    input => { input.entries[1].id = input.entries[0].id; },
    input => { input.entries[0].tokens.total = 180; },
    input => { input.entries[0].tokens.cachedInput = 101; },
    input => { input.entries[0].tokens.reasoningOutput = 21; },
    input => { input.entries[0].tokens.input = -1; },
    input => { input.entries[0].tokens.output = 1.5; },
    input => { input.entries[0].measurementKind = 'cumulative'; },
    input => { input.entries[0].participantId = 'undeclared'; },
    input => { input.entries[0].tokens.input = 130; input.entries[0].tokens.output = null; },
  ];
  for (const mutate of mutations) { const input = fixture(); mutate(input); assert.throws(() => buildRunReport(input)); }
});
test('attempts tracked per participant and stage; grouped by model and stage', () => {
  const input = fixture(); const retry = entry('retry'); retry.attempt = 2; retry.stage = 'review'; retry.model = 'other'; input.entries.push(retry);
  const report = buildRunReport(input); assert.equal(report.attempts, 3); assert.equal(report.byStage.length, 2); assert.equal(report.byModel.length, 2);
});
test('writes readable and machine-readable reports and preserves previous reports', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-run-report-'));
  try {
    const target = path.join(directory, 'run.json'); const result = writeRunReport(fixture(), target);
    assert.equal(JSON.parse(fs.readFileSync(result.json)).tokens.total.total, 240);
    assert.match(fs.readFileSync(result.markdown, 'utf8'), /cachedInput/);
    assert.throws(() => writeRunReport(fixture(), target), /immutable/);
    const inputPath = path.join(directory, 'input.json'); fs.writeFileSync(inputPath, JSON.stringify(fixture()));
    assert.ok(writeRunReport(inputPath, path.join(directory, 'second.json')));
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('rejects entry timestamps outside declared run bounds and reversed intervals', () => {
  for (const [key, value] of [['startedAt', '2026-10-10T23:59:59Z'], ['endedAt', '2026-10-11T00:00:04Z'], ['startedAt', '2026-10-11T00:00:04Z'], ['endedAt', '2026-10-10T23:59:59Z']]) {
    const input = fixture(); input.entries[0][key] = value;
    assert.throws(() => buildRunReport(input), /outside the declared run window/);
  }
  const reversed = fixture(); reversed.entries[0].startedAt = '2026-10-11T00:00:02Z'; reversed.entries[0].endedAt = '2026-10-11T00:00:01Z';
  assert.throws(() => buildRunReport(reversed), /End time precedes/);
  const valid = fixture(); valid.entries[0].startedAt = valid.startedAt; valid.entries[0].endedAt = valid.endedAt;
  assert.equal(buildRunReport(valid).entries[0].elapsedMs, 3000);
});
