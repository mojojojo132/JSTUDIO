// Technical evidence only: this command never grants creative or release approval.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {collectBrowserTelemetry} from './browser-telemetry.mjs';
import {run} from './common.mjs';
const exec=promisify(execFile);
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function sourceInventory(directory,config){
 const inventory={};
 async function visit(file){const stat=await fs.lstat(file);if(stat.isSymbolicLink())throw Error('Review input cannot be a symlink: '+file);if(stat.isDirectory()){for(const name of (await fs.readdir(file)).sort())await visit(path.join(file,name));}else if(stat.isFile())inventory[path.relative(directory,file)]=hash(await fs.readFile(file));}
 for(const rel of ['app/src','app/scripts','app/public','app/package.json','app/package-lock.json','render.mjs']){try{await visit(path.join(directory,rel));}catch(error){if(error.code!=='ENOENT')throw error;}}
 await visit(config);return inventory;
}
export function parseReviewArgs(args){
 const allowed=new Set(['project','from','to','fps','n','chrome']);const options={fps:24,n:8};
 const seen=new Set();
 for(let i=0;i<args.length;i+=2){const key=args[i]?.replace(/^--/,'');
  if(!args[i]?.startsWith('--')||!allowed.has(key)||seen.has(key)||!args[i+1]||args[i+1].startsWith('--'))throw Error('Invalid or duplicate review option: '+args[i]);
  seen.add(key);options[key]=args[i+1];
 }
 for(const key of ['project','from','to'])if(!seen.has(key))throw Error('Review requires --'+key);
 for(const key of ['from','to','fps','n']){if(!String(options[key]).trim())throw Error('Invalid --'+key);options[key]=Number(options[key]);if(!Number.isFinite(options[key]))throw Error('Invalid --'+key);}
 if(options.from<0||options.to<=options.from||options.to-options.from>30)throw Error('Review interval must be positive and at most 30 seconds');
 if(options.fps<1||options.fps>60||!Number.isInteger(options.fps))throw Error('Review fps must be an integer from 1 to 60');
 if(options.n<2||options.n>16||!Number.isInteger(options.n))throw Error('Review still count must be 2 to 16');
 const first=Math.round(options.from*options.fps),last=Math.round(options.to*options.fps)-1;
 if(last-first+1<options.n)throw Error('Review interval needs at least n distinct frames');
 options.times=Array.from({length:options.n},(_,i)=>(first+Math.round((last-first)*i/(options.n-1)))/options.fps);
 return options;
}
export async function createReview(directory,args,env,{render=run,decode=async file=>exec(env.HYPERFRAMES_FFMPEG_PATH,['-v','error','-xerror','-i',file,'-f','null','-'],{maxBuffer:4*1024*1024}),probe=async file=>JSON.parse((await exec(env.HYPERFRAMES_FFPROBE_PATH,['-v','error','-show_format','-show_streams','-of','json',file],{maxBuffer:4*1024*1024})).stdout)}={}){
 const options=parseReviewArgs(args),app=await fs.realpath(path.join(directory,'app'));
 const config=await fs.realpath(path.resolve(app,options.project));
 if(path.relative(app,config).startsWith('..')||path.isAbsolute(path.relative(app,config)))throw Error('Review project must be inside animation/app');
 const configBytes=await fs.readFile(config),project=JSON.parse(configBytes);
 const width=project.canvas?.width??1920,height=project.canvas?.height??1080;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<64||height<64||width>4096||height>4096||width%2||height%2)throw Error('Invalid project canvas dimensions');
 const duration=project.shots?.reduce((sum,shot)=>sum+shot.duration,0);
 if(!Number.isFinite(duration)||options.to>duration)throw Error('Review interval exceeds project duration');
 const inputs=await sourceInventory(directory,config);
 const reviews=path.basename(directory)==='animation' ? path.join(directory,'../reviews/animation') : path.join(directory,'reviews');
 await fs.mkdir(reviews,{recursive:true});
 if((await fs.lstat(reviews)).isSymbolicLink())throw Error('Review directory cannot be a symlink');
 const output=await fs.mkdtemp(path.join(reviews,new Date().toISOString().replace(/[:.]/g,'-')+'-'));
 const receipt={version:1,status:'running',createdAt:new Date().toISOString(),project:path.relative(app,config),projectSha256:hash(configBytes),sourceInventory:inputs,range:{from:options.from,to:options.to,fps:options.fps},canvas:{width,height},colorMode:project.colorMode??'cinematic',times:options.times,commands:[],artifacts:[],review:{visual:'not-reviewed',audio:'not-listened',approval:'not-requested'},sourceNote:'Inventory covers config, app/src, app/scripts, app/public, package metadata and render.mjs. Installed dependencies and external assets are not snapshotted; editable originals remain in the workspace.'};
 const save=()=>fs.writeFile(path.join(output,'REVIEW.json'),JSON.stringify(receipt,null,2)+'\n');
 await save();
 try{
  const base=['--project',path.relative(app,config),...(options.chrome?['--chrome',options.chrome]:[])];
  const jobs=[['stills',...base,'--t',options.times.join(','),'--out',path.join(output,'stills')],['sheet',...base,'--times',options.times.join(','),'--cols','4','--out',path.join(output,'contact-sheet.png')],['video',...base,'--from',String(options.from),'--to',String(options.to),'--fps',String(options.fps),'--workers','1','--out',path.join(output,'preview.mp4')]];
  for(const job of jobs){receipt.commands.push(job);await save();const {telemetry}=await collectBrowserTelemetry(async telemetryPath=>render(process.execPath,[path.join(directory,'render.mjs'),...job],{cwd:directory,logPath:path.join(output,job[0]+'.log'),env:{...env,PDOOM_FFMPEG:env.HYPERFRAMES_FFMPEG_PATH,STUDIO_BROWSER_TELEMETRY:telemetryPath}}));(receipt.browserTelemetry??=[]).push({mode:job[0],...telemetry});await save();}
  const stills=await fs.readdir(path.join(output,'stills'));if(stills.length!==options.n)throw Error('Unexpected diagnostic still count');
  for(const relative of ['contact-sheet.png','preview.mp4',...stills.map(file=>'stills/'+file)]){const bytes=await fs.readFile(path.join(output,relative));if(!bytes.length)throw Error('Empty review artifact: '+relative);receipt.artifacts.push({path:relative,bytes:bytes.length,sha256:hash(bytes)});}
  receipt.media=await probe(path.join(output,'preview.mp4'));
  if(!receipt.media.streams?.some(stream=>stream.codec_type==='video'))throw Error('Preview contains no video stream');
  const video=receipt.media.streams.find(stream=>stream.codec_type==='video');
  const expectedFrames=Math.round(options.to*options.fps)-Math.round(options.from*options.fps);
  const [numerator,denominator]=String(video.avg_frame_rate).split('/').map(Number);
  if(!Number.isFinite(numerator/denominator)||!Number.isFinite(Number(video.duration))||video.width!==width||video.height!==height||Number(video.nb_frames)!==expectedFrames||Math.abs(numerator/denominator-options.fps)>.001||Math.abs(Number(video.duration)-expectedFrames/options.fps)>1/options.fps)throw Error('Preview metadata does not match requested frame count, rate, duration or dimensions');
  await decode(path.join(output,'preview.mp4'));receipt.decodeVerified=true;
  receipt.audioPresent=receipt.media.streams.some(stream=>stream.codec_type==='audio');
  if(JSON.stringify(await sourceInventory(directory,config))!==JSON.stringify(inputs))throw Error('Animation source changed during review render; rerun from stable source');
  receipt.status='rendered';receipt.completedAt=new Date().toISOString();
  await fs.writeFile(path.join(output,'REVIEW-NOTES.md'),'# Animation review\n\nTechnical artifacts generated; visual review, audio listening and approval are pending.\n\nWatch preview.mp4 at speed and inspect contact-sheet.png and stills. Listen to the mix when present. Check causal action, camera readability, depth, secondary response, timing and readable pauses against the sequence plan.\n\n| Timecode | Observed problem | Intended result | Targeted revision | Recheck |\n|---|---|---|---|---|\n\nRecord reviewer, evidence and outcome here. A successful render is not creative acceptance.\n',{flag:'wx'});
  await save();return output;
 }catch(error){receipt.status='failed';receipt.error=error.message;receipt.diagnostic=error.diagnostic??null;receipt.partialBrowserTelemetry=error.partialBrowserTelemetry??[];await save();throw Object.assign(new Error(`Review failed; partial evidence retained at ${output}: ${error.message}`,{cause:error}),{diagnostic:error.diagnostic,partialBrowserTelemetry:error.partialBrowserTelemetry});}
}
