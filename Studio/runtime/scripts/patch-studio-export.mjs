/** Pinned native UI export adapter: preserve producer, progress and cancellation. */
import {readFileSync,writeFileSync,renameSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
export const exportStart='          const { createRenderJob: createRenderJob2, executeRenderJob: executeRenderJob2 } = await loadStudioProducer();';
export const exportEnd='          state.status = "complete";\n          state.progress = 100;';
export const guardedStart='          const { finishEditorExport } = await import(new URL("../../../scripts/editor-export.mjs", import.meta.url).href);\n          let job;\n          await finishEditorExport(opts, async () => {\n'+exportStart;
export const guardedEnd='          }); // Studio finishing checks complete before native success\n'+exportEnd;
function targetSource(packageDir){
 const version=JSON.parse(readFileSync(resolve(packageDir,'package.json'),'utf8')).version;
 if(version!=='0.8.77')throw Error(`Editor export compatibility patch requires version 0.8.77; found ${version}`);
 const target=resolve(packageDir,'dist/cli.js');return {target,source:readFileSync(target,'utf8')};
}
export function verifyStudioExport(packageDir){
 const {source}=targetSource(packageDir);
 if(source.split(guardedStart).length!==2||source.split(guardedEnd).length!==2)throw Error('Native editor export finishing bridge missing; run patch-native.mjs and restart the editor server');
 return {verified:true};
}
export function patchStudioExport(packageDir){
 const {target,source}=targetSource(packageDir);
 if(source.includes(guardedStart)){verifyStudioExport(packageDir);return {changed:false,target};}
 const start=source.indexOf(exportStart),end=source.indexOf(exportEnd,start);
 if(start<0||end<0||source.split(exportStart).length!==2)throw Error('Unexpected native editor export signature; no files changed');
 const block=source.slice(start,end);
 const job='          const job = createRenderJob2({';
 const cancel='            removeCancelledOutput();\n            return;';
 if(block.split(job).length!==2||block.split(cancel).length!==2)throw Error('Unexpected native job/cancellation signature; no files changed');
 const changed=source.slice(0,start)+block.replace(exportStart,guardedStart).replace(job,'          job = createRenderJob2({').replace(cancel,'            throw new Error("Native editor export cancelled");')+guardedEnd+source.slice(end+exportEnd.length);
 const temp=target+`.studio-export-${process.pid}.tmp`;writeFileSync(temp,changed,{mode:statSync(target).mode});renameSync(temp,target);verifyStudioExport(packageDir);return {changed:true,target};
}
