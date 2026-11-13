import test from 'node:test';
import assert from 'node:assert/strict';
import {runDoctor} from '../scripts/doctor.mjs';

const root='/fixture/Studio';
function environment(voice=null){return {env:{HYPERFRAMES_FFMPEG_PATH:'/tools/ffmpeg',HYPERFRAMES_FFPROBE_PATH:'/tools/ffprobe',HYPERFRAMES_PYTHON:'/tools/python'},voice};}
function resolver(result=environment(),calls=[]){return async(_root,options)=>{calls.push(options);return result;};}

test('media failure leaves core and voice unavailable and returns a failure',async()=>{
 const calls=[];
 const report=await runDoctor({studioRoot:root,resolveEnvironment:resolver(environment(),calls),probe(file){calls.push(file);if(file.endsWith('ffprobe'))throw Error('ffprobe missing');}});
 assert.equal(report.ok,false);assert.equal(report.media,false);assert.equal(report.voice,false);assert.match(report.error,/ffprobe missing/);
 assert.deepEqual(calls[0],{requireVoice:false});
});

test('optional voice absence preserves usable media and never attempts a voice import',async()=>{
 let imports=0;const calls=[];
 const report=await runDoctor({studioRoot:root,resolveEnvironment:resolver(environment(null),calls),probe(){},verifyVoice(){imports++;}});
 assert.equal(report.ok,true);assert.equal(report.media,true);assert.equal(report.voice,false);assert.equal(imports,0);
 assert.match(report.note,/Editing\/export available/);assert.equal(report.voiceError,undefined);
 assert.deepEqual(calls[0],{requireVoice:false});
});

test('required but absent voice keeps media true, explains fallback and returns failure',async()=>{
 let imports=0;
 const report=await runDoctor({studioRoot:root,requireVoice:true,resolveEnvironment:resolver(environment(null)),probe(){},verifyVoice(){imports++;}});
 assert.equal(report.media,true);assert.equal(report.voice,false);assert.equal(report.ok,false);assert.equal(imports,0);
 assert.match(report.voiceError,/Run Setup/);assert.match(report.voiceError,/recorded or externally generated/);
});

test('available voice is checked and reports provider identity limits',async()=>{
 let imports=0;
 const report=await runDoctor({studioRoot:root,resolveEnvironment:resolver(environment({python:'/tools/python',relocated:true})),probe(){},verifyVoice(env,voice){imports++;assert.equal(env.HYPERFRAMES_PYTHON,'/tools/python');assert.equal(voice.relocated,true);}});
 assert.equal(imports,1);assert.equal(report.ok,true);assert.equal(report.media,true);assert.equal(report.voice,true);
 assert.equal(report.voiceProvider,'kokoro');assert.equal(report.voiceIdentityVerified,false);assert.equal(report.relocatedVoice,true);
});

test('voice import failure is optional for core doctor but fails when voice is required',async()=>{
 const options={studioRoot:root,resolveEnvironment:resolver(environment({python:'/tools/python'})),probe(){},verifyVoice(){throw Error('native import blocked');}};
 const optional=await runDoctor(options);
 assert.equal(optional.ok,true);assert.equal(optional.media,true);assert.equal(optional.voice,false);assert.match(optional.voiceError,/native import blocked/);
 const required=await runDoctor({...options,requireVoice:true});
 assert.equal(required.ok,false);assert.equal(required.media,true);assert.equal(required.voice,false);assert.match(required.voiceError,/native import blocked/);
});

test('animation argument is forwarded and animation failures fail the overall check',async()=>{
 let received;
 const ok=await runDoctor({studioRoot:root,animationPath:'project-a',resolveEnvironment:resolver(),probe(){},checkAnimation:async(...args)=>{received=args;return {ok:true};}});
 assert.equal(ok.ok,true);assert.deepEqual(received,['project-a',root]);assert.deepEqual(ok.animation,{ok:true});
 const skipped=await runDoctor({studioRoot:root,resolveEnvironment:resolver(),probe(){},checkAnimation:async()=>{throw Error('must not run');}});
 assert.equal(skipped.ok,true);assert.equal(skipped.animation,undefined);
 const failed=await runDoctor({studioRoot:root,animationRequested:true,resolveEnvironment:resolver(),probe(){},checkAnimation:async()=>{throw Error('animation unavailable');}});
 assert.equal(failed.ok,false);assert.match(failed.error,/animation unavailable/);
 const explicit=await runDoctor({studioRoot:root,animationPath:'project-a',resolveEnvironment:resolver(),probe(){},checkAnimation:async()=>{throw Error('animation unavailable');}});
 assert.equal(explicit.ok,false);assert.match(explicit.error,/animation unavailable/);
});
