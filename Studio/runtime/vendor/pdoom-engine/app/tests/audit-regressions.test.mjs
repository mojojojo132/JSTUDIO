import test from 'node:test';
import assert from 'node:assert/strict';
import { streamWarmupTime } from '../src/engine/stream-range.ts';
import { checkText, brandText, clearTextDiagnostics, textDiagnosticSnapshot } from '../src/engine/text-diagnostics.ts';
const timeline = [{ id: 'open', start: 0, end: 10.3 }, { id: 'close', start: 10.3, end: 45 }];
test('isolated second shot starts without touching unloaded previous shot', () => {
  assert.equal(streamWarmupTime(timeline, new Set(['close']), 309, 330, 30, -2), null);
});
test('interior stateful range retains preceding-frame warm-up; contiguous and empty ranges skip', () => {
  assert.equal(streamWarmupTime(timeline, new Set(['close']), 330, 360, 30, -2), 329 / 30);
  assert.equal(streamWarmupTime(timeline, new Set(['close']), 330, 360, 30, 329), null);
  assert.equal(streamWarmupTime(timeline, new Set(['close']), 330, 330, 30, -2), null);
});
test('warm-up checks overlaps and shutter edges without hiding missing scenes', () => {
  const overlapping = [{id:'a',start:0,end:2}, {id:'b',start:1,end:3}];
  assert.equal(streamWarmupTime(overlapping, new Set(['b']), 45, 60, 30, -2), null);
  assert.equal(streamWarmupTime(overlapping, new Set(['a','b']), 45, 60, 30, -2), 44 / 30);
  assert.equal(streamWarmupTime(timeline, new Set(['close']), 310, 330, 30, -2, 0.5), null);
});
function context(transform = {a:1,b:0,c:0,d:1,e:0,f:0}) {
  return { measureText: () => ({width:120, actualBoundingBoxLeft:0, actualBoundingBoxRight:120,actualBoundingBoxAscent:20,actualBoundingBoxDescent:4}), getTransform: () => transform, fillText(...args) { this.drawn = args; } };
}
test('reports width, actual transformed bounds and missing supplied glyphs without altering copy', () => {
  const c = context({a:2,b:0,c:0,d:2,e:30,f:0});
  const result = brandText(c, 'A—', 0, 25, {maxWidth:100,safeArea:{x:0,y:0,width:260,height:100},hasGlyph:ch=>ch==='A'});
  assert.deepEqual(result.map(x=>x.code), ['width','safe-area','glyph']);
  assert.deepEqual(c.drawn, ['A—',0,25]);
});
test('rotation bounds checked; unknown coverage remains explicit', () => {
  const c = context({a:0,b:1,c:-1,d:0,e:40,f:0});
  assert.deepEqual(checkText(c,'ABC',0,25,{safeArea:{x:0,y:0,width:100,height:100}}).map(x=>x.code),['safe-area','coverage-unavailable']);
});
test('strict mode is opt-in and rejects before drawing; adequate supplied checks pass', () => {
  const c = context();
  assert.throws(()=>brandText(c,'A',0,25,{strict:true,maxWidth:20,hasGlyph:()=>true}), /width/);
  assert.equal(c.drawn, undefined);
  assert.deepEqual(checkText(c,'A',0,25,{strict:true,maxWidth:120,safeArea:{x:0,y:0,width:120,height:30},hasGlyph:()=>true}),[]);
  assert.throws(()=>checkText(c,'A',0,0,{maxWidth:NaN}), /positive/);
});
test('diagnostics persist without callback, deduplicate and cap unique entries', () => {
  clearTextDiagnostics();const c=context();
  for(let i=0;i<5;i++)checkText(c,'same',0,0);
  assert.equal(textDiagnosticSnapshot().diagnostics[0].count,5);
  const copy=textDiagnosticSnapshot();copy.diagnostics[0].count=999;
  assert.equal(textDiagnosticSnapshot().diagnostics[0].count,5);
  for(let i=0;i<101;i++)checkText(c,'text-'+i,0,0);
  const result=textDiagnosticSnapshot();assert.equal(result.diagnostics.length,100);assert.equal(result.droppedOccurrences,2);
  clearTextDiagnostics();assert.equal(textDiagnosticSnapshot().diagnostics.length,0);
});
