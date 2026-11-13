import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {runtimeEnvironment} from './runtime.mjs';
import {withRunReport} from './tool-run.mjs';

const execute=promisify(execFile);
const baseOptions={maxBuffer:8*1024*1024};

async function hashFile(file){
 const hash=createHash('sha256');
 for await(const chunk of createReadStream(file))hash.update(chunk);
 return hash.digest('hex');
}
function finite(value){const number=Number(value);return Number.isFinite(number)?number:null;}
function frameRate(value){
 const [n,d=1]=String(value??'').split('/').map(Number),rate=n/d;
 return Number.isFinite(rate)&&rate>0?rate:null;
}
function diagnostic(check,status,message,details={}){return {check,status,message,...details};}
function validateAssessment(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Assessment must be a JSON object');
 if(typeof input.media!=='string'||!input.media)throw Error('Assessment requires a project-relative media path');
 if(path.isAbsolute(input.media))throw Error('Candidate media path must be project-relative');
 const expect=input.expect??{};
 if(!expect||typeof expect!=='object'||Array.isArray(expect))throw Error('Assessment expect must be an object');
 if(expect.streams!==undefined&&(!Array.isArray(expect.streams)||expect.streams.some(kind=>typeof kind!=='string'||!kind.trim())))throw Error('Assessment expect.streams must be an array of non-empty stream type names');
 for(const field of ['width','height'])if(expect[field]!==undefined&&(!Number.isInteger(Number(expect[field]))||Number(expect[field])<=0))throw Error(`Assessment expect.${field} must be a positive integer`);
 for(const field of ['fps','duration'])if(expect[field]!==undefined&&(!Number.isFinite(Number(expect[field]))||Number(expect[field])<=0))throw Error(`Assessment expect.${field} must be a positive number`);
 if(expect.durationTolerance!==undefined&&(!Number.isFinite(Number(expect.durationTolerance))||Number(expect.durationTolerance)<0))throw Error('Assessment expect.durationTolerance must be a non-negative number');
 if(expect.durationTolerance!==undefined&&expect.duration===undefined)throw Error('Assessment expect.durationTolerance requires expect.duration');
 const analyze=input.analyze??{};
 if(analyze!==false&&(!analyze||typeof analyze!=='object'||Array.isArray(analyze)))throw Error('Assessment analyze must be an object or false');
 if(analyze!==false){
  for(const name of ['blackFrames','freezes','silence'])if(analyze[name]!==undefined&&analyze[name]!==false){
   const config=analyze[name]===true?{}:analyze[name];
   if(!config||typeof config!=='object'||Array.isArray(config))throw Error(`Assessment analyze.${name} must be true, false, or an options object`);
   for(const [key,value] of Object.entries(config))if(!Number.isFinite(Number(value)))throw Error(`Assessment analyze.${name}.${key} must be numeric`);
   if(config.minDuration!==undefined&&Number(config.minDuration)<=0)throw Error(`Assessment analyze.${name}.minDuration must be positive`);
   if(name==='blackFrames')for(const key of ['pixelThreshold','pictureThreshold'])if(config[key]!==undefined&&(Number(config[key])<0||Number(config[key])>1))throw Error(`Assessment analyze.${name}.${key} must be between 0 and 1`);
   if(name==='freezes'&&config.noise!==undefined&&(Number(config.noise)<0||Number(config.noise)>1))throw Error('Assessment analyze.freezes.noise must be between 0 and 1');
   if(name==='silence'&&config.noiseDb!==undefined&&(Number(config.noiseDb)<-200||Number(config.noiseDb)>0))throw Error('Assessment analyze.silence.noiseDb must be between -200 and 0');
  }
 }
 if(input.timeoutMs!==undefined&&(!Number.isFinite(Number(input.timeoutMs))||Number(input.timeoutMs)<0))throw Error('Assessment timeoutMs must be a non-negative number');
}
function validateExpectations(probe,expect={}){
 const diagnostics=[],streams=Array.isArray(probe?.streams)?probe.streams:[];
 const duration=finite(probe?.format?.duration);
 if(duration===null||duration<=0)diagnostics.push(diagnostic('duration','fail','Container duration is missing or not positive; check the export and container metadata.'));
 else diagnostics.push(diagnostic('duration','pass',`Container duration: ${duration.toFixed(3)} seconds.`,{actual:duration}));
 if(!streams.some(s=>['video','audio'].includes(s.codec_type)))diagnostics.push(diagnostic('av-streams','fail','No audio or video stream was found; export a playable audiovisual file.'));
 for(const kind of expect.streams||[]){
  const matches=streams.filter(s=>s.codec_type===kind);
  diagnostics.push(matches.length?diagnostic(`stream:${kind}`,'pass',`Found ${matches.length} ${kind} stream${matches.length===1?'':'s'}.`,{count:matches.length}):diagnostic(`stream:${kind}`,'fail',`Expected a ${kind} stream but none was found; check the export stream mapping.`,{expected:kind}));
 }
 const video=streams.find(s=>s.codec_type==='video'),actualFps=frameRate(video?.avg_frame_rate);
 for(const field of ['width','height'])if(expect[field]!==undefined){
  const actual=finite(video?.[field]);
  diagnostics.push(actual===Number(expect[field])?diagnostic(field,'pass',`Encoded ${field} is ${actual}.`,{expected:Number(expect[field]),actual}):diagnostic(field,'fail',`Expected ${field} ${expect[field]}, found ${actual??'no video stream'}. Check the selected composition and output resolution.`,{expected:Number(expect[field]),actual}));
 }
 if(expect.fps!==undefined){
  const expected=finite(expect.fps),passed=expected!==null&&actualFps!==null&&Math.abs(actualFps-expected)<=0.01;
  diagnostics.push(passed?diagnostic('fps','pass',`Encoded frame rate is ${actualFps.toFixed(3)} fps.`,{expected,actual:actualFps}):diagnostic('fps','fail',`Expected ${expect.fps} fps, found ${actualFps??'unknown'}. Check the export frame-rate setting.`,{expected,actual:actualFps}));
 }
 if(expect.duration!==undefined){
  const expected=finite(expect.duration),tolerance=finite(expect.durationTolerance??0.1),passed=duration!==null&&expected!==null&&tolerance!==null&&tolerance>=0&&Math.abs(duration-expected)<=tolerance;
  diagnostics.push(passed?diagnostic('expected-duration','pass',`Encoded duration is within ${tolerance}s of ${expected}s.`,{expected,tolerance,actual:duration}):diagnostic('expected-duration','fail',`Expected ${expect.duration}s (tolerance ${expect.durationTolerance??0.1}s), found ${duration??'unknown'}s. Check the timeline end and export range.`,{expected,tolerance,actual:duration}));
 }
 return {durationSeconds:duration,streams:streams.map(s=>({type:s.codec_type,codec:s.codec_name,width:s.width,height:s.height,sampleRate:s.sample_rate,channels:s.channels})),fps:actualFps,diagnostics};
}
function advisoryConfig(input){
 const analyze=input.analyze??{};
 if(analyze===false)return {};
 if(!analyze||typeof analyze!=='object'||Array.isArray(analyze))throw Error('Assessment analyze must be an object or false');
 return analyze;
}
function parseIntervals(stderr,kind){
 const output=String(stderr),matches=[];
 if(kind==='black'){
  const pattern=/black_start:([\d.]+)\s+black_end:([\d.]+)\s+black_duration:([\d.]+)/g;let match;
  while((match=pattern.exec(output))){const start=Number(match[1]),end=Number(match[2]);matches.push({startSeconds:start,endSeconds:end,durationSeconds:Number(match[3])});}
  return matches;
 }
 const prefix=kind==='freeze'?'freeze':'silence',pattern=new RegExp(`\\b${prefix}_(start|end|duration):\\s*([\\d.]+)`,'g');
 let open=null,match;
 while((match=pattern.exec(output))){
  const event=match[1],value=Number(match[2]);
  if(event==='start'){
   if(open)matches.push({startSeconds:open.start,endSeconds:null,durationSeconds:open.duration});
   open={start:value,duration:null};
  }else if(open&&event==='end'){
   matches.push({startSeconds:open.start,endSeconds:value,durationSeconds:open.duration??Math.max(0,value-open.start)});open=null;
  }else if(open&&event==='duration'){
   open.duration=value;
   // FFmpeg may emit duration without an end event; this closes the interval.
   matches.push({startSeconds:open.start,endSeconds:open.start+value,durationSeconds:value});open=null;
  }
 }
 if(open)matches.push({startSeconds:open.start,endSeconds:null,durationSeconds:open.duration});
 return matches;
}
async function detectAdvisory(kind,file,ffmpeg,config,run,options){
 const input=['-nostdin','-i',file,'-map',kind==='silence'?'0:a:0':'0:v:0'];
 const filters={
  black:`blackdetect=d=${finite(config.minDuration??1)}:pix_th=${finite(config.pixelThreshold??0.1)}:pic_th=${finite(config.pictureThreshold??0.98)}`,
  freeze:`freezedetect=n=${finite(config.noise??0.001)}:d=${finite(config.minDuration??2)}`,
  silence:`silencedetect=noise=${finite(config.noiseDb??-50)}dB:d=${finite(config.minDuration??2)}`
 };
 const minimum=finite(config.minDuration??(kind==='black'?1:2));
 if(minimum===null||minimum<=0)throw Error(`${kind} advisory minDuration must be positive`);
 try{
  const filterFlag=kind==='silence'?'-af':'-vf';
  const {stderr=''}=await run(ffmpeg,[...input,filterFlag,filters[kind],'-f','null','-'],options);
  const intervals=parseIntervals(stderr,kind);
  return {kind,status:'advisory',stream:`first ${kind==='silence'?'audio':'video'} stream`,intervals,message:intervals.length?`${intervals.length} possible ${kind==='black'?'black-frame':kind==='freeze'?'freeze-frame':'silence'} interval(s); inspect in context because these may be intentional.`:`No ${kind} interval detected by this heuristic.`,limitations:['Heuristic signal only; does not decide creative intent or candidate acceptability.']};
 }catch(error){return {kind,status:'unavailable',intervals:[],message:`Could not run ${kind} heuristic: ${error.message}`,limitations:['Advisory analysis failure does not change technical decode results.']};}
}
async function ensureNoSymlinkPath(root,relative,{allowMissingLeaf=false}={}){
 let cursor=root;const parts=relative.split(path.sep).filter(Boolean);
 for(let i=0;i<parts.length;i++){
  cursor=path.join(cursor,parts[i]);
  try{const stat=await fs.lstat(cursor);if(stat.isSymbolicLink())throw Error('Project media and evidence paths cannot contain symlinks');}
  catch(error){if(error.code==='ENOENT'&&allowMissingLeaf)break;throw error;}
 }
}
async function writeReceipt(root,receipt){
 const directory=path.join(root,'evidence','encoded-qc');
 await ensureNoSymlinkPath(root,path.relative(root,directory),{allowMissingLeaf:true});
 await fs.mkdir(directory,{recursive:true});
 const filename=path.join(directory,`${new Date().toISOString().replaceAll(':','-')}-${randomUUID()}.json`);
 await fs.writeFile(filename,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
 return filename;
}

/** Measure a final encoded candidate. This is technical evidence, never an approval. */
export async function inspectEncodedCandidate(projectRoot,input,{ffprobe=process.env.HYPERFRAMES_FFPROBE_PATH||process.env.FFPROBE_PATH||'ffprobe',ffmpeg=process.env.HYPERFRAMES_FFMPEG_PATH||process.env.FFMPEG_PATH||'ffmpeg',run=execute}={}){
 validateAssessment(input);
 const timeoutMs=input.timeoutMs===undefined?0:Number(input.timeoutMs);
 const options={...baseOptions,timeout:timeoutMs};
 const root=await fs.realpath(projectRoot),requested=path.resolve(root,input.media),relative=path.relative(root,requested);
 if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('Candidate media must be inside the project');
 await ensureNoSymlinkPath(root,relative);
 const file=await fs.realpath(requested),canonicalRelative=path.relative(root,file);
 if(canonicalRelative==='..'||canonicalRelative.startsWith('..'+path.sep)||path.isAbsolute(canonicalRelative))throw Error('Candidate media resolves outside the project');
 const stat=await fs.stat(file);
 if(!stat.isFile()||stat.size===0)throw Error('Candidate media is empty or not a regular file');
 const before={dev:stat.dev,ino:stat.ino,size:stat.size,mtimeMs:stat.mtimeMs,ctimeMs:stat.ctimeMs,sha256:await hashFile(file)};
 const diagnostics=[],advisories=[];let probe=null,measured=null;
 try{
  const result=await run(ffprobe,['-v','error','-show_format','-show_streams','-of','json',file],options);
  probe=JSON.parse(result.stdout);measured=validateExpectations(probe,input.expect||{});diagnostics.push(...measured.diagnostics);
 }catch(error){diagnostics.push(diagnostic('probe','fail',`ffprobe could not inspect the candidate: ${error.message}. Confirm the file is complete and the format is supported.`));}
 try{await run(ffmpeg,['-nostdin','-v','error','-xerror','-i',file,'-map','0:v?','-map','0:a?','-f','null','-'],options);diagnostics.push(diagnostic('full-decode','pass','All audio and video streams decoded without reported errors.'));}
 catch(error){diagnostics.push(diagnostic('full-decode','fail',`Full audio/video decode failed: ${error.message}. Re-export the candidate and inspect the encoder log.`));}
 if(probe){
  const cfg=advisoryConfig(input),streams=probe.streams||[];
  for(const [name,kind,streamType] of [['blackFrames','black','video'],['freezes','freeze','video'],['silence','silence','audio']])if(cfg[name]){
   if(!streams.some(s=>s.codec_type===streamType))advisories.push({kind,status:'not-applicable',stream:`first ${streamType} stream`,intervals:[],message:`No ${streamType} stream exists for this heuristic.`});
   else advisories.push(await detectAdvisory(kind,file,ffmpeg,cfg[name]===true?{}:cfg[name],run,options));
  }
 }
 await ensureNoSymlinkPath(root,relative);
 const afterStat=await fs.stat(file),afterHash=await hashFile(file);
 if(before.sha256!==afterHash||before.size!==afterStat.size||before.ino!==afterStat.ino||before.dev!==afterStat.dev||before.mtimeMs!==afterStat.mtimeMs||before.ctimeMs!==afterStat.ctimeMs)throw Error('Candidate changed during measurement; discard this QC result and measure the stable file again');
 const decodePassed=diagnostics.some(d=>d.check==='full-decode'&&d.status==='pass');
 const receipt={schemaVersion:1,kind:'encoded-candidate-qc',createdAt:new Date().toISOString(),candidate:{path:relative.split(path.sep).join('/'),sha256:before.sha256,bytes:before.size},status:diagnostics.some(d=>d.status==='fail')?'failed':'passed',checks:diagnostics,advisories,measured,expect:input.expect||{},decodeAttempted:true,fullDecode:decodePassed,tooling:{ffmpeg,ffprobe,timeoutMs},approval:false,limitations:['Technical QC does not verify creative quality, synchronization, factual accuracy, captions, or listening quality.','Black-frame, freeze-frame, and silence intervals are heuristic advisories; legitimate pauses, holds, fades, and silence can be intentional.','This receipt does not establish source rights or human viewing/listening.']};
  const receiptPath=await writeReceipt(root,receipt);return {receiptPath,receipt};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{
  const [project,assessment]=process.argv.slice(2);
  if(!project||!assessment)throw Error('Usage: encoded-qc.mjs PROJECT ASSESSMENT.json');
  const result=await withRunReport({directory:path.resolve(project),stage:'encoded-qc'},async()=>{
   const {env}=await runtimeEnvironment(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
   return inspectEncodedCandidate(project,JSON.parse(await fs.readFile(assessment,'utf8')),{ffmpeg:env.HYPERFRAMES_FFMPEG_PATH,ffprobe:env.HYPERFRAMES_FFPROBE_PATH});
  });
  console.log(JSON.stringify(result,null,2));if(result.receipt?.status==='failed')process.exitCode=1;
 }catch(error){console.error(error.message);process.exitCode=1;}
}
