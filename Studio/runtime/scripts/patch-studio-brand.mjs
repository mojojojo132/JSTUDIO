/** Neutral chrome for the reviewed native HyperFrames editor; output brands are project data. */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const targets=[['dist/studio/index.js','function HyperframesLogo()','function shouldOpenInspector(', 'jsx14'],['dist/studio/assets/index-2GgHjQq-.js','function aEt()','function oEt(', 'y.jsx']];
// Retain the exported name for compatibility with existing setup/upgrade callers.
export function patchStudioBrand(packageDir){
 const version=JSON.parse(readFileSync(resolve(packageDir,'package.json'),'utf8')).version;
 if(version!=='0.8.77')throw Error(`Neutral Editor compatibility patch requires version 0.8.77; found ${version}.`);
 const plans=targets.map(([relative,start,end,jsx])=>{
  const target=resolve(packageDir,relative),source=readFileSync(target,'utf8');
  if(source.split(start).length!==2||source.split(end).length!==2)throw Error(`Unexpected logo function boundary in ${relative}; no changes made.`);
  const a=source.indexOf(start),b=source.indexOf(end,a),old=source.slice(a,b);
  if(b<a||!['torq-studio-identity','Hyperframes','video-editor-identity'].some(s=>old.includes(s)))throw Error(`Unexpected native logo markup in ${relative}.`);
  const body=`${start}{return ${jsx}("div",{className:"video-editor-identity","aria-label":"Video Editor",children:"Video Editor"})}\n`;
  return {target,source:source.slice(0,a)+body+source.slice(b),changed:old!==body};
 });
 const htmlPath=resolve(packageDir,'dist/studio/index.html');let html=readFileSync(htmlPath,'utf8');
 if(!/<title>(?:HyperFrames Studio|Torq Studio|Video Editor)<\/title>/.test(html)||!html.includes('</head>'))throw Error('Unexpected native Editor HTML; no changes made.');
 const starts=(html.match(/<!-- torq-brand:start -->/g)||[]).length,ends=(html.match(/<!-- torq-brand:end -->/g)||[]).length;
 if(starts!==ends||starts>1)throw Error('Unexpected legacy skin boundaries; no changes made.');
 html=html.replace(/<title>(?:HyperFrames Studio|Torq Studio|Video Editor)<\/title>/,'<title>Video Editor</title>')
  .replace(/<link rel="icon"[^>]*>/g,'')
  .replace(/<!-- torq-brand:start -->[\s\S]*?<!-- torq-brand:end -->/g,'');
 for(const p of plans)if(p.changed)writeFileSync(p.target,p.source);
 if(readFileSync(htmlPath,'utf8')!==html)writeFileSync(htmlPath,html);
 // Old asset files are inert. Workspace migration archives them separately, preserving originals.
 return {identity:'neutral',targets:plans.map(({target,changed})=>({target,changed}))};
}

/** Read-only check of active editor chrome; historical inactive assets are not dependencies. */
export function verifyStudioNeutral(packageDir){
 const version=JSON.parse(readFileSync(resolve(packageDir,'package.json'),'utf8')).version;
 if(version!=='0.8.77')throw Error(`Neutral Editor compatibility check requires version 0.8.77; found ${version}.`);
 const html=readFileSync(resolve(packageDir,'dist/studio/index.html'),'utf8');
 if(!html.includes('<title>Video Editor</title>')||/torq-brand|torq-studio|studio-brand|Torq Studio|rel="icon"/i.test(html))throw Error('Editor HTML contains branded or unverified chrome.');
 for(const [relative,start,end,jsx] of targets){
  const source=readFileSync(resolve(packageDir,relative),'utf8');
  if(source.split(start).length!==2||source.split(end).length!==2)throw Error(`Unexpected identity boundaries in ${relative}.`);
  const a=source.indexOf(start),b=source.indexOf(end,a);
  const expected=`${start}{return ${jsx}("div",{className:"video-editor-identity","aria-label":"Video Editor",children:"Video Editor"})}\n`;
  if(source.slice(a,b)!==expected)throw Error(`Editor identity is not neutral in ${relative}.`);
 }
 return {identity:'neutral',version,verified:true};
}
