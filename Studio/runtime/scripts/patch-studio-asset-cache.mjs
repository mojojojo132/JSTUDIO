/** Keep circular Studio module imports in one fresh, content-addressed asset graph. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
export const studioJsFiles = ['hyperframes-player-BSDTJ9EF.js', 'index-2GgHjQq-.js', 'index-BX3KHhGX.js', 'index-CsFCRdMo.js', 'index-DcxWQ7Za.js'];
export function verifyStudioAssetCache(packageDir) {
  const assets=resolve(packageDir,'dist/studio/assets'),html=readFileSync(resolve(packageDir,'dist/studio/index.html'),'utf8');
  const graph=studioJsFiles.map(name=>({name,bytes:readFileSync(resolve(assets,name))}));
  const hash=createHash('sha256');for(const {name,bytes} of graph){hash.update(name);hash.update('\0');hash.update(bytes);}
  const directory=`torq-${hash.digest('hex').slice(0,16)}`;
  const entries=[...html.matchAll(/src="\/assets\/(?:torq-[a-f0-9]{16}\/)?index-2GgHjQq-\.js(?:\?torq-select-layer=1)?"/g)];
  if(entries.length!==1||entries[0][0]!==`src="/assets/${directory}/index-2GgHjQq-.js"`)throw Error('Active Studio asset graph is stale. Run node scripts/patch-native.mjs from runtime, then reload the editor.');
  for(const {name,bytes} of graph)if(!readFileSync(resolve(assets,directory,name)).equals(bytes))throw Error('Active Studio asset differs from verified source: '+name+'; rerun patch-native and reload.');
  return {verified:true,directory,files:graph.length};
}
export function patchStudioAssetCache(packageDir) {
  const version=JSON.parse(readFileSync(resolve(packageDir,'package.json'),'utf8')).version;
  if(version!=='0.8.77')throw new Error(`Studio asset cache patch requires 0.8.77; found ${version}.`);
  const assets=resolve(packageDir,'dist/studio/assets'),index=resolve(packageDir,'dist/studio/index.html');
  const graph=studioJsFiles.map(name=>({name,bytes:readFileSync(resolve(assets,name))}));
  const entry=graph.find(x=>x.name==='index-2GgHjQq-.js').bytes.toString();
  if(!entry.includes('alignItemWithTrigger:!1,className:"z-200"'))throw new Error('Apply Select layer patch before versioning Studio assets.');
  const hash=createHash('sha256');for(const {name,bytes} of graph){hash.update(name);hash.update('\0');hash.update(bytes);}
  const directory=`torq-${hash.digest('hex').slice(0,16)}`;
  const html=readFileSync(index,'utf8');
  const pattern=/src="\/assets\/(?:torq-[a-f0-9]{16}\/)?index-2GgHjQq-\.js(?:\?torq-select-layer=1)?"/g;
  if([...html.matchAll(pattern)].length!==1)throw new Error('Unexpected Studio entry reference; no files changed.');
  // Preserve all chunk names/relative imports together, including back-imports to main.
  const target=resolve(assets,directory);mkdirSync(target,{recursive:true});
  for(const {name,bytes} of graph){const dest=resolve(target,name);if(!existsSync(dest)||!readFileSync(dest).equals(bytes))writeFileSync(dest,bytes);}
  const next=html.replace(pattern,`src="/assets/${directory}/index-2GgHjQq-.js"`);
  if(next!==html)writeFileSync(index,next);
  return {changed:next!==html,directory};
}
