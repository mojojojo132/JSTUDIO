#!/usr/bin/env node
/** Static native-HTML finishing preflight; never rewrites a composition. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {probe,status} from './animation-handoff.mjs';
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const fail=m=>{throw new Error(m);};
function local(root,name){
 if(typeof name!=='string'||!name||path.isAbsolute(name)||name.split(/[\\/]/).includes('..')||/^[a-z]+:/i.test(name))fail('Expected project-relative local path: '+name);
 const resolved=path.resolve(root,name);let cursor=root;
 for(const part of path.relative(root,resolved).split(path.sep)){cursor=path.join(cursor,part);if(fs.lstatSync(cursor).isSymbolicLink())fail('Symlink unsupported: '+name);}
 return resolved;
}
const rate=v=>{const parts=String(v).split('/').map(Number);const n=parts[0]/(parts[1]??1);if(!Number.isFinite(n)||n<=0)fail('Invalid frame rate');return n;};
const close=(a,b)=>Math.abs(a-b)<1e-6;
const mediaRangeTolerance=1e-6;
function rangeError(kind,id,file,duration,start,end){
 const overrun=end-duration;
 fail(`Source range exceeds measured ${kind} for "${id}" (file: ${file}): actualDurationSeconds=${duration.toFixed(9)}; requestedSourceRangeSeconds=[${start.toFixed(9)}, ${end.toFixed(9)}]; overrunSeconds=${overrun.toFixed(9)} (${(overrun*1000).toFixed(6)} ms); allowedToleranceSeconds=${mediaRangeTolerance}.`);
}
// Parse declarative tags only. Scripts/styles/comments cannot masquerade as media.
function tags(html){
 const clean=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
 return [...clean.matchAll(/<([a-z][\w:-]*)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)].map(m=>{
  const a={};for(const x of m[2].matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)){const key=x[1].toLowerCase();if(key in a)fail('Duplicate HTML attribute: '+key);a[key]=x[2]??x[3]??x[4]??'';}
  return {tag:m[1].toLowerCase(),a};
 });
}
export function preflight(project,contract,{ffprobe,reviewOnly=false}={}){
 if(typeof reviewOnly!=='boolean')fail('reviewOnly must be a boolean');
 const root=fs.realpathSync(project),c=typeof contract==='string'?JSON.parse(fs.readFileSync(local(root,contract),'utf8')):contract;
 if(c?.schema!==1||!Array.isArray(c.shots)||!c.master)fail('Exchange requires schema 1, master and shots');
 if(c.reviewOnly!==undefined&&typeof c.reviewOnly!=='boolean')fail('Exchange reviewOnly must be a boolean');
 if(c.reviewOnly&&!reviewOnly)fail('Review-only exchange requires an explicit review-only invocation');
 const fps=rate(c.master.fps);for(const k of ['width','height'])if(!Number.isInteger(c.master[k])||c.master[k]<=0)fail('Invalid master '+k);
 if(!['silent-for-finishing','embedded'].includes(c.audioPolicy))fail('Explicit audioPolicy required');
 const native=local(root,c.nativeRoot||'hyperframes');
 const projectJson=path.join(root,'PROJECT.json');
 if(fs.existsSync(projectJson)){
  const brand=JSON.parse(fs.readFileSync(projectJson,'utf8')).brand;
  if(brand){
   const brandRoot=local(root,'brand'),manifestPath=local(brandRoot,'brand.json');
   if(c.brandSha256!==brand.manifestSha256||hash(manifestPath)!==brand.manifestSha256)fail('Brand snapshot mismatch');
   const pack=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
   if(pack.id!==brand.id||pack.version!==brand.version)fail('Brand identity mismatch');
   const nativeBrand=local(native,'assets/brand');
   if(hash(local(nativeBrand,'brand.json'))!==brand.manifestSha256)fail('Native brand snapshot mismatch');
   for(const [name,sha] of Object.entries(pack.files||{})){
    if(hash(local(brandRoot,name))!==sha)fail('Changed brand asset: '+name);
    if(hash(local(nativeBrand,name))!==sha)fail('Changed native brand asset: '+name);
   }
  }
 }
 const ledgerPath=local(root,c.ledger),ledger=JSON.parse(fs.readFileSync(ledgerPath,'utf8')),state=status(ledgerPath);
 if(path.dirname(ledgerPath)!==root)fail('Exchange ledger must live at project root');
 const documents=new Map(),videos=[],audio=[];
 // Omitted host durations are meaningful: Editor infers those slots from the
 // mounted composition. Only authored host durations create a static upper
 // bound here; mapped media still has to fit every such visible window.
 function visit(name,offset=0,stack=[],window={start:0,end:Infinity}){
  if(stack.includes(name))fail('Circular linked composition');if(documents.has(name))fail('Repeated linked composition requires separate explicit preflight: '+name);
  const file=local(native,name),ts=tags(fs.readFileSync(file,'utf8'));documents.set(name,hash(file));
  for(const t of ts){
   if(t.tag==='video')videos.push({...t,html:name,offset,window});
   if(t.tag==='audio')audio.push({...t,html:name,offset,window});
   if(t.a['data-composition-src']){
    const rawStart=t.a['data-start'],start=rawStart===undefined?0:Number(rawStart);
    if(!Number.isFinite(start)||start<0)fail('Invalid linked composition placement: '+t.a['data-composition-src']);
    const rawDuration=t.a['data-duration'],duration=rawDuration===undefined?null:Number(rawDuration);
    if(duration!==null&&(!Number.isFinite(duration)||duration<=0))fail('Invalid linked composition duration: '+t.a['data-composition-src']);
    const absoluteStart=offset+start,absoluteEnd=duration===null?window.end:Math.min(window.end,absoluteStart+duration);
    const childWindow={start:Math.max(window.start,absoluteStart),end:absoluteEnd};
    const child=path.posix.normalize(path.posix.join(path.posix.dirname(name),t.a['data-composition-src']));
    visit(child,absoluteStart,[...stack,name],childWindow);
   }
  }
  return ts;
 }
 const main=visit(c.entry||'index.html');const canvas=main.find(t=>t.a['data-composition-id']&&t.a['data-width']&&t.a['data-height']);
 if(!canvas||Number(canvas.a['data-width'])!==c.master.width||Number(canvas.a['data-height'])!==c.master.height)fail('Native master canvas mismatch');
 if(canvas.a['data-fps']&&!close(rate(canvas.a['data-fps']),fps))fail('Native master frame rate mismatch');
 const masterDuration=canvas.a['data-duration']===undefined?null:Number(canvas.a['data-duration']);
 if(masterDuration!==null&&(!Number.isFinite(masterDuration)||masterDuration<=0))fail('Invalid native master duration');
 function checkVisibleWindow(v,id){
  const localStart=Number(v.a['data-start']),localDuration=Number(v.a['data-duration']);
  if(!Number.isFinite(localStart)||localStart<0)fail('Invalid native media placement: '+id);
  if(!Number.isFinite(localDuration)||localDuration<=0)fail('Invalid native media duration: '+id);
  const start=v.offset+localStart,end=start+localDuration;
  if(start<v.window.start-1e-6||end>v.window.end+1e-6||v.window.start>v.window.end+1e-6)
   fail('Native media exceeds linked composition visible window: '+id);
 }
 const mapped=new Set(),results=[];
 for(const s of c.shots){
  const matches=videos.filter(v=>v.html===s.html&&v.a.id===s.elementId);if(matches.length!==1)fail('Missing or ambiguous native video: '+s.elementId);
  const v=matches[0];if(mapped.has(v))fail('Duplicate native mapping');mapped.add(v);
  const approved=state.artifacts.find(a=>a.kind==='shot'&&a.id===s.id);
  if(!approved||(!reviewOnly&&!approved.approved)||!approved.current||approved.revision!==s.revision||approved.fingerprint!==s.fingerprint)fail('Stale or unapproved shot: '+s.id);
  const receipts=ledger.imports.filter(r=>r.shot===s.id&&r.revision===s.revision&&r.fingerprint===s.fingerprint&&r.sha256===s.sha256&&(r.projectRelativePath?local(root,r.projectRelativePath):path.resolve(r.project))===native);
  const receipt=receipts.find(r=>reviewOnly||!r.reviewOnly)??receipts[0];
  if(!receipt)fail('Missing immutable import receipt: '+s.id);
  if(receipt.reviewOnly&&!reviewOnly)fail('Review-only import cannot be used for delivery preflight: '+s.id);
  if(!v.a.src)fail('Static video src required for automated preflight: '+s.elementId);
  const mediaName=path.posix.normalize(path.posix.join(path.posix.dirname(s.html),v.a.src));
  if(mediaName!==receipt.relativeMediaPath)fail('Wrong native clip reference: '+s.id);
  const media=local(native,mediaName);if(hash(media)!==s.sha256)fail('Changed imported clip: '+s.id);
  const m=probe(media,ffprobe),sourceFps=rate(m.fps);
  if(!close(sourceFps,fps)&&s.frameRateConversion!=='resample')fail('Undeclared frame-rate conversion: '+s.id);
  if((m.width!==c.master.width||m.height!==c.master.height)&&!['fit','fill'].includes(s.scaling))fail('Undeclared canvas conversion: '+s.id);
  if(c.audioPolicy==='silent-for-finishing'&&m.audio)fail('Embedded audio violates silent policy: '+s.id);
  for(const k of ['startFrame','durationFrames','sourceInFrame'])if(!Number.isInteger(s[k])||s[k]<0)fail('Invalid '+k);
  if(!s.durationFrames)fail('Empty shot range');
  if(masterDuration!==null&&(s.startFrame+s.durationFrames)/fps>masterDuration+1e-6)fail('Shot exceeds native master duration: '+s.id);
  const speed=Number(v.a['data-playback-rate']||1);if(!Number.isFinite(speed)||speed<=0)fail('Invalid playback rate');
  if(!close(speed,s.playbackRate??1))fail('Native playback rate mismatch: '+s.id);
  if(v.a['data-automation'])fail('Automated media rate requires rendered verification: '+s.id);
  checkVisibleWindow(v,s.id);
  if(!close(Number(v.a['data-start'])+v.offset,s.startFrame/fps)||!close(Number(v.a['data-duration']),s.durationFrames/fps)||!close(Number(v.a['data-media-start']||0),s.sourceInFrame/sourceFps))fail('Native timeline/source range mismatch: '+s.id);
  const sourceIn=s.sourceInFrame/sourceFps,end=sourceIn+s.durationFrames/fps*speed;
  if(end>m.duration+mediaRangeTolerance)rangeError('video',s.id,mediaName,m.duration,sourceIn,end);
  results.push({id:s.id,revision:s.revision,sha256:s.sha256,metadata:m});
 }
 for(const v of videos){if(v.a.src&&/assets\/animations\//.test(path.posix.normalize(path.posix.join(path.posix.dirname(v.html),v.a.src)))&&!mapped.has(v))fail('Unmapped animation clip: '+v.a.id);}
 const mediaFiles=[];
 if(c.media!==undefined&&!Array.isArray(c.media))fail('Exchange media must be an array');
 for(const binding of c.media||[]){
  if(!['video','audio'].includes(binding.kind))fail('Media kind must be video or audio');
  const matches=[...videos,...audio].filter(v=>v.tag===binding.kind&&v.html===binding.html&&v.a.id===binding.elementId);
  if(matches.length!==1)fail('Missing or ambiguous native media: '+binding.elementId);
  const v=matches[0];if(mapped.has(v))fail('Duplicate native mapping');mapped.add(v);
  if(!v.a.src)fail('Static media src required: '+binding.elementId);
  const mediaName=path.posix.normalize(path.posix.join(path.posix.dirname(v.html),v.a.src));
  if(mediaName!==binding.path)fail('Wrong native media reference: '+binding.elementId);
  if(/(^|\/)assets\/animations\//.test(mediaName))fail('Animation media requires approved shot mapping');
  const file=local(native,mediaName),sha256=hash(file);
  // Relabeling an imported or registered animation as footage cannot bypass its approval.
  if((ledger.imports||[]).some(r=>r.sha256===sha256)||(ledger.artifacts||[]).some(a=>a.kind==='shot'&&(a.files||[]).some(f=>f.sha256===sha256)))fail('Animation media requires approved shot mapping');
  if(!/^[a-f0-9]{64}$/.test(binding.sha256||'')||sha256!==binding.sha256)fail('Changed native media: '+binding.elementId);
  const decoded=spawnSync(ffprobe||process.env.FFPROBE_PATH||'ffprobe',['-v','error','-show_streams','-show_format','-count_frames','-of','json',file],{encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});
  if(decoded.error||decoded.status!==0||decoded.stderr?.trim())fail('Undecodable native media: '+binding.elementId);
  const raw=JSON.parse(decoded.stdout);
  const stream=raw.streams?.find(s=>s.codec_type===binding.kind),duration=Number(stream?.duration??raw.format?.duration);
  if(!stream||!Number.isFinite(duration)||duration<=0||!Number.isFinite(Number(stream.nb_read_frames))||Number(stream.nb_read_frames)<=0)fail('Empty or undecodable native media: '+binding.elementId);
  if(!Number.isInteger(binding.startFrame)||binding.startFrame<0)fail('Invalid media startFrame');
  const exactAudio=binding.kind==='audio'&&binding.durationSeconds!==undefined;
  if(binding.durationSeconds!==undefined&&!exactAudio)fail('durationSeconds is supported only for audio');
  if(exactAudio&&binding.durationFrames!==undefined)fail('Audio must use either durationSeconds or durationFrames, not both');
  if(!exactAudio&&(!Number.isInteger(binding.durationFrames)||binding.durationFrames<=0))fail('Invalid media durationFrames');
  const durationSeconds=exactAudio?binding.durationSeconds:binding.durationFrames/fps;
  if(typeof durationSeconds!=='number'||!Number.isFinite(durationSeconds)||durationSeconds<=0)fail('Invalid media durationSeconds');
  const sourceIn=Number(binding.sourceInSeconds??0),speed=Number(binding.playbackRate??1);
  if(!Number.isFinite(sourceIn)||sourceIn<0||!Number.isFinite(speed)||speed<=0)fail('Invalid media range');
  if(v.a['data-automation'])fail('Automated media rate requires rendered verification');
  checkVisibleWindow(v,binding.elementId);
  if(!close(Number(v.a['data-start'])+v.offset,binding.startFrame/fps)||!close(Number(v.a['data-duration']),durationSeconds)||!close(Number(v.a['data-media-start']||0),sourceIn)||!close(Number(v.a['data-playback-rate']||1),speed))fail('Native media timeline/source range mismatch: '+binding.elementId);
  const requestedEnd=sourceIn+durationSeconds*speed;
  if(requestedEnd>duration+mediaRangeTolerance)rangeError(binding.kind,binding.elementId,mediaName,duration,sourceIn,requestedEnd);
  if(masterDuration!==null&&binding.startFrame/fps+durationSeconds>masterDuration+1e-6)fail('Media exceeds native master duration');
  mediaFiles.push({file:mediaName,sha256,kind:binding.kind,elementId:binding.elementId,metadata:{duration,decodedFrames:Number(stream.nb_read_frames)}});
 }
 const untrackedMedia=[...videos,...audio].filter(v=>!mapped.has(v)).map(v=>({html:v.html,elementId:v.a.id||null,kind:v.tag,src:v.a.src||null}));
 if(c.media!==undefined&&untrackedMedia.length)fail('Unmapped native media: '+untrackedMedia.map(v=>v.elementId||v.src||v.kind).join(', '));
 if(c.export){const m=probe(local(root,c.export),ffprobe);if(m.width!==c.master.width||m.height!==c.master.height||!close(rate(m.fps),fps))fail('Encoded export settings mismatch');if(masterDuration!==null&&Math.abs(m.duration-masterDuration)>1/fps+1e-6)fail('Encoded export duration mismatch');}
 return {ok:true,reviewOnly,notice:reviewOnly?'Review assembly only; no component approval or delivery authorization.':'Finishing preflight; not creative approval.',shots:results,mediaFiles,untrackedMedia,nativeFiles:[...documents].map(([file,sha256])=>({file,sha256})),master:c.master,nativeDuration:masterDuration,limitations:[...(untrackedMedia.length?['Legacy contract has untracked footage/audio; integrity is not complete. Add explicit media bindings.']:[]),'Static HTML bindings checked; runtime script changes, visual quality, sound mix and playback require rendered review.','Frame-rate/scaling declarations express intent; inspect encoded output for quality.']};
}
export const help=`Usage: node animation-exchange.mjs PROJECT_ROOT EXCHANGE.json [--review-only]
Review-only preflight validates source/media/timeline integrity for a review assembly without requiring component approval. Default preflight rejects review-only import receipts.
Project-root JSON: {schema:1,ledger:"review.json",nativeRoot:"hyperframes",entry:"index.html",brandSha256:"project brand manifest hash",master:{width:1920,height:1080,fps:"24/1"},audioPolicy:"silent-for-finishing"|"embedded",shots:[{id,revision,fingerprint,sha256,html:"index.html",elementId:"shot-a",startFrame:0,durationFrames:24,sourceInFrame:0,frameRateConversion:"resample",scaling:"fit"}],export:"delivery/cut.mp4"}
Optional media:[{kind:"video"|"audio",html:"index.html",elementId,path:"native-relative.mp4",sha256,startFrame,durationFrames,sourceInSeconds:0,playbackRate:1}] pins all non-shot media when present. Audio may use durationSeconds instead of durationFrames to preserve a sub-frame narration tail exactly. Omission is legacy partial integrity; an explicit list must cover every remaining video/audio tag. Animation media still requires approved shot mapping. Conversion fields and export optional. Source-in frames use clip FPS; placement/duration use master FPS.
Static src, data-start, data-duration, data-media-start and data-playback-rate are checked against imported media. Linked compositions add their start offset. Repeated instances/dynamic bindings need explicit human verification; they are never silently certified. No native files are rewritten. Run again after edits and before final-cut review.`;
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{if(process.argv.includes('--help'))console.log(help);else console.log(JSON.stringify(preflight(process.argv[2],process.argv[3],{reviewOnly:process.argv.includes('--review-only')}),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
