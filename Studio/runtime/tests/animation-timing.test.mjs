import test from 'node:test';
import assert from 'node:assert/strict';
import {audioTimingFilter,quantizeFrameRange} from '../vendor/pdoom-engine/app/scripts/render-timing.mjs';

test('quantizes both ends once and derives frame count and audio interval from those boundaries',()=>{
 const range=quantizeFrameRange(0.24,2.01,24);
 assert.deepEqual(range,{firstFrame:6,endFrame:48,totalFrames:42,fromSeconds:0.25,toSeconds:2,durationSeconds:1.75});
 assert.equal(audioTimingFilter(range),'atrim=start=0.25:duration=1.75,asetpts=PTS-STARTPTS,apad=whole_dur=1.75,atrim=duration=1.75');
});

test('rejects non-finite, reversed, negative, and frame-empty intervals',()=>{
 for(const values of [[NaN,1,24],[0,Infinity,24],[-0.2,1,24],[2,1,24],[0,0,24],[0,0.001,24],[0,1,0]])assert.throws(()=>quantizeFrameRange(...values));
});

test('rejects invalid audio timing filter ranges',()=>{
 assert.throws(()=>audioTimingFilter(null),/quantized audio interval/);
 assert.throws(()=>audioTimingFilter({fromSeconds:0,durationSeconds:0}),/quantized audio interval/);
});
