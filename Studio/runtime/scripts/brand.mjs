import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {resolveWorkspace} from './workspace.mjs';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const safePart=s=>typeof s==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(s)&&s!=='.'&&s!=='..';
async function safeFile(base,rel){
 if((await fs.lstat(base)).isSymbolicLink())throw Error('Brand symlinks are unsupported');
 if(typeof rel!=='string'||!rel||path.isAbsolute(rel)||rel.includes('\\')||rel.split('/').some(x=>!x||x==='.'||x==='..')||/[\x00-\x1f'"<>]/.test(rel))throw Error('Unsafe brand path');
 let p=base; for(const part of rel.split('/')){p=path.join(p,part);if((await fs.lstat(p)).isSymbolicLink())throw Error('Brand symlinks are unsupported');} return p;
}
export async function readBrandPack(directory){
 if((await fs.lstat(directory)).isSymbolicLink())throw Error('Brand symlinks are unsupported');
 const bytes=await fs.readFile(await safeFile(directory,'brand.json')),m=JSON.parse(bytes);
 if(m.schemaVersion!==1||!safePart(m.id)||!safePart(m.version)||!m.files||!Array.isArray(m.fonts))throw Error('Invalid brand manifest');
 for(const k of ['background','foreground','primary','secondary','accent'])if(!/^#[\da-f]{6}$/i.test(m.tokens?.[k]??''))throw Error('Invalid brand color '+k);
 if(!/^[\w -]{1,80}$/.test(m.tokens.fontFamily??''))throw Error('Invalid brand font family');
 for(const [rel,sha] of Object.entries(m.files)){if(!/^[a-f0-9]{64}$/.test(sha)||hash(await fs.readFile(await safeFile(directory,rel)))!==sha)throw Error('Brand asset hash mismatch: '+rel);}
 if(m.rules!==undefined&&(!Array.isArray(m.rules)||m.rules.some(r=>typeof r!=='string'||!m.files[r])))throw Error('Brand rules must be inventoried');
 if(!m.files[m.assets?.logo])throw Error('Brand logo must be inventoried');
 for(const f of m.fonts)if(!m.files[f.path]||!Number.isInteger(f.weight)||f.weight<100||f.weight>900)throw Error('Invalid brand font');
 if(m.fonts.length&&(!m.fonts.some(f=>f.weight===400)||!m.fonts.some(f=>f.weight===700)))throw Error('Bundled brand fonts require regular 400 and bold 700');
 return {manifest:m,manifestSha256:hash(bytes)};
}
async function copyPack(source,dest,m){await fs.mkdir(dest,{recursive:true});for(const rel of ['brand.json',...Object.keys(m.files)]){const target=path.join(dest,rel);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(await safeFile(source,rel),target);}}
export function brandCSS(m,prefix='../assets/brand/'){
 const url=p=>prefix+p.split('/').map(encodeURIComponent).join('/');
 const family=m.fonts.length?`StudioBrand-${m.id}-${m.version}`:m.tokens.fontFamily;
 return m.fonts.map(f=>`@font-face{font-family:'${family}';src:url('${url(f.path)}');font-weight:${f.weight};font-display:block}`).join('\n')+'\n:root{'+Object.entries(m.tokens).filter(([k])=>['background','foreground','primary','secondary','accent','fontFamily'].includes(k)).map(([k,v])=>`--brand-${k}:${k==='fontFamily'?`'${family}'`:v}`).join(';')+'}\n';
}
export function validateProjectFormat({width=1920,height=1080,duration=8}={}){
 for(const [key,value] of Object.entries({width,height}))if(!Number.isInteger(value)||value<64||value>4096||value%2)throw Error(`${key} must be an even integer from 64 to 4096`);
 if(!Number.isFinite(duration)||duration<=0||duration>86400)throw Error('duration must be greater than zero and at most 86400 seconds');
 return {width,height,duration};
}
export async function pinProjectBrand(projectRoot,runtime,{brand,newProject=false,width=1920,height=1080,duration=8}={}){
 validateProjectFormat({width,height,duration});
 const w=resolveWorkspace(runtime),selected=brand??w.defaultBrand;
 if(!selected)throw Error('No output brand selected. Set STUDIO.json defaultBrand or pass --brand id/version; Studio Brand Packs is the source for new projects.');
 if(!newProject)throw Error('Brand pinning is creation-only; existing projects cannot be rebranded implicitly');
 const [id,version]=typeof selected==='string'?selected.split('/'): [selected.id,selected.version];
 if(!safePart(id)||!safePart(version)||(typeof selected==='string'&&selected.split('/').length!==2))throw Error('Choose brand as id/version');
 let source,pack;
 try {source=await safeFile(w.brands,`${id}/${version}`);pack=await readBrandPack(source);}
 catch(error){throw Error(`Cannot load selected output brand ${id}/${version} from ${w.brands}: ${error.message}. Restore the configured Studio Brand Packs entry; legacy runtime assets are never a fallback.`);}
 const {manifest:m,manifestSha256}=pack;
 if(m.id!==id||m.version!==version)throw Error('Brand selection and manifest disagree');
 const dest=path.join(projectRoot,'brand');await fs.mkdir(dest);await copyPack(source,dest,m);
 const identity={id,version,manifestSha256},projectFile=path.join(projectRoot,'PROJECT.json'),project=JSON.parse(await fs.readFile(projectFile,'utf8'));project.brand=identity;
 await fs.writeFile(projectFile,JSON.stringify(project,null,2)+'\n');
 const native=path.join(projectRoot,project.nativeProject||'hyperframes');
 // New project skeleton is generated from this snapshot; no bundled brand is consulted.
 await fs.rm(path.join(native,'compositions'),{recursive:true,force:true});
 await fs.rm(path.join(native,'assets'),{recursive:true,force:true});
 await copyPack(dest,path.join(native,'assets/brand'),m);
 await fs.mkdir(path.join(native,'styles'),{recursive:true});await fs.writeFile(path.join(native,'styles/brand.css'),brandCSS(m));
 await fs.writeFile(path.join(native,'index.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Video project</title><style data-studio-brand>${brandCSS(m,'assets/brand/')}</style><style>html,body{margin:0;width:100%;height:100%}#root{position:relative;width:100%;height:100%;overflow:hidden;background:var(--brand-background);color:var(--brand-foreground);font-family:var(--brand-fontFamily),sans-serif}.brand-logo{position:absolute;left:10%;top:10%;width:12%;height:20%;object-fit:contain}.title{position:absolute;left:10%;bottom:18%;font-size:72px;font-weight:700}</style></head><body><div id="root" data-no-timeline data-composition-id="main" data-width="${width}" data-height="${height}" data-duration="${duration}"><div class="title">Your story starts here.</div></div><script>window.__timelines=window.__timelines||{};</script></body></html>\n`);
 return identity;
}
export async function materializeAnimationBrand(projectRoot,animationRoot){
 let identity;try{identity=JSON.parse(await fs.readFile(path.join(projectRoot,'PROJECT.json'),'utf8')).brand;}catch(e){if(e.code==='ENOENT')return null;throw e;}if(!identity)return null;
 const source=path.join(projectRoot,'brand'),{manifest:m,manifestSha256}=await readBrandPack(source);
 if(identity.id!==m.id||identity.version!==m.version||identity.manifestSha256!==manifestSha256)throw Error('Pinned project brand changed');
 await copyPack(source,path.join(animationRoot,'app/public/brand'),m);return identity;
}

// Read-only integrity gate. Generated engine assets must remain exact copies of the
// project snapshot; this never repairs or silently changes a reviewed project.
export async function verifyProjectBrandCopies(projectRoot,{engine='native',animationRoot}={}){
 let project;
 try {project=JSON.parse(await fs.readFile(path.join(projectRoot,'PROJECT.json'),'utf8'));}
 catch(error){if(error.code==='ENOENT')return null;throw error;}
 if(!project.brand)return null; // Original unpinned films retain their historical assets.
 if(!['native','animation'].includes(engine))throw Error('Unknown brand engine: '+engine);
 try {
  const snapshot=await readBrandPack(path.join(projectRoot,'brand'));
  if(project.brand.id!==snapshot.manifest.id||project.brand.version!==snapshot.manifest.version||project.brand.manifestSha256!==snapshot.manifestSha256)throw Error('Pinned project brand identity or manifest changed');
  const target=engine==='native'?await safeFile(projectRoot,`${project.nativeProject||'hyperframes'}/assets/brand`):path.join(animationRoot||path.join(projectRoot,project.animationProject||'animation'),'app/public/brand');
  const copy=await readBrandPack(target);
  if(copy.manifestSha256!==snapshot.manifestSha256)throw Error('Generated brand manifest differs from pinned snapshot');
  return {engine,brand:project.brand,verified:true};
 }catch(error){throw Error(`Output brand integrity failed (${engine}): ${error.message}. Restore the exact pinned snapshot and generated assets from a trusted backup, or make an explicit reviewed brand revision; no automatic rebranding was performed.`);}
}
