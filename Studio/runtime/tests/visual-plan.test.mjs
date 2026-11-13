import test from 'node:test';
import assert from 'node:assert/strict';
import {planVisualProduction} from '../scripts/visual-plan.mjs';

const beat = (id, intent, extra = {}) => ({
  id, startSeconds: 0, durationSeconds: 4, intent,
  takeaway: `Takeaway for ${id}`, visualBrief: `Visual treatment for ${id}`,
  authenticity: intent === 'demonstrate-interface' ? 'required' : 'illustrative', ...extra,
});
const plan = (beats, constraints) => planVisualProduction({schemaVersion: 1, beats, ...(constraints ? {constraints} : {})});

test('routes each intent to the matching production owner and keeps execution unverified', () => {
  const result = plan([
    beat('ui', 'demonstrate-interface', {available: {screenCapture: true}}),
    beat('mechanism', 'explain-mechanism'),
    beat('evidence', 'show-evidence', {available: {sourceDocument: true}}),
    beat('context', 'establish-context', {available: {ownedFootage: true}}),
    beat('mood', 'evoke-mood'),
  ]);
  assert.deepEqual(result.beats.map(item => [item.route, item.owner]), [
    ['screen-recording', 'editor'], ['animation', 'animator'], ['source-document', 'director'],
    ['original-footage', 'director'], ['conceptual-animation', 'animator'],
  ]);
  assert.equal(result.beats[0].sourceAvailability.screenCapture, 'director-declared-available-unverified');
  assert.equal(result.beats[0].capability, 'unverified-until-execution');
  assert.equal(result.beats[0].executionStatus, 'not-executed');
  assert.equal(result.noMediaExecuted, true);
  assert.equal(result.networkAccessed, false);
  assert.equal(result.rightsStatus, 'not-assessed');
  assert.ok(result.beats.every(item => item.job.requires.length > 0));
});

test('source evidence is never replaced by a conceptual substitute', () => {
  const result = plan([beat('evidence', 'show-evidence')], {allowGenerated: true, allowOnlineStock: true});
  const item = result.beats[0];
  assert.equal(item.route, 'source-document');
  assert.match(item.blockingConditions[0], /No evidence source/);
  assert.equal(item.fallback.route, 'none');
  assert.match(item.fallback.condition, /Do not replace evidence/);
});

test('context and mood choose owned footage before licensed stock and keep acquisition unverified', () => {
  const result = plan([
    beat('owned', 'establish-context', {available: {ownedFootage: true}}),
    beat('stock', 'evoke-mood', {searchQueries: ['quiet harbor at dawn', 'fog over coastline']}),
  ], {allowOnlineStock: true});
  assert.equal(result.beats[0].route, 'original-footage');
  assert.equal(result.beats[1].route, 'licensed-stock');
  assert.deepEqual(result.beats[1].job.searches, ['quiet harbor at dawn', 'fog over coastline']);
  assert.match(result.beats[1].job.usage, /verify the item license/);
  assert.match(result.beats[1].blockingConditions[0], /license terms have not been checked/);
});

test('stock and generated options default off; illustrative fallback stays clearly labeled', () => {
  const disabled = plan([beat('scene', 'establish-context')]);
  assert.equal(disabled.constraints.allowOnlineStock, false);
  assert.equal(disabled.constraints.allowGenerated, false);
  assert.equal(disabled.beats[0].route, 'conceptual-animation');
  assert.equal(disabled.beats[0].job.generation, 'original-animator-authored');
  const allowed = plan([beat('scene', 'establish-context')], {allowGenerated: true});
  assert.equal(allowed.beats[0].route, 'conceptual-animation');
  assert.equal(allowed.beats[0].job.labelAsIllustration, true);
  assert.equal(allowed.beats[0].job.generation, 'original-animator-authored');
  assert.ok(allowed.beats[0].job.requires.some(item => /does not require a generative service/.test(item)));
  assert.match(allowed.beats[0].fallback.condition, /distinguishable/);
});

test('interface beats never use a fake UI animation as fallback', () => {
  for (const authenticity of ['required']) {
    const item = plan([beat('ui', 'demonstrate-interface', {authenticity})], {allowGenerated: true}).beats[0];
    assert.equal(item.route, 'screen-recording');
    assert.equal(item.fallback.route, 'none');
    assert.match(item.fallback.condition, /Do not use a simulated interface/);
    assert.ok(!item.job.requires.some(value => /generation|generated/.test(value)));
    assert.deepEqual(item.job.preserve, ['source URL or application and version', 'the exact visible state and interaction steps', 'a source capture record']);
  }
  assert.throws(()=>plan([beat('ui', 'demonstrate-interface', {authenticity:'illustrative'})]), /interface demonstrations require authenticity required/);
  assert.match(plan([beat('ui', 'demonstrate-interface', {authenticity: 'required'})]).beats[0].blockingConditions[0], /unverified/);
});

test('required-authenticity context avoids stock and required mechanism claims need sources', () => {
  const context = plan([beat('event', 'establish-context', {authenticity: 'required'})], {allowOnlineStock: true}).beats[0];
  assert.equal(context.route, 'original-footage');
  assert.equal(context.job.type, 'request-original-footage');
  assert.ok(context.job.requires.some(value => /provenance|permission/.test(value)));
  const mechanism = plan([beat('fact', 'explain-mechanism', {authenticity: 'required'})]).beats[0];
  assert.equal(mechanism.route, 'animation');
  assert.ok(mechanism.job.requires.some(value => /Locate and verify source material/.test(value)));
});

test('every selected source route records identity and capability or rights prerequisites', () => {
  const result = plan([
    beat('interface', 'demonstrate-interface'), beat('mechanism', 'explain-mechanism'),
    beat('evidence-doc', 'show-evidence', {available: {sourceDocument: true}}),
    beat('evidence-video', 'show-evidence', {available: {ownedFootage: true}}),
    beat('stock', 'establish-context'), beat('illustration', 'evoke-mood'),
  ], {allowOnlineStock: true});
  for (const item of result.beats) assert.ok(item.job.requires.length, item.id);
  assert.ok(result.beats.find(item => item.id === 'stock').job.requires.some(value => /license terms|usage rights/.test(value)));
});

test('overlapping beat ranges are preserved and output order follows input order', () => {
  const beats = [beat('later', 'explain-mechanism', {startSeconds: 3}), beat('earlier', 'evoke-mood', {startSeconds: 1})];
  const result = plan(beats);
  assert.deepEqual(result.beats.map(item => item.id), ['later', 'earlier']);
  assert.equal(result.beats[0].startSeconds, 3);
  assert.equal(result.beats[1].startSeconds, 1);
});

test('input validation bounds ids, ranges, enums, source declarations, searches, and text', () => {
  const valid = beat('a', 'explain-mechanism');
  const cases = [
    [{...valid, id: ' '}, /id must be a non-empty/],
    [{...valid, startSeconds: Infinity}, /finite non-negative/],
    [{...valid, durationSeconds: 0}, /finite positive/],
    [{...valid, intent: 'topic-classifier'}, /unsupported intent/],
    [{...valid, authenticity: 'guess'}, /authenticity must/],
    [{...valid, available: {screenCapture: 'yes'}}, /must be a supported boolean/],
    [{...valid, searchQueries: Array(6).fill('query')}, /at most 5/],
    [{...valid, visualBrief: 'x'.repeat(2001)}, /2000-character limit/],
  ];
  for (const [invalid, expected] of cases) assert.throws(() => plan([invalid]), expected);
  assert.throws(() => plan([valid, {...valid}]), /must be unique/);
  assert.throws(() => plan([]), /1 to 100/);
  assert.throws(() => plan(Array(101).fill(valid)), /1 to 100/);
  assert.throws(() => plan([valid], {allowOnlineStock: 'yes'}), /supported boolean option/);
  assert.throws(() => plan([valid], {unexpected: true}), /supported boolean option/);
});
