import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import {patchStudioRenderSettings,renderSignatures} from '../scripts/patch-studio-render-settings.mjs';
async function fixture(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'jstudio-render-settings-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));await fs.writeFile(path.join(root,'package.json'),' {"version":"0.8.77"}');for(const [file,pairs] of renderSignatures){await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.writeFile(path.join(root,file),pairs.map(pair=>pair[0]).join('\n'));}return root;}
test('both artifacts patch once and are idempotent',async t=>{const root=await fixture(t);assert.ok(patchStudioRenderSettings(root).every(x=>x.changed));assert.ok(patchStudioRenderSettings(root).every(x=>!x.changed));});
test('corrupt second artifact leaves first untouched; version guard rejects',async t=>{const root=await fixture(t),first=path.join(root,renderSignatures[0][0]),before=await fs.readFile(first);await fs.writeFile(path.join(root,renderSignatures[1][0]),'bad');assert.throws(()=>patchStudioRenderSettings(root),/signature/);assert.deepEqual(await fs.readFile(first),before);await fs.writeFile(path.join(root,'package.json'),' {"version":"0.9.0"}');assert.throws(()=>patchStudioRenderSettings(root),/0.8.77/);});
test('actual header and panel callbacks submit matching format quality fps resolution and variables',async()=>{
 let source=await fs.readFile(new URL('../node_modules/hyperframes/dist/studio/index.js',import.meta.url),'utf8');
 for(const [before,after] of renderSignatures[0][1])if(!source.includes(after))source=source.replace(before,after);
 const settings=source.slice(source.indexOf('var RENDER_SETTINGS_KEY'),source.indexOf('// src/components/StudioLeftPanels.tsx',source.indexOf('var RENDER_SETTINGS_KEY')));
 const resolution=source.slice(source.indexOf('function compAspect('),source.indexOf('function scaleOptionLabel('));
 const header=source.match(/const settings = getPersistedRenderSettings\(\);\s+await renderQueue.startRender\([\s\S]*?\);/)[0];
 const panel=source.match(/onStartRender: async \(format, quality, resolution, fps\) => \{([\s\S]*?)\n      \},/)[1];
 let stored=null;const calls=[];const context=vm.createContext({localStorage:{getItem:()=>stored,setItem:(_,v)=>stored=v},compositionDimensions:{width:1920,height:1080},CANVAS_DIMENSIONS:{'landscape-4k':{width:3840,height:2160},landscape:{width:1920,height:1080}},renderQueue:{startRender:async opts=>calls.push(JSON.parse(JSON.stringify(opts)))},usePreviewVariablesStore:{getState:()=>({values:{headline:'edited'}})},waitForPendingDomEditSaves:async()=>{}});
 vm.runInContext(settings+resolution,context);
 for(const [format,quality,fps,scale] of [['webm','high',60,'4k'],['mp4','draft',24,'auto']]){
  vm.runInContext(`persistRenderSettings(${JSON.stringify(format)},${JSON.stringify(quality)},${fps},${JSON.stringify(scale)})`,context);
  await vm.runInContext(`(async()=>{${header}})()`,context);
  await vm.runInContext(`(async(format,quality,resolution,fps)=>{${panel}})(${JSON.stringify(format)},${JSON.stringify(quality)},resolveResolution(${JSON.stringify(scale)},compositionDimensions),${fps})`,context);
  assert.deepEqual(calls.at(-1),calls.at(-2));assert.equal(calls.at(-1).quality,quality);assert.equal(calls.at(-1).fps,fps);
 }
 let minified=await fs.readFile(new URL('../node_modules/hyperframes/dist/studio/assets/index-2GgHjQq-.js',import.meta.url),'utf8');
 for(const [before,after] of renderSignatures[1][1])if(!minified.includes(after))minified=minified.replace(before,after);
 const minStart=minified.indexOf('const k_e="hf-studio-render-settings"');
 vm.runInContext(minified.slice(minStart,minified.indexOf('function bE(',minStart))+';var B=renderQueue,gt=compositionDimensions,vS=usePreviewVariablesStore,QW=resolveResolution,j5e=scaleApplies;',context);
 const minHeader=renderSignatures[1][1].at(-1)[1];
 assert.ok(minified.includes(minHeader));
 vm.runInContext('RL("webm","high",60,"4k")',context);
 await vm.runInContext(`(async()=>{${minHeader}})()`,context);
 assert.deepEqual(calls.at(-1),{format:'webm',quality:'high',fps:60,resolution:'landscape-4k',variables:{headline:'edited'}});
 stored='{"format":"bad","quality":"bad","fps":999,"resolution":"bad"}';assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(getPersistedRenderSettings())',context)),{format:'mp4',quality:'standard',fps:30,resolution:'auto'});
});
