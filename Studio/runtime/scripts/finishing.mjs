/** Managed animation imports require an exchange; legacy/footage-only edits retain native behavior. */
import fs from 'node:fs';
import {assertBrowserLaunchAllowed} from './browser-launch.mjs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {verifyProjectBrandCopies} from './brand.mjs';
import {resolveWorkspace} from './workspace.mjs';
import {lintNativeEditor} from './editor-lint.mjs';
const rate=value=>{const [n,d=1]=String(value).split('/').map(Number);const f=n/d;if(!Number.isFinite(f)||f<=0)throw Error('Invalid finishing frame rate');return f;};
const equal=(a,b)=>Math.abs(a-b)<1e-6;
// Resolution definitions and aliases mirror the pinned HyperFrames 0.8.77
// parsers. HyperFrames validates aspect, downsampling, and integer DPR before
// capture; finishing repeats those checks so the receipt describes the target.
const CANVAS_DIMENSIONS={landscape:{width:1920,height:1080},portrait:{width:1080,height:1920},'landscape-4k':{width:3840,height:2160},'portrait-4k':{width:2160,height:3840},square:{width:1080,height:1080},'square-4k':{width:2160,height:2160}};
const RESOLUTION_ALIASES={'1080p':'landscape',hd:'landscape','1080p-portrait':'portrait','portrait-1080p':'portrait','4k':'landscape-4k',uhd:'landscape-4k','4k-portrait':'portrait-4k','1080p-square':'square','square-1080p':'square','4k-square':'square-4k'};
const ASPECT_AGNOSTIC_ALIASES=new Set(['1080p','hd','4k','uhd']);
function outputTarget(master,flags){
 const requested=flags.at(-1);
 if(!Number.isInteger(master?.width)||!Number.isInteger(master?.height)||master.width<1||master.height<1)throw Error('EXCHANGE.json master canvas must have positive integer dimensions');
 if(!requested)return {requested:null,resolution:null,width:master.width,height:master.height,scale:1};
 const key=requested.toLowerCase(),resolution=CANVAS_DIMENSIONS[key]?key:RESOLUTION_ALIASES[key];
 if(!resolution)throw Error(`Invalid --resolution: ${requested}. Use landscape, portrait, landscape-4k, portrait-4k, square, square-4k or a HyperFrames resolution alias.`);
 let effective=resolution;
 if(ASPECT_AGNOSTIC_ALIASES.has(key)){
  const matches=Object.entries(CANVAS_DIMENSIONS).filter(([,d])=>d.width*master.height===d.height*master.width).map(([name])=>name);
  effective=matches.find(name=>name.endsWith('-4k')===resolution.endsWith('-4k'))??matches[0]??resolution;
 }
 const target=CANVAS_DIMENSIONS[effective];
 if(target.width*master.height!==target.height*master.width)throw Error(`--resolution ${requested} (${target.width}x${target.height}) does not match the EXCHANGE.json master aspect ratio (${master.width}x${master.height})`);
 const scale=target.width/master.width;
 if(scale<1)throw Error(`--resolution ${requested} is smaller than the EXCHANGE.json master (${master.width}x${master.height}); downsampling is not supported`);
 if(!Number.isInteger(scale))throw Error(`--resolution ${requested} requires a non-integer scale factor (${scale}x) from the EXCHANGE.json master (${master.width}x${master.height})`);
 return {requested,resolution:effective,width:target.width,height:target.height,scale};
}
function option(args,names){const found=[];for(let i=1;i<args.length;i++)for(const name of names){if(args[i]===name){if(!args[i+1]||args[i+1].startsWith('-'))throw Error('Missing value for '+name);found.push(args[i+1]);}else if(args[i].startsWith(name+'='))found.push(args[i].slice(name.length+1));}return found;}
const valueFlags=new Set(['--composition','-c','--output','-o','--fps','-f','--quality','-q','--skill','--format','--gif-loop','--hls-segment-seconds','--crf','--video-bitrate','--video-frame-format','--workers','--browser-timeout','--protocol-timeout','--player-ready-timeout','--resolution','--variables','--variables-file','--vp','--batch-concurrency','--max-concurrent-renders','--frames-cache-dir']);
function renderDirectory(args,cwd){
 const positional=[];for(let i=1;i<args.length;i++){if(valueFlags.has(args[i])){i++;continue;}if(!args[i].startsWith('-'))positional.push(args[i]);}
 // Native render's directory positional is optional. Resolve against actual child cwd.
 return path.resolve(cwd,positional[0]||'.');
}
function findProject(directory){
 let current=directory;while(true){if(fs.existsSync(path.join(current,'PROJECT.json')))return current;const parent=path.dirname(current);if(parent===current)return null;current=parent;}
}
export function renderReportDirectory(args,cwd=process.cwd()){const native=renderDirectory(args,cwd);return findProject(native)||native;}
async function defaultTools(runtime){const dir=path.join(resolveWorkspace(runtime).skills,'director/tools');const exchange=await import(pathToFileURL(path.join(dir,'animation-exchange.mjs')).href);const handoff=await import(pathToFileURL(path.join(dir,'animation-handoff.mjs')).href);return {...exchange,probe:handoff.probe};}
async function digestFile(file){const hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(file))hash.update(chunk);return hash.digest('hex');}
export async function finishRender(args,{runtime,cwd=process.cwd(),env=process.env,runRender,loadTools=defaultTools,lintEditor=lintNativeEditor}={}){
 if(args[0]!=='render'||args.includes('--help')||args.includes('-h'))return runRender(args);
 assertBrowserLaunchAllowed({env});
 const reviewOnly=args.includes('--review-only');
 if(args.some(a=>a.startsWith('--review-only=')))throw Error('Use --review-only as a boolean flag');
 args=args.filter(a=>a!=='--review-only');
 const native=renderDirectory(args,cwd),project=findProject(native),contractPath=project&&path.join(project,'EXCHANGE.json');
 // Review assembly is an explicit, immutable output, never a delivery overwrite.
 let reviewOutput;
 if(reviewOnly){
  if(!project)throw Error('Review-only render requires a Studio project');
  const outputs=option(args,['--output','-o']);
  if(outputs.length!==1||!outputs[0])throw Error('Review-only render requires exactly one explicit --output video path');
  reviewOutput=path.resolve(cwd,outputs[0]);
  const relative=path.relative(project,reviewOutput),parts=relative.split(path.sep);
  if(parts[0]!=='reviews'||parts[1]!=='candidates'||parts.length<3||! /\.(mp4|mov|webm|m4v|mkv)$/i.test(reviewOutput))throw Error('Review-only output must be a video under project reviews/candidates/');
  let cursor=project;
  for(const part of parts){cursor=path.join(cursor,part);let stat;try{stat=fs.lstatSync(cursor);}catch(error){if(error.code!=='ENOENT')throw error;}if(stat?.isSymbolicLink())throw Error('Review-only output path cannot contain symlinks');}
  if(fs.existsSync(reviewOutput))throw Error('Review-only output already exists; use a new candidate filename');
  if(!contractPath||!fs.existsSync(contractPath))throw Error('Review-only render requires EXCHANGE.json, including footage-only edits; create an exchange before rendering the candidate');
 }

 if(project){const manifest=JSON.parse(fs.readFileSync(path.join(project,'PROJECT.json'),'utf8'));if(manifest.brand&&path.resolve(project,manifest.nativeProject||'hyperframes')!==native)throw Error('Pinned brand render must use the project Editor directory');}
 const verifyBrand=()=>project?verifyProjectBrandCopies(project,{engine:'native'}):null;
 const brandBefore=await verifyBrand();
 const verifyBrandAfter=async()=>{const after=await verifyBrand();if(JSON.stringify(after)!==JSON.stringify(brandBefore))throw Error('Pinned native brand changed during render; output requires revalidation');};
 if(!contractPath||!fs.existsSync(contractPath)){
  if(project){
   const manifest=JSON.parse(fs.readFileSync(path.join(project,'PROJECT.json'),'utf8'));
   if(manifest.workflow?.version===1){
    const ledgerName=manifest.workflow.ledger||'REVIEW.json';
    if(path.basename(ledgerName)!==ledgerName)throw Error('Managed review ledger must live at project root');
    const ledgerPath=path.join(project,ledgerName);
    const imported=fs.existsSync(ledgerPath)&&JSON.parse(fs.readFileSync(ledgerPath,'utf8')).imports?.length>0;
    const animations=path.join(native,'assets/animations');
    const hasMedia=fs.existsSync(animations)&&fs.readdirSync(animations).some(name=>/\.(mp4|mov|webm)$/i.test(name));
    if(imported||hasMedia)throw Error('Managed animation requires EXCHANGE.json before export. Run workflow exchange and preflight.');
   }
  }
  const result=await runRender(args);
  await verifyBrandAfter();
  return result;
 }
 const original=fs.readFileSync(contractPath),contract=JSON.parse(original),contractSha256=crypto.createHash('sha256').update(original).digest('hex');
 if(contract.reviewOnly&&!reviewOnly)throw Error('Review-only exchange requires explicit --review-only; delivery requires an approved candidate');
 const projectData=JSON.parse(fs.readFileSync(path.join(project,'PROJECT.json'),'utf8'));
 if(path.resolve(project,projectData.nativeProject||'hyperframes')!==native)throw Error('EXCHANGE.json finishing requires the project’s configured Editor directory');
 if(path.resolve(project,contract.nativeRoot||'hyperframes')!==native)throw Error('EXCHANGE.json nativeRoot disagrees with the configured Editor directory');
 const compositions=option(args,['--composition','-c']);if(compositions.some(c=>c!=='.'&&c!==(contract.entry||'index.html')))throw Error('Render composition disagrees with EXCHANGE.json entry; use a matching exchange for this output');
 const fps=rate(contract.master?.fps),flags=option(args,['--fps','-f']);if(flags.some(f=>!equal(rate(f),fps)))throw Error('Render --fps disagrees with EXCHANGE.json master frame rate');
 const target=outputTarget(contract.master,option(args,['--resolution']));
 const forwarded=flags.length?[...args]:[...args,'--fps',String(contract.master.fps)];
 const tools=await loadTools(runtime),probeOptions={ffprobe:env.HYPERFRAMES_FFPROBE_PATH||env.FFPROBE_PATH,reviewOnly};
 const editorLint=projectData.workflow?.version===1?lintEditor(native):{passed:true,skipped:true,reason:'Legacy project; managed Editor lint is not configured.'};
 // A previous/missing export must not block rendering its replacement; validate inputs first.
 const {export:previousExport,...inputs}=contract;
 const before=await tools.preflight(project,inputs,probeOptions);
 await runRender(forwarded);
 await verifyBrandAfter();
 // Never attest a render whose source/contract changed during capture.
 if(await digestFile(contractPath)!==contractSha256)throw Error('EXCHANGE.json changed during render; output requires revalidation');
 const after=await tools.preflight(project,inputs,probeOptions);
 if(JSON.stringify(before.mediaFiles)!==JSON.stringify(after.mediaFiles))throw Error('Declared source media changed during render; output requires revalidation');
 if(JSON.stringify(before.nativeFiles)!==JSON.stringify(after.nativeFiles))throw Error('Native HTML changed during render; output requires revalidation');
 const outputs=option(forwarded,['--output','-o']),output=outputs.at(-1);let validation={verified:false,reason:'No explicit --output video path; input preflight passed, encoded output remains unverified.'};
 if(output){
  const file=path.resolve(cwd,output);
  if(/\.(mp4|mov|webm|m4v|mkv)$/i.test(file)){
   const measured=await tools.probe(file,probeOptions.ffprobe);
   if(measured.width!==target.width||measured.height!==target.height||!equal(rate(measured.fps),fps))throw Error('Rendered output canvas/frame rate disagrees with the expected export target');
   if(before.nativeDuration!==null&&before.nativeDuration!==undefined&&Math.abs(measured.duration-before.nativeDuration)>1/fps+1e-6)throw Error('Rendered output duration disagrees with native timeline');
   validation={verified:true,path:file,sha256:await digestFile(file),metadata:measured,expected:{width:target.width,height:target.height,resolution:target.resolution,requestedResolution:target.requested,scale:target.scale}};
  }else validation={verified:false,path:file,reason:'Non-video output format: input preflight passed; encoded media validation not performed.'};
 }
 const receipt={schema:1,reviewOnly,approval:false,checkedAt:new Date().toISOString(),scope:reviewOnly?'Review candidate only; no component approval or delivery authorization':'Technical finishing preflight; not visual quality, listening, or human approval',editorLint,contractSha256,nativeFiles:after.nativeFiles,mediaFiles:after.mediaFiles??[],untrackedMedia:after.untrackedMedia??[],master:contract.master,expectedOutput:{width:target.width,height:target.height,resolution:target.resolution,requestedResolution:target.requested,scale:target.scale},output:validation,limitations:before.limitations};
 const folder=path.join(project,'evidence/finishing');fs.mkdirSync(folder,{recursive:true});const filename=path.join(folder,new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID()+'.json');fs.writeFileSync(filename,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
 console.log(`Finishing preflight passed; ${validation.verified?'encoded output settings verified':'encoded output not verified'}. Receipt: ${filename}`);
 return receipt;
}
