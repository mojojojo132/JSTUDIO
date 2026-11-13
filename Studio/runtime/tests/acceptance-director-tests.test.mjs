import {directorNodeTests as discoverDirectorNodeTests} from '../scripts/acceptance-tests.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';

// Exercise the exact acceptance dispatch block without running installation/render acceptance.
const source=await fs.readFile(new URL('../scripts/acceptance.mjs',import.meta.url),'utf8');
const start=source.indexOf(' const directorNodeTests=');
const end=source.indexOf(' const manifest=',start);
assert.ok(start>=0&&end>start,'Director Node acceptance dispatch must exist');
const block=source.slice(start,end);
async function fixture(t){
 const director=await fs.mkdtemp(path.join(os.tmpdir(),'jstudio director acceptance '));
 t.after(()=>fs.rm(director,{recursive:true,force:true}));
 await fs.mkdir(path.join(director,'tools/tests'),{recursive:true});
 return director;
}
test('acceptance runs only explicit bundled Node test files, sorted and with paths kept intact',async t=>{
 const director=await fixture(t),dir=path.join(director,'tools/tests'),calls=[];
 for(const name of ['z.test.mjs','a capture.test.mjs','test_python.py','helper.mjs'])await fs.writeFile(path.join(dir,name),'');
 await fs.mkdir(path.join(dir,'directory.test.mjs'));
 await fs.writeFile(path.join(director,'tools/animation-handoff.test.mjs'),'');
 const env={QA_FIXTURE:'yes',HYPERFRAMES_FFMPEG_PATH:'/bundled/ffmpeg',HYPERFRAMES_FFPROBE_PATH:'/bundled/ffprobe'};
 await vm.runInNewContext(`(async()=>{${block}})()`,{fs,path,director,process,env,discoverDirectorNodeTests,check:async(...args)=>calls.push(args)});
 assert.equal(calls.length,1);
 assert.equal(calls[0][0],'Bundled Director Node regression tests');
 assert.equal(calls[0][1],process.execPath);
 assert.deepEqual(Array.from(calls[0][2]),['--test',path.join(director,'tools/animation-handoff.test.mjs'),path.join(dir,'a capture.test.mjs'),path.join(dir,'z.test.mjs')]);
 assert.equal(calls[0][3].QA_FIXTURE,'yes');
 assert.equal(calls[0][3].FFMPEG_PATH,env.HYPERFRAMES_FFMPEG_PATH);
 assert.equal(calls[0][3].FFPROBE_PATH,env.HYPERFRAMES_FFPROBE_PATH);
 assert.ok(source.includes("await check('Bundled Director regression tests',env.HYPERFRAMES_PYTHON"),'Python suite remains enabled');
});
test('missing required handoff test fails closed; a failed test check propagates',async t=>{
 const director=await fixture(t);let calls=0;
 const context={fs,path,director,process,discoverDirectorNodeTests,env:{},check:async()=>{calls++;throw Error('fixture test failure');}};
 await assert.rejects(vm.runInNewContext(`(async()=>{${block}})()`,context));
 assert.equal(calls,0);
 await fs.writeFile(path.join(director,'tools/animation-handoff.test.mjs'),'');
 await assert.rejects(vm.runInNewContext(`(async()=>{${block}})()`,context),/fixture test failure/);
 assert.equal(calls,1);
});
