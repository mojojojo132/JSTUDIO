#!/usr/bin/env node
/** Local review receipts, not an approval/authentication service or composition schema. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const jsonHash = value => digest(JSON.stringify(value));
const fail = message => { throw new Error(message); };
const relativeName = value => typeof value==='string' ? value.replace(/\\/g,'/') : value;
const idPattern = /^[a-z0-9][a-z0-9_-]{0,63}$/;
function inside(root, relative, exists=true) {
  relative=relativeName(relative);
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) fail('Expected a project-relative path without traversal');
  const p=path.resolve(root,relative);
  if(!p.startsWith(root+path.sep)) fail('Path escapes project root');
  let cursor=root;
  for(const part of path.relative(root,p).split(path.sep)) {
    cursor=path.join(cursor,part);
    if(fs.existsSync(cursor) && fs.lstatSync(cursor).isSymbolicLink()) fail('Symlinks are not supported: '+relative);
  }
  if(exists && (!fs.existsSync(p)||!fs.statSync(p).isFile())) fail('Missing regular file: '+relative);
  return p;
}
function fileRecord(root,relative) {
 const p=inside(root,relative); const bytes=fs.readFileSync(p);
 return {path:relativeName(relative),sha256:digest(bytes),bytes:bytes.length};
}
// Versioned, conservative projection: unknown manifest fields remain render inputs.
// These known fields route administration/launching, not scene rendering.
const administrativeManifestKeys=new Set(['name','createdAt','creationContext','interactionLog','workflow','studioRuntime']);
function canonical(value) {
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
 return value;
}
function inputRecord(root,relative,projection) {
 if(projection===undefined)return fileRecord(root,relative);
 if(relativeName(relative)!=='PROJECT.json'||projection!=='animation-project-v1')fail('Unsupported render input projection');
 const manifest=JSON.parse(fs.readFileSync(inside(root,relative),'utf8'));
 const projected=Object.fromEntries(Object.entries(manifest).filter(([key])=>!administrativeManifestKeys.has(key)));
 const bytes=Buffer.from(JSON.stringify(canonical(projected)));
 return {path:relativeName(relative),sha256:digest(bytes),bytes:bytes.length,projection};
}
function ledgerFile(filename) {
 const resolved=path.resolve(filename),root=fs.realpathSync(path.dirname(resolved));
 return {filename:inside(root,path.basename(resolved),false),root};
}
function load(filename) {
 const loc=ledgerFile(filename),bytes=fs.readFileSync(loc.filename),data=JSON.parse(bytes.toString('utf8'));
 if(data.schema!==1 || !['production','synthetic-test'].includes(data.purpose) || !Array.isArray(data.artifacts)) fail('Unsupported review ledger');
 return {...loc,data,loadedHash:digest(bytes)};
}
function writeAtomic(loc,data,initial=false,expectedHash=null) {
 const lock=loc.filename+'.lock'; const fd=fs.openSync(lock,'wx');
 const temp=loc.filename+'.'+crypto.randomUUID()+'.tmp';
 try {
   if(initial && fs.existsSync(loc.filename)) fail('Ledger already exists');
   if(expectedHash && digest(fs.readFileSync(loc.filename))!==expectedHash) fail('Ledger changed concurrently; retry from current state');
   fs.writeFileSync(temp,JSON.stringify(data,null,2)+'\n',{flag:'wx'});
   fs.renameSync(temp,loc.filename);
 } finally {if(fs.existsSync(temp))fs.unlinkSync(temp);fs.closeSync(fd);fs.unlinkSync(lock);}
}
function mutate(filename,fn) {
 const loc=load(filename);const before=loc.loadedHash;
 const result=fn(loc);
 if(digest(fs.readFileSync(loc.filename))!==before) fail('Ledger changed concurrently; retry from current state');
 writeAtomic(loc,loc.data,false,before);return result;
}
function latest(data,kind,id) {return data.artifacts.filter(a=>a.kind===kind&&a.id===id).at(-1);}
// New rendered artifacts do not inherit creative approval of planning prose.
// Historical dependency arrays retain their original verification semantics.
function sourceShotReferences(loc,includedShots) {
 const shots=new Map();for(const a of loc.data.artifacts)if(a.kind==='shot')shots.set(a.id,a);
 const refs=includedShots===undefined?[...shots.values()].map(a=>({id:a.id,revision:a.revision,fingerprint:a.fingerprint})):includedShots;
 if(!Array.isArray(refs))fail('includedShots must be an array of exact {id, revision, fingerprint} references');
 const ids=new Set();
 return refs.map(ref=>{
  if(!ref||typeof ref!=='object')fail('Included shot reference must be an object');
  if(ids.has(ref.id))fail('Duplicate included shot: '+ref.id);ids.add(ref.id);
  const a=shots.get(ref.id);
  if(!a||a.revision!==ref.revision||a.fingerprint!==ref.fingerprint)fail('Included shot is not the current exact revision: '+ref.id);
  if(!verify(loc,a).current)fail('Included shot is stale: '+ref.id);
  validateUnapprovedShot(loc,a);
  return {kind:'shot',id:a.id,revision:a.revision,fingerprint:a.fingerprint};
 });
}
function validateUnapprovedShot(loc,a) {
 if(a.approval)return;
 if(![1,2].includes(a.registrationSchemaVersion))fail('Legacy unapproved shot has an unvalidated dependency inventory. Regenerate its descriptor and register a new revision before review and approval; existing approved records remain preserved.');
 if(fs.existsSync(path.join(loc.root,'PROJECT.json'))&&a.registrationSchemaVersion!==2)fail('Unapproved shot lacks render-time provenance. Rerender a new version through workflow animation render video, regenerate its descriptor and register it; approved history is preserved.');
}
function verify(loc,a,seen=new Set()) {
 const issues=[];if(seen.has(a.fingerprint))return {current:false,issues:['Circular dependency']};seen.add(a.fingerprint);
 for(const f of a.files) {
  try {if(inputRecord(loc.root,f.path,f.projection).sha256!==f.sha256)issues.push('Changed file: '+f.path);}catch(e){issues.push(e.message);}
 }
 for(const d of a.dependencies) {
  const current=latest(loc.data,d.kind,d.id);
  if(!current||current.fingerprint!==d.fingerprint||!current.approval)issues.push('Changed or unapproved dependency: '+d.kind+':'+d.id);
  else if(!verify(loc,current,new Set(seen)).current)issues.push('Stale dependency: '+d.kind+':'+d.id);
 }
 if(a.kind==='cut' && a.shotSelection!=='explicit') {
  const currentShots=new Map();for(const s of loc.data.artifacts)if(s.kind==='shot')currentShots.set(s.id,s);
  for(const s of currentShots.values())if(!a.dependencies.some(d=>d.kind==='shot'&&d.id===s.id&&d.fingerprint===s.fingerprint))issues.push('New or changed shot: '+s.id);
 }
 return {current:!issues.length,issues};
}
export function init(filename,purpose='production') {
 if(!['production','synthetic-test'].includes(purpose))fail('Purpose must be production or synthetic-test');
 const loc=ledgerFile(filename); const data={schema:1,purpose,notice:'Approval entries record supplied human evidence; this file cannot authenticate a reviewer. Synthetic-test records are not user approvals.',artifacts:[],imports:[]};
 writeAtomic(loc,data,true);return data;
}
export function probe(media,ffprobe=process.env.FFPROBE_PATH||'ffprobe') {
 const raw=JSON.parse(execFileSync(ffprobe,['-v','error','-show_streams','-show_format','-of','json',media],{encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024}));
 const v=raw.streams?.find(s=>s.codec_type==='video');if(!v)fail('No video stream');
 const duration=Number(v.duration||raw.format?.duration);
 const fps=v.avg_frame_rate;const [n,d]=String(fps).split('/').map(Number);
 if(!(duration>0&&v.width>0&&v.height>0&&n>0&&d>0))fail('Invalid measured media metadata');
 return {duration,width:v.width,height:v.height,fps,frames:v.nb_frames?Number(v.nb_frames):null,codec:v.codec_name,audio:raw.streams.some(s=>s.codec_type==='audio')};
}
function validateDescriptor(kind, descriptor) {
 if(!descriptor || typeof descriptor!=='object' || Array.isArray(descriptor))fail('Descriptor must be an object');
 const allowed=new Set(['files','media','engineRevision','renderSettings','provenance','renderReceipt',...(kind==='cut'?['includedShots']:[])]);
 for(const key of Object.keys(descriptor))if(!allowed.has(key))fail(`Unsupported descriptor field "${key}". List every source/config/brand/font/engine asset path in files; dependencies is reserved for ledger artifact references. Use generateShotDescriptor to inventory a shot.`);
 if(!Array.isArray(descriptor.files)||!descriptor.files.length||descriptor.files.some(f=>typeof f!=='string'||!f))fail('List every source/config/asset dependency in files as nonempty paths');
 if(descriptor.media!==undefined&&(typeof descriptor.media!=='string'||!descriptor.media))fail('media must be a nonempty project-relative path');
 if(descriptor.engineRevision!==undefined&&(typeof descriptor.engineRevision!=='string'||!descriptor.engineRevision.trim()))fail('engineRevision must be a nonempty string');
 if(descriptor.renderSettings!==undefined&&(!descriptor.renderSettings||typeof descriptor.renderSettings!=='object'||Array.isArray(descriptor.renderSettings)))fail('renderSettings must be an object');
 if(descriptor.provenance!==undefined&&typeof descriptor.provenance!=='string')fail('provenance must be a string');
}
/** Conservative inventory: shared animation engine changes also stale the shot. No historical ledgers are rewritten. */
export function animationSourceInventory(projectRoot, {files=[],manifestProjection=true}={}) {
 const options={files};
 const requested=path.resolve(projectRoot);
 if(fs.lstatSync(requested).isSymbolicLink())fail('Project cannot be a symlink');
 const root=fs.realpathSync(requested),manifestPath=inside(root,'PROJECT.json');
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 const names=new Set(['PROJECT.json']),animation=relativeName(manifest.animationProject||'animation').replace(/\/$/,'');
 const skipped=new Set(['node_modules','.git','.cache','.vite','.vite-temp','dist','build','out','output','outputs','renders','render-output','coverage','screenshots','frame-strips','evidence']);
 function walk(relative) {
  const filename=inside(root,relative,false),stat=fs.lstatSync(filename);
  if(stat.isSymbolicLink())fail('Symlinks are not supported: '+relative);
  if(stat.isDirectory()) {
   for(const entry of fs.readdirSync(filename,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
    // Generated/tool exclusions apply only at workspace/app roots, never within source, public assets or brand data.
    if(entry.name==='.DS_Store'||([animation,animation+'/app'].includes(relativeName(relative))&&skipped.has(entry.name)))continue;
    walk(relativeName(relative)+'/'+entry.name);
   }
  } else if(stat.isFile())names.add(relativeName(relative));
  else fail('Unsupported dependency file type: '+relative);
 }
 walk(manifest.animationProject||'animation');
 if(manifest.brand)walk('brand');
 if(options.files!==undefined&&!Array.isArray(options.files))fail('files must be an array');
 for(const extra of options.files||[])names.add(relativeName(extra));
 return [...names].sort().map(name=>inputRecord(root,name,name==='PROJECT.json'&&manifestProjection?'animation-project-v1':undefined));
}
export function generateShotDescriptor(projectRoot, options) {
 if(!options||typeof options!=='object'||Array.isArray(options))fail('Descriptor options must be an object');
 const allowed=new Set(['media','engineRevision','renderSettings','provenance','files']);
 for(const key of Object.keys(options||{}))if(!allowed.has(key))fail(`Unsupported descriptor option "${key}". SETTINGS.json accepts required engineRevision (string) and renderSettings (object), plus optional provenance (string) and files (project-relative paths). MEDIA is provided as the command argument. Registration infers the receipt from <media>.render.json; do not include renderReceipt or project-specific config keys.`);
 if(typeof options.media!=='string'||!options.media.trim())fail('Descriptor field "media" must be a nonempty project-relative file path');
 if(typeof options.engineRevision!=='string'||!options.engineRevision.trim())fail('Descriptor field "engineRevision" must be a nonempty string');
 if(!options.renderSettings||typeof options.renderSettings!=='object'||Array.isArray(options.renderSettings))fail('Descriptor field "renderSettings" must be an object');
 if(options.provenance!==undefined&&typeof options.provenance!=='string')fail(`Descriptor field "provenance" must be a string (received ${options.provenance===null?'null':Array.isArray(options.provenance)?'array':typeof options.provenance})`);
 if(options.files!==undefined&&!Array.isArray(options.files))fail('Descriptor field "files" must be an array of project-relative file paths');
 if(fs.lstatSync(path.resolve(projectRoot)).isSymbolicLink())fail('Project cannot be a symlink');
 const root=fs.realpathSync(projectRoot), names=new Set(animationSourceInventory(root,options).map(f=>f.path));
 const media=relativeName(options.media);inside(root,media);names.add(media);
 const descriptor={files:[...names].sort(),media,engineRevision:options.engineRevision,renderSettings:options.renderSettings,provenance:options.provenance??'Generated conservative animation source, configuration, engine and pinned brand inventory'};
 validateDescriptor('shot',descriptor);
 if(!descriptor.engineRevision||!descriptor.renderSettings)fail('Shot requires engineRevision and renderSettings');
 for(const name of descriptor.files)inside(root,name);
 descriptor.renderReceipt=relativeName(options.media)+'.render.json';
 const receipt=verifyRenderReceipt(root,descriptor.media,descriptor.renderReceipt);
 for(const file of receipt.inputs)if(!names.has(file.path))fail('Descriptor omits render dependency: '+file.path);
 for(const extra of options.files||[])if(!receipt.inputs.some(file=>file.path===relativeName(extra)))fail('Extra dependency was not inventoried at render time: '+extra+'. Copy required inputs inside animation source/public or the pinned brand before rendering; external descriptor-only dependencies are unsupported.');
 descriptor.files.push(descriptor.renderReceipt);descriptor.files.sort();
 return descriptor;
}
/** Before/after inventories detect persistent edits, not edit-and-revert races or malicious receipt forgery. */
export function beginAnimationRender(projectRoot,media,args) {
 const root=fs.realpathSync(projectRoot);inside(root,media,false);inside(root,media+'.render.json',false);
 const manifest=JSON.parse(fs.readFileSync(inside(root,'PROJECT.json'),'utf8')),animation=relativeName(manifest.animationProject||'animation');
 const relativeOutput=media.startsWith(animation+'/')?media.slice(animation.length+1):null;
 if(relativeOutput!==null&&!/^(?:app\/)?(?:out|output|outputs|renders|render-output)\//.test(relativeOutput))fail('Render outputs inside animation source must use an excluded output directory such as animation/out');
 if(fs.existsSync(path.join(root,media))||fs.existsSync(path.join(root,media+'.render.json')))fail('Render output or receipt already exists; choose a new version');
 const inputs=animationSourceInventory(root);
 // Renderer resolves --audio relative to animation/app. Keep effective audio within
 // the source inventory so the normal before/after and later stale checks cover it.
 const audioFlags=args.filter(arg=>arg==='--audio');
 if(args.some(arg=>typeof arg==='string'&&arg.startsWith('--audio=')))fail('Use --audio FILE with a file inside animation/app/public');
 if(audioFlags.length>1)fail('Supply --audio only once');
 if(audioFlags.length&&!args.includes('--noaudio')) {
  const value=args[args.indexOf('--audio')+1];
  if(typeof value!=='string'||!value||value.startsWith('--'))fail('Missing --audio file');
  const base=path.resolve(projectRoot),audio=path.resolve(base,animation,'app',value);
  const anchor=audio===root||audio.startsWith(root+path.sep)?root:base;
  const name=path.relative(anchor,audio).split(path.sep).join('/');
  if(!inputs.some(file=>file.path===name))fail('Render audio is not inventoried. Copy it into animation/app/public and use --audio public/<file> (or its absolute path).');
 }
 return {schema:2,status:'started',createdAt:new Date().toISOString(),media:relativeName(media),arguments:args,inputs};
}
export function finishAnimationRender(projectRoot,started) {
 const root=fs.realpathSync(projectRoot),after=animationSourceInventory(root,{manifestProjection:started.schema===2});
 // Outputs under the source tree are excluded explicitly; all other membership changes fail.
 const inputs=after.filter(f=>f.path!==started.media);
 if(jsonHash(inputs)!==jsonHash(started.inputs))fail('Animation source changed during render; preserve output for diagnosis and rerender a new version from stable source');
 const receipt={...started,status:'rendered',completedAt:new Date().toISOString(),afterInputs:inputs,output:fileRecord(root,started.media),notice:'Conservative source inventory; schema 2 projects exclude only name, createdAt, creationContext, interactionLog, workflow and studioRuntime from the versioned PROJECT.json projection. Unknown manifest fields remain inputs. Installed node_modules, external resources and edit-and-revert races are not attested. Not creative approval.'};
 fs.writeFileSync(inside(root,started.media+'.render.json',false),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
 return receipt;
}
export function verifyRenderReceipt(projectRoot,media,receiptName=media+'.render.json') {
 const root=fs.realpathSync(projectRoot);let receipt;
 try {receipt=JSON.parse(fs.readFileSync(inside(root,receiptName),'utf8'));}catch(error){fail('Missing or invalid render-time provenance. Rerender this shot through workflow animation render video to a new output version, then regenerate its descriptor. '+error.message);}
 if(![1,2].includes(receipt.schema)||receipt.status!=='rendered'||receipt.media!==media||!Array.isArray(receipt.inputs)||!receipt.inputs.length||jsonHash(receipt.inputs)!==jsonHash(receipt.afterInputs))fail('Invalid render-time provenance receipt');
 if(jsonHash(fileRecord(root,media))!==jsonHash(receipt.output))fail('Rendered media differs from render-time provenance; rerender a new version');
 for(const file of receipt.inputs)if(jsonHash(inputRecord(root,file.path,file.projection))!==jsonHash(file))fail('Source changed since render: '+file.path+'. Rerender a new version before registration.');
 const current=animationSourceInventory(root,{manifestProjection:receipt.schema===2}).filter(f=>f.path!==media&&f.path!==receiptName);
 // Old renders and their receipts are artifacts, never animation inputs.
 if(jsonHash(current)!==jsonHash(receipt.inputs))fail('Animation source membership changed since render; rerender a new version before registration');
 return receipt;
}
export function register(filename,kind,id,descriptor,{ffprobe}={}) {
 if(!['storyboard','shot','cut'].includes(kind)||!idPattern.test(id))fail('Invalid artifact kind or ID');
 if(kind!=='shot'&&id!=='main')fail('Storyboard and cut ID must be main');
 validateDescriptor(kind,descriptor);
 return mutate(filename,loc=>{
  if(!Array.isArray(descriptor.files)||!descriptor.files.length)fail('List every source/config/asset dependency in files');
  descriptor={...descriptor,media:relativeName(descriptor.media)};
  let renderReceipt=null;
  if(kind==='shot'&&fs.existsSync(path.join(loc.root,'PROJECT.json'))) {
   renderReceipt=verifyRenderReceipt(loc.root,descriptor.media,descriptor.renderReceipt);
   const listed=new Set(descriptor.files.map(relativeName));
   for(const file of renderReceipt.inputs)if(!listed.has(file.path))fail('Descriptor omits render dependency: '+file.path);
   const attested=new Set([...renderReceipt.inputs.map(file=>file.path),descriptor.media,descriptor.renderReceipt||descriptor.media+'.render.json']);
   for(const file of listed)if(!attested.has(file))fail('Descriptor dependency was not inventoried at render time: '+file+'. Move required inputs inside animation source/public before rerendering.');
   descriptor.files=[...descriptor.files,descriptor.renderReceipt||descriptor.media+'.render.json'];
  }
  const names=[...new Set(descriptor.files.map(relativeName))];if(descriptor.media&&!names.includes(descriptor.media))names.push(descriptor.media);
  const files=names.sort().map(f=>inputRecord(loc.root,f,renderReceipt?.inputs.find(input=>input.path===f)?.projection));
  if(kind!=='storyboard'&&!descriptor.media)fail('Shot/cut requires a rendered media path');
  if(kind==='shot' && (!descriptor.engineRevision||!descriptor.renderSettings))fail('Shot requires engineRevision and renderSettings');
  const deps=[],sourceShots=kind==='cut'?sourceShotReferences(loc,descriptor.includedShots):[],revision=(latest(loc.data,kind,id)?.revision||0)+1;
  const artifact={kind,id,revision,files,dependencies:deps,media:descriptor.media||null,metadata:descriptor.media?probe(inside(loc.root,descriptor.media),ffprobe):null,engineRevision:descriptor.engineRevision||null,renderSettings:descriptor.renderSettings||null,provenance:descriptor.provenance||'',registeredAt:new Date().toISOString()};
  if(kind==='shot'){artifact.registrationSchemaVersion=renderReceipt?2:1;if(renderReceipt)artifact.renderReceipt=descriptor.renderReceipt||descriptor.media+'.render.json';}
  if(kind==='cut') {
   artifact.sourceSnapshot={files:artifact.files,shots:sourceShots,storyboard:latest(loc.data,'storyboard','main')?.fingerprint||null,notice:'Provenance snapshot, not an approval dependency or independent component approval.'};
   artifact.files=[fileRecord(loc.root,descriptor.media)];
   artifact.approvalBinding='rendered-media';artifact.shotSelection='explicit';
  }
  artifact.fingerprint=jsonHash(artifact);artifact.approval=null;
  loc.data.artifacts.push(artifact);return artifact;
 });
}
export function approve(filename,kind,id,evidence) {
 return mutate(filename,loc=>{
  const a=latest(loc.data,kind,id);if(!a)fail('Artifact not found');
  if(a.kind==='shot'&&!a.approval&&![1,2].includes(a.registrationSchemaVersion))fail('Legacy unapproved shot has an unvalidated dependency inventory. Regenerate its descriptor and register a new revision before review and approval; existing approved records remain preserved.');
  if(a.kind==='shot'&&!a.approval&&fs.existsSync(path.join(loc.root,'PROJECT.json'))&&a.registrationSchemaVersion!==2)fail('Unapproved shot lacks render-time provenance. Rerender a new version through workflow animation render video, regenerate its descriptor and register it; approved history is preserved.');
  if(!verify(loc,a).current)fail('Artifact or dependency changed; register and review again');
  if(!evidence?.reviewer?.trim()||!evidence?.statement?.trim()||evidence.fingerprint!==a.fingerprint)fail('Approval requires reviewer, statement and exact fingerprint');
  if(a.approval)fail('Already approved; preserve the original evidence');
  a.approval={...evidence,recordedAt:new Date().toISOString(),scope:loc.data.purpose};return a.approval;
 });
}
export function status(filename) {
 const loc=load(filename);const current=new Map();for(const a of loc.data.artifacts)current.set(a.kind+':'+a.id,a);
 return {purpose:loc.data.purpose,artifacts:[...current.values()].map(a=>({kind:a.kind,id:a.id,revision:a.revision,fingerprint:a.fingerprint,approved:!!a.approval,...verify(loc,a)}))};
}
export function importShot(filename,id,project,{reviewOnly=false}={}) {
 if(typeof reviewOnly!=='boolean')fail('reviewOnly must be a boolean');
 const loc=load(filename),a=latest(loc.data,'shot',id);if(!a||(!reviewOnly&&!a.approval)||!verify(loc,a).current)fail('Shot is missing, unapproved or stale');
 validateUnapprovedShot(loc,a);
 const resolved=path.resolve(project);if(fs.lstatSync(resolved).isSymbolicLink())fail('Project cannot be a symlink');
 const root=fs.realpathSync(resolved);inside(root,'index.html');
 if(reviewOnly&&!root.startsWith(loc.root+path.sep))fail('Review-only staging must remain inside its source project');
 if(loc.data.purpose==='synthetic-test'&&!fs.existsSync(path.join(root,'.synthetic-test')))fail('Synthetic approvals may only import into a marked test project');
 const assets=inside(root,'assets/animations',false);fs.mkdirSync(assets,{recursive:true});
 const media=a.files.find(f=>f.path===a.media),ext=path.extname(a.media).toLowerCase();if(!['.mp4','.mov','.webm'].includes(ext))fail('Unsupported media extension');
 const rel='assets/animations/'+id+'-r'+a.revision+'-'+media.sha256.slice(0,16)+ext;
 const destination=inside(root,rel,false),source=inside(loc.root,a.media);
 let created=false;
 try {
  fs.copyFileSync(source,destination,fs.constants.COPYFILE_EXCL);created=true;
  if(digest(fs.readFileSync(destination))!==media.sha256)fail('Media changed while copying');
  if(a.kind==='shot'&&!a.approval&&fs.existsSync(path.join(loc.root,'PROJECT.json'))&&a.registrationSchemaVersion!==2)fail('Unapproved shot lacks render-time provenance. Rerender a new version through workflow animation render video, regenerate its descriptor and register it; approved history is preserved.');
  if(!verify(loc,a).current)fail('Source changed while importing');
  const receipt={shot:id,revision:a.revision,fingerprint:a.fingerprint,sha256:media.sha256,relativeMediaPath:rel,project:root,projectRelativePath:root.startsWith(loc.root+path.sep)?path.relative(loc.root,root).split(path.sep).join('/'):null,metadata:a.metadata,purpose:loc.data.purpose,reviewOnly,importedAt:new Date().toISOString(),note:'Only this asset was copied. Native HTML and editorial changes were not modified.'};
  mutate(filename,current=>{const now=latest(current.data,'shot',id);if(now?.fingerprint!==a.fingerprint||(!reviewOnly&&!now.approval)||!verify(current,now).current)fail('Shot changed concurrently');current.data.imports.push(receipt);});
  return receipt;
 }catch(e){if(created&&fs.existsSync(destination))fs.unlinkSync(destination);throw e;}
}
export const help=`Local animation handoff (Node 22+):
  init LEDGER [production|synthetic-test]
  register LEDGER storyboard|shot|cut ID DESCRIPTOR.json
  status LEDGER
  approve LEDGER storyboard|shot|cut ID EVIDENCE.json
  import LEDGER SHOT_ID NATIVE_PROJECT [--review-only]
Review-only staging accepts current validated shots inside the source project; it grants no approval.
Paths in descriptors are relative to the ledger directory; symlinks/traversal rejected.
Descriptor: {files:[source/config/assets...], media:"render.mp4", engineRevision:"...", renderSettings:{...}, provenance:"..."}
Storyboard uses ID main and files (no media needed); cut uses ID main and media plus a provenance snapshot of native source/assets. New cut approvals bind only the rendered media bytes.
Cut includedShots:[{id,revision,fingerprint}] pins the actual included shot set (empty allowed).
Omitting includedShots snapshots current shots. New cuts do not inherit component approvals; historical ledger dependencies remain unchanged.
FFPROBE_PATH selects the media probe executable. Registration records measured metadata.
Evidence: {reviewer:"actual reviewer", statement:"actual decision and source", fingerprint:"exact displayed fingerprint"}
This records supplied evidence, not reviewer authentication. Never invent a decision.
Register changed sources as a new revision. Old records and exports remain preserved.
Synthetic-test ledgers are not human approvals and only import to a project with .synthetic-test.
Import adds one immutable media asset; edit the native HTML separately and preserve other edits.
Keep the ledger and all its listed dependencies together. Generate shot inventories with generateShotDescriptor. Unsupported fields are rejected; asset paths belong in files, never dependencies.`;
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 try {
  const [command,filename,...args]=process.argv.slice(2);let result;
  if(!command||command==='--help'){console.log(help);process.exit(0);}
  if(command==='init')result=init(filename,args[0]);
  else if(command==='status')result=status(filename);
  else if(command==='register')result=register(filename,args[0],args[1],JSON.parse(fs.readFileSync(args[2],'utf8')));
  else if(command==='approve')result=approve(filename,args[0],args[1],JSON.parse(fs.readFileSync(args[2],'utf8')));
  else if(command==='import'){if(args.slice(2).some(arg=>arg!=='--review-only'))fail('Unsupported import option');result=importShot(filename,args[0],args[1],{reviewOnly:args.includes('--review-only')});}
  else fail('Unknown command');console.log(JSON.stringify(result,null,2));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
