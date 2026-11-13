import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {runtimeEnvironment} from './runtime.mjs';
import {withRunReport} from './tool-run.mjs';
import {assessReadability} from './readability.mjs';
const execute=promisify(execFile);
export async function hashFile(file){const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex');}
export function validateMediaProbe(probe,expect={}) {
 const streams=probe.streams||[]; const duration=Number(probe.format?.duration);
 if(!Number.isFinite(duration)||duration<=0)throw Error('Media duration must be finite and positive');
 if(!streams.some(s=>s.codec_type==='video'||s.codec_type==='audio'))throw Error('No audio or video stream');
 for(const kind of expect.streams||[])if(!streams.some(s=>s.codec_type===kind))throw Error(`Missing ${kind} stream`);
 if(expect.duration!==undefined&&(!Number.isFinite(expect.duration)||Math.abs(duration-expect.duration)>(expect.durationTolerance??0.1)))throw Error('Encoded duration differs from expected duration');
 const video=streams.find(s=>s.codec_type==='video');
 for(const field of ['width','height'])if(expect[field]!==undefined&&video?.[field]!==expect[field])throw Error(`Encoded ${field} differs from expected ${field}`);
 const rate=video?.avg_frame_rate?.split('/').map(Number);const fps=rate?.length===2?rate[0]/rate[1]:Number(video?.avg_frame_rate);
 if(expect.fps!==undefined&&(!Number.isFinite(fps)||Math.abs(fps-expect.fps)>0.01))throw Error('Encoded fps differs from expected fps');
 return {durationSeconds:duration,streams:streams.map(s=>({type:s.codec_type,codec:s.codec_name,width:s.width,height:s.height,sampleRate:s.sample_rate,channels:s.channels})),fps:Number.isFinite(fps)?fps:null};
}
export function parseLoudness(stderr) {
 const blocks=String(stderr).match(/\{[^{}]*"input_i"[^{}]*\}/g)||[];
 if(!blocks.length)throw Error('No measured loudness returned');
 const raw=JSON.parse(blocks.at(-1));const integratedLufs=Number(raw.input_i),truePeakDbtp=Number(raw.input_tp),loudnessRangeLu=Number(raw.input_lra);
 if(![integratedLufs,truePeakDbtp,loudnessRangeLu].every(Number.isFinite))throw Error('Audio loudness is not finite (silent or invalid audio); no successful loudness measurement');
 return {integratedLufs,truePeakDbtp,loudnessRangeLu};
}
export async function writeMeasuredReceipt(projectRoot,category,receipt) {
 const directory=path.join(projectRoot,'evidence',category);await fs.mkdir(directory,{recursive:true});
 const receiptPath=path.join(directory,`${new Date().toISOString().replaceAll(':','-')}-${randomUUID()}.json`);
 await fs.writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});return {receiptPath,receipt};
}
export async function inspectMedia(projectRoot,input,{ffprobe=process.env.HYPERFRAMES_FFPROBE_PATH||process.env.FFPROBE_PATH||'ffprobe',ffmpeg=process.env.HYPERFRAMES_FFMPEG_PATH||process.env.FFMPEG_PATH||'ffmpeg',run=execute}={}) {
 const root=await fs.realpath(projectRoot),file=await fs.realpath(path.resolve(root,input.media));const relative=path.relative(root,file);
 if(relative.startsWith('..'+path.sep)||relative==='..'||path.isAbsolute(relative))throw Error('Media must be inside the project');
 const stat=await fs.stat(file);if(!stat.isFile()||!stat.size)throw Error('Media file is empty or not a regular file');const sha256=await hashFile(file);
 const options={maxBuffer:8*1024*1024,timeout:120000};
 const {stdout}=await run(ffprobe,['-v','error','-show_format','-show_streams','-of','json',file],options);
 const measured=validateMediaProbe(JSON.parse(stdout),input.expect);
 const readability=input.readability===undefined?null:assessReadability(input.readability,measured);
 await run(ffmpeg,['-nostdin','-v','error','-xerror','-i',file,'-map','0:v?','-map','0:a?','-f','null','-'],options);
 let loudness=null;if(input.measureLoudness){
  if(!measured.streams.some(s=>s.type==='audio'))throw Error('Loudness requires an audio stream');
  const {stderr}=await run(ffmpeg,['-nostdin','-i',file,'-map','0:a:0','-af','loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json','-f','null','-'],options);loudness=parseLoudness(stderr);
 }
 if(await hashFile(file)!==sha256)throw Error('Media changed during measurement');
 return writeMeasuredReceipt(root,'media-readiness',{schemaVersion:1,kind:'measured-media-readiness',createdAt:new Date().toISOString(),media:relative.split(path.sep).join('/'),sha256,bytes:stat.size,measured,fullDecode:true,loudness,readability,expect:input.expect||{},approval:false,limitations:['Technical measurement only; does not verify interaction accuracy, synchronization, visual quality or listening quality.','Loudness, when requested, measures the first audio stream.']});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{const [project,input]=process.argv.slice(2);if(!project||!input)throw Error('Usage: media-readiness.mjs PROJECT ASSESSMENT.json');const result=await withRunReport({directory:path.resolve(project),stage:'media-readiness'},async()=>{const {env}=await runtimeEnvironment(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));return inspectMedia(project,JSON.parse(await fs.readFile(input,'utf8')),{ffmpeg:env.HYPERFRAMES_FFMPEG_PATH,ffprobe:env.HYPERFRAMES_FFPROBE_PATH});});console.log(JSON.stringify(result,null,2));}catch(error){console.error(error.message);process.exitCode=1;}
}
