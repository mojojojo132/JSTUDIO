#!/usr/bin/env node
// Preserve the downloaded original; create a separately verified render derivative.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const exists=p=>{try{fs.lstatSync(p);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
const hash=async p=>{const h=crypto.createHash('sha256');for await(const c of fs.createReadStream(p))h.update(c);return h.digest('hex');};
function run(exe,args){const r=spawnSync(exe,args,{encoding:'utf8',timeout:600000,maxBuffer:8*1024*1024,windowsHide:true});if(r.error||r.status!==0)throw Error(`${path.basename(exe)} failed: ${r.error?.message||r.stderr||r.status}`);return r.stdout;}
const probe=(exe,file)=>JSON.parse(run(exe,['-v','error','-show_format','-show_streams','-of','json',file]));

export async function prepareCapture(packageRoot,inputArg,outputArg){
 const root=fs.realpathSync(path.resolve(packageRoot)),input=fs.realpathSync(path.resolve(inputArg));
 const requested=path.resolve(outputArg),parent=fs.realpathSync(path.dirname(requested)),output=path.join(parent,path.basename(requested));
 if(path.extname(output).toLowerCase()!=='.mp4')throw Error('Output must be a new .mp4 file.');
 if(input===output||exists(output))throw Error('Output already exists or is the input; choose a new filename.');
 const receiptPath=output+'.capture.json',lockPath=output+'.prepare.lock';
 if(exists(receiptPath))throw Error('Receipt already exists; choose a new filename.');
 const before=fs.statSync(input);if(!before.isFile()||before.size===0)throw Error('Input must be a nonempty saved capture file.');
 const lock=fs.openSync(lockPath,'wx');let stage;
 try{
  fs.writeFileSync(lock,JSON.stringify({input,output,pid:process.pid,startedAt:new Date().toISOString()}));
  if(exists(output)||exists(receiptPath))throw Error('Output or receipt appeared before preparation; choose a new filename.');
  const {runtimeEnvironment}=await import(pathToFileURL(path.join(root,'scripts/runtime.mjs')).href);
  const {env}=await runtimeEnvironment(root);const ffmpeg=env.HYPERFRAMES_FFMPEG_PATH,ffprobe=env.HYPERFRAMES_FFPROBE_PATH;
  if(!ffmpeg||!ffprobe)throw Error('Studio bundled media tools are unavailable; run its supported Setup launcher.');
  const source=probe(ffprobe,input),sourceVideo=source.streams?.find(s=>s.codec_type==='video');
  if(!sourceVideo||!(sourceVideo.width>0)||!(sourceVideo.height>0))throw Error('Input has no usable video stream.');
  const originalHash=await hash(input);
  stage=fs.mkdtempSync(path.join(parent,'.prepare-capture-'));const staged=path.join(stage,'capture.mp4');
  const args=['-nostdin','-n','-v','error','-i',input,'-map','0:v:0','-map','0:a?','-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-r','30','-c:a','aac','-b:a','192k','-movflags','+faststart',staged];
  run(ffmpeg,args);const media=probe(ffprobe,staged),video=media.streams?.find(s=>s.codec_type==='video');
  const duration=Number(media.format?.duration||video?.duration);
  if(!video||video.codec_name!=='h264'||video.avg_frame_rate!=='30/1'||!Number.isFinite(duration)||duration<=0)throw Error('Prepared capture failed codec/frame-rate/duration validation.');
  const sourceAudio=source.streams.filter(s=>s.codec_type==='audio').length,outputAudio=media.streams.filter(s=>s.codec_type==='audio').length;
  if(sourceAudio!==outputAudio)throw Error('Prepared capture did not preserve the source audio stream count.');
  run(ffmpeg,['-nostdin','-v','error','-xerror','-i',staged,'-map','0:v','-map','0:a?','-f','null','-']);
  const after=fs.statSync(input);
  if(after.size!==before.size||after.mtimeMs!==before.mtimeMs||await hash(input)!==originalHash)throw Error('Input changed during preparation; wait for download completion and retry.');
  const receipt={preparedAt:new Date().toISOString(),source:{path:input,sha256:originalHash,bytes:before.size,media:source},output:{path:output,sha256:await hash(staged),bytes:fs.statSync(staged).size,media},conversion:{video:'H.264',fps:30,audio:'all source audio streams re-encoded AAC; absent source audio remains absent',padding:'at most one pixel added on odd width/height',command:[ffmpeg,...args.slice(0,-1),output]},checks:{fullDecode:true,sourceUnchanged:true,visualReview:false,audioListening:false},next:'Inspect this derivative and compare with the original. Successful conversion is not content or perceptual acceptance.'};
  // Hard-link publish is atomic and refuses an existing destination, unlike rename on POSIX.
  fs.linkSync(staged,output);
  try{fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});}catch(e){throw Error(`Prepared video retained at ${output}, but receipt could not be saved: ${e.message}`);}
  return {...receipt,receiptPath};
 }finally{if(stage)fs.rmSync(stage,{recursive:true,force:true});fs.closeSync(lock);fs.unlinkSync(lockPath);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const args=process.argv.slice(2);
 if(args.length!==3){console.error('Usage: node prepare-capture.mjs <studio-package-root> <saved-capture> <new-output.mp4>');process.exitCode=1;}
 else try{console.log(JSON.stringify(await prepareCapture(...args),null,2));}catch(e){console.error(e.message);process.exitCode=1;}
}
