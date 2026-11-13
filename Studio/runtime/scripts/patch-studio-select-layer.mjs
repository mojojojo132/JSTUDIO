/** Restore the native Menu z-200 layer on Select's portal positioner. */
import { readFileSync, writeFileSync, renameSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export const signatures = [
  ['dist/studio/index.js', 'jsx14(BaseSelect.Positioner, { sideOffset: 4, alignItemWithTrigger: false, children:', 'jsx14(BaseSelect.Positioner, { sideOffset: 4, alignItemWithTrigger: false, className: "z-200", children:'],
  ['dist/studio/assets/index-2GgHjQq-.js', 'y.jsx($Ve,{sideOffset:4,alignItemWithTrigger:!1,children:y.jsx(jVe,{className:Ni("min-w-[var(--anchor-width)]', 'y.jsx($Ve,{sideOffset:4,alignItemWithTrigger:!1,className:"z-200",children:y.jsx(jVe,{className:Ni("min-w-[var(--anchor-width)]'],
];
export function patchStudioSelectLayer(packageDir) {
  const version=JSON.parse(readFileSync(resolve(packageDir,'package.json'),'utf8')).version;
  if(version!=='0.8.77') throw new Error(`Editor layer-selection compatibility patch requires version 0.8.77; found ${version}. Revalidate before upgrading.`);
  // Validate every target before mutating any artifact.
  const updates=signatures.map(([relative,oldText,newText])=>{
    const target=resolve(packageDir,relative),source=readFileSync(target,'utf8');
    const oldCount=source.split(oldText).length-1,newCount=source.split(newText).length-1;
    if(oldCount===0&&newCount===1)return {target,changed:false,source};
    if(oldCount!==1||newCount!==0)throw new Error(`Unexpected Select signature in ${relative}; no files changed.`);
    return {target,changed:true,source:source.replace(oldText,newText)};
  });
  for(const {target,source,changed} of updates){
    if(!changed)continue;
    const temp=`${target}.torq-select-${process.pid}.tmp`;
    writeFileSync(temp,source,{mode:statSync(target).mode});renameSync(temp,target);
  }
  return updates.map(({target,changed})=>({target,changed}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(patchStudioSelectLayer(process.argv[2]??resolve(dirname(fileURLToPath(import.meta.url)),'../node_modules/hyperframes'))));
