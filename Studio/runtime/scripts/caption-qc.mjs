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
const options={maxBuffer:8*1024*1024,timeout:120000};
const MAX_TEXT_BYTES=8*1024*1024;
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const diag=(check,status,message,details={})=>({check,status,message,...details});
async function hashFile(file){
 const hash=createHash('sha256');
 for await(const chunk of createReadStream(file))hash.update(chunk);
 return hash.digest('hex');
}
async function readBoundedText(file,label){
 const chunks=[];let size=0;
 for await(const chunk of createReadStream(file)){
  size+=chunk.length;
  if(size>MAX_TEXT_BYTES)throw Error(`${label} exceeds the ${MAX_TEXT_BYTES}-byte text limit`);
  chunks.push(chunk);
 }
 return Buffer.concat(chunks,size);
}
function sameFile(a,b){return a.dev===b.dev&&a.ino===b.ino&&a.size===b.size&&a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs;}

function relativePath(value,label){
 if(typeof value!=='string'||!value||path.posix.isAbsolute(value)||value.includes('\\')||value.split('/').some(part=>!part||part==='.'||part==='..'))throw Error(`${label} must be a project-relative path without traversal`);
 return value;
}

async function safeFile(root,relative,label,{allowEmpty=false,readText=false}={}){
 relative=relativePath(relative,label);
 let cursor=root;
 for(const part of relative.split('/')){
  cursor=path.join(cursor,part);
  let stat;
  try{stat=await fs.lstat(cursor);}catch(error){if(error.code==='ENOENT')throw Error(`${label} does not exist: ${relative}`);throw error;}
  if(stat.isSymbolicLink())throw Error(`${label} path cannot contain symlinks: ${relative}`);
 }
 const real=await fs.realpath(cursor),rel=path.relative(root,real);
 if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))throw Error(`${label} must resolve inside the project`);
 const stat=await fs.stat(real);
 if(!stat.isFile()||!allowEmpty&&stat.size===0)throw Error(`${label} must be a ${allowEmpty?'regular':'non-empty regular'} file`);
 if(readText&&stat.size>MAX_TEXT_BYTES)throw Error(`${label} exceeds the ${MAX_TEXT_BYTES}-byte text limit`);
 const content=readText?await readBoundedText(real,label):undefined;
 const digest=readText?sha256(content):await hashFile(real),after=await fs.stat(real);
 if(!sameFile(stat,after))throw Error(`${label} changed while being read`);
 return {path:relative.split(path.sep).join('/'),file:real,content,stat,sha256:digest};
}

function timestamp(value){
 const match=String(value).match(/^(?:(\d{2,}):)?([0-5]\d):([0-5]\d)[.,](\d{1,3})$/);
 if(!match)return null;
 const hours=match[1]===undefined?0:Number(match[1]),minutes=Number(match[2]),seconds=Number(match[3]);
 const millis=Number(match[4].padEnd(3,'0'));
 return hours*3600+minutes*60+seconds+millis/1000;
}

function parseCueBlock(block,index,format){
 const lines=block.split('\n').map(line=>line.replace(/\r$/,''));
 if(!lines.length||!lines.some(line=>line.trim()))return {ignored:true};
 let lineIndex=lines.findIndex(line=>line.includes('-->'));
 if(lineIndex<0)return {error:`Caption block ${index+1} has no timing line`};
 if(lineIndex>1)return {error:`Caption block ${index+1} has extra lines before its timing line`};
 const timing=lines[lineIndex].match(/^\s*(\S+)\s+-->\s+(\S+)(?:\s+.*)?\s*$/);
 if(!timing)return {error:`Caption block ${index+1} has a malformed timing line`};
 const start=timestamp(timing[1]),end=timestamp(timing[2]);
 if(start===null||end===null)return {error:`Caption block ${index+1} has an invalid ${format.toUpperCase()} timestamp`};
 const text=lines.slice(lineIndex+1).join('\n').trim();
 return {cue:{index:index+1,start,end,text}};
}

/** Parse SRT or WebVTT. Returned errors are technical failures; no cue is silently repaired. */
export function parseCaptionFile(source,format){
 format=String(format??'').toLowerCase().replace(/^\./,'');
 if(!['srt','vtt'].includes(format))throw Error('Captions must be an .srt or .vtt file');
 let text=String(source).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
 const diagnostics=[];
 if(format==='vtt'){
  if(!/^WEBVTT(?:[ \t].*)?(?:\n|$)/.test(text))diagnostics.push(diag('vtt-header','fail','WebVTT file must begin with WEBVTT.'));
  else text=text.replace(/^WEBVTT[^\n]*(?:\n|$)/,'');
 }
 const cues=[];
 for(const [index,block] of text.split(/\n\s*\n/).entries()){
  const first=block.trimStart();
  if(format==='vtt'&&/^(?:NOTE|STYLE|REGION)(?:\s|$)/.test(first))continue;
  const result=parseCueBlock(block,index,format);
  if(result.error)diagnostics.push(diag('cue-syntax','fail',result.error,{block:index+1}));
  else if(result.cue)cues.push(result.cue);
 }
 if(!cues.length)diagnostics.push(diag('cue-presence','fail','No valid caption cues were found.'));
 return {format,cues,diagnostics};
}

function displayText(text){
 return text.replace(/<[^>]*>/g,'').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").trim();
}
function words(text){return String(text).normalize('NFKC').toLocaleLowerCase('und').match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)??[];}
function union(intervals){
 const sorted=intervals.map(x=>({start:x.start,end:x.end})).sort((a,b)=>a.start-b.start||a.end-b.end),merged=[];
 for(const interval of sorted){const last=merged.at(-1);if(last&&interval.start<=last.end)last.end=Math.max(last.end,interval.end);else merged.push({...interval});}
 return merged;
}
function validExpectations(expect){
 if(expect===undefined)return {};
 if(!expect||typeof expect!=='object'||Array.isArray(expect))throw Error('Assessment expect must be an object');
 if(expect.noOverlap!==undefined&&typeof expect.noOverlap!=='boolean')throw Error('expect.noOverlap must be boolean');
 for(const key of ['maxCps','maxLineChars','maxLines'])if(expect[key]!==undefined&&(!Number.isFinite(expect[key])||expect[key]<=0))throw Error(`expect.${key} must be positive`);
 return expect;
}
function validateSpeechInput(input){
 if(input.speechGapToleranceSeconds!==undefined&&(!Number.isFinite(input.speechGapToleranceSeconds)||input.speechGapToleranceSeconds<0))throw Error('speechGapToleranceSeconds must be a finite non-negative number');
 if(input.speechIntervals!==undefined){
  if(!Array.isArray(input.speechIntervals))throw Error('speechIntervals must be an array of {start,end} intervals');
  for(const [index,item] of input.speechIntervals.entries())if(!item||!Number.isFinite(item.start)||!Number.isFinite(item.end)||item.start<0||item.end<=item.start)throw Error(`Invalid speechIntervals[${index}]`);
 }
}
function validateAssessment(input){
 validExpectations(input.expect);validateSpeechInput(input);
}

function analyzeCaptions(parsed,duration,input){
 const checks=[...parsed.diagnostics],advisories=[],cues=parsed.cues,expect=validExpectations(input.expect);
 let previous=null,furthest=null;
 for(const cue of cues){
  if(cue.end<=cue.start)checks.push(diag('cue-duration','fail',`Caption cue ${cue.index} ends at or before it starts.`,{cue:cue.index,start:cue.start,end:cue.end}));
  if(!displayText(cue.text))checks.push(diag('cue-empty','fail',`Caption cue ${cue.index} has no visible text.`,{cue:cue.index}));
  if(duration!==null&&cue.end>duration+0.001)checks.push(diag('cue-duration','fail',`Caption cue ${cue.index} ends after the measured media duration.`,{cue:cue.index,end:cue.end,durationSeconds:duration}));
  if(previous&&cue.start<previous.start)checks.push(diag('cue-order','fail',`Caption cue ${cue.index} starts before the previous cue.`,{cue:cue.index,previousCue:previous.index}));
  if(furthest&&cue.start<furthest.end){
   const item={cue:cue.index,previousCue:furthest.index,overlapSeconds:Number((furthest.end-cue.start).toFixed(3))};
   if(expect.noOverlap===true)checks.push(diag('cue-overlap','fail',`Caption cues ${furthest.index} and ${cue.index} overlap.`,item));
   else advisories.push(diag('cue-overlap','advisory',`Caption cues ${furthest.index} and ${cue.index} overlap; confirm this is intentional.`,item));
  }
  const lines=displayText(cue.text).split('\n').map(line=>line.trim()).filter(Boolean),visible=lines.join(' '),durationSeconds=Math.max(0,cue.end-cue.start),chars=[...visible].length,cps=durationSeconds>0?chars/durationSeconds:Infinity;
  const details={cue:cue.index,cps:Number.isFinite(cps)?Number(cps.toFixed(2)):null,maxLineChars:Math.max(0,...lines.map(line=>[...line].length)),lineCount:lines.length};
  for(const [key,actual] of [['maxCps',details.cps],['maxLineChars',details.maxLineChars],['maxLines',details.lineCount]])if(actual!==null&&actual!==undefined){
   const exceeded=expect[key]!==undefined&&actual>expect[key];
   const observed=key==='maxCps'?`reads at ${actual} CPS`:key==='maxLineChars'?`has a ${actual}-character line`:`uses ${actual} lines`;
   const status=expect[key]===undefined?'advisory':exceeded?'fail':'pass';
   const message=expect[key]===undefined?`Caption cue ${cue.index} ${observed}; review readability in context.`:exceeded?`Caption cue ${cue.index} ${observed}; declared maximum is ${expect[key]}.`:`Caption cue ${cue.index} ${observed}, within the declared maximum of ${expect[key]}.`;
   const record=diag(`readability:${key}`,status,message,{...details,expectedMaximum:expect[key]});
   (status==='advisory'?advisories:checks).push(record);
  }
  previous=cue;if(!furthest||cue.end>furthest.end)furthest=cue;
 }
 if(input.speechIntervals!==undefined){
  const intervals=input.speechIntervals.map((item,index)=>{
   if(!item||!Number.isFinite(item.start)||!Number.isFinite(item.end)||item.start<0||item.end<=item.start||duration!==null&&item.end>duration+0.001)throw Error(`Invalid speechIntervals[${index}]`);
   return {start:item.start,end:item.end};
  });
  const covered=union(cues.filter(cue=>cue.end>cue.start).map(cue=>({start:cue.start,end:cue.end})));
  const tolerance=input.speechGapToleranceSeconds??0.25;
  const gaps=[];
  for(const speech of intervals){let cursor=speech.start;for(const caption of covered){if(caption.end<=cursor||caption.start>=speech.end)continue;if(caption.start>cursor)gaps.push({start:Number(cursor.toFixed(3)),end:Number(Math.min(caption.start,speech.end).toFixed(3))});cursor=Math.max(cursor,caption.end);if(cursor>=speech.end)break;}if(cursor<speech.end)gaps.push({start:Number(cursor.toFixed(3)),end:Number(speech.end.toFixed(3))});}
  const substantial=gaps.filter(gap=>gap.end-gap.start>tolerance);
  if(substantial.length)advisories.push(diag('declared-speech-gaps','advisory',`${substantial.length} declared speech interval gap(s) exceed ${tolerance}s; compare against the actual speech and captions.`,{toleranceSeconds:tolerance,gaps:substantial}));
  else advisories.push(diag('declared-speech-gaps','advisory','No declared speech gap exceeds the tolerance; interval coverage cannot establish that speech or captions are accurate.',{toleranceSeconds:tolerance,gaps:[]}));
 }
 return {checks,advisories};
}

function transcriptCoverage(transcriptText,captionText){
 const transcript=words(transcriptText),caption=words(captionText),positions=new Map();let cursor=0,matched=0;
 for(let index=0;index<caption.length;index++){
  let indexes=positions.get(caption[index]);if(!indexes){indexes=[];positions.set(caption[index],indexes);}indexes.push(index);
 }
 for(const token of transcript){
  const indexes=positions.get(token);if(!indexes)continue;
  let low=0,high=indexes.length;
  while(low<high){const middle=(low+high)>>>1;if(indexes[middle]<cursor)low=middle+1;else high=middle;}
  if(low<indexes.length){matched++;cursor=indexes[low]+1;}
 }
 return {matchedTokens:matched,transcriptTokens:transcript.length,coverage:transcript.length?Number((matched/transcript.length).toFixed(4)):null,method:'ordered literal token subsequence after NFKC, lowercase and punctuation normalization',caveat:'This is string coverage only. It does not establish semantic equivalence, transcript correctness, speech presence, synchronization, or caption accuracy.'};
}

async function stable(fileRecord,root,label,{allowEmpty=false}={}){
 const current=await safeFile(root,fileRecord.path,label,{allowEmpty,readText:fileRecord.content!==undefined}),a=fileRecord.stat,b=current.stat;
 if(current.sha256!==fileRecord.sha256||!sameFile(a,b))throw Error(`${label} changed during caption QC`);
}
async function writeReceipt(root,receipt){
 const directory=path.join(root,'evidence','caption-qc');
 const relative=path.relative(root,directory);
 let cursor=root;
 for(const part of relative.split(path.sep)){cursor=path.join(cursor,part);try{if((await fs.lstat(cursor)).isSymbolicLink())throw Error('Caption QC evidence path cannot contain symlinks');}catch(error){if(error.code!=='ENOENT')throw error;}}
 await fs.mkdir(directory,{recursive:true});
 const filename=path.join(directory,`${new Date().toISOString().replaceAll(':','-')}-${randomUUID()}.json`);
 await fs.writeFile(filename,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
 return filename;
}

/** Inspect caption syntax and timing against measured media duration. This never approves or attests perception. */
export async function inspectCaptions(projectRoot,input,{ffprobe=process.env.HYPERFRAMES_FFPROBE_PATH||process.env.FFPROBE_PATH||'ffprobe',run=execute}={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Assessment must be an object');
 validateAssessment(input);
 const root=await fs.realpath(projectRoot);
 const media=await safeFile(root,input.media,'Media'),captions=await safeFile(root,input.captions,'Captions',{allowEmpty:true,readText:true});
 const ext=path.extname(captions.path).toLowerCase().slice(1);
 const parsed=parseCaptionFile(captions.content.toString('utf8'),ext);
 let transcript=null;
 if(input.transcript!==undefined)transcript=await safeFile(root,input.transcript,'Transcript',{allowEmpty:true,readText:true});
 const checks=[],advisories=[];let duration=null,probeError=null;
 try{
  const result=await run(ffprobe,['-v','error','-show_format','-show_streams','-of','json',media.file],options);
  const probe=JSON.parse(result.stdout),number=Number(probe?.format?.duration);
  if(!Number.isFinite(number)||number<=0)throw Error('Media probe returned no finite positive container duration');
  if(!Array.isArray(probe.streams)||!probe.streams.some(stream=>['video','audio'].includes(stream.codec_type)))throw Error('Media probe found no audio or video stream');
  duration=number;checks.push(diag('media-duration','pass',`Measured media duration is ${number.toFixed(3)} seconds.`,{durationSeconds:number}));
 }catch(error){probeError=error.message;checks.push(diag('media-duration','fail',`Could not establish media duration: ${error.message}`));}
 const analyzed=analyzeCaptions(parsed,duration,input);checks.push(...analyzed.checks);advisories.push(...analyzed.advisories);
 const transcriptResult=transcript?transcriptCoverage(transcript.content.toString('utf8'),parsed.cues.map(cue=>cue.text).join('\n')):null;
 if(transcriptResult)advisories.push(diag('literal-transcript-coverage','advisory',`Literal ordered token coverage: ${transcriptResult.matchedTokens}/${transcriptResult.transcriptTokens}${transcriptResult.coverage===null?'':` (${(transcriptResult.coverage*100).toFixed(1)}%)`}.`,transcriptResult));
 await stable(media,root,'Media');await stable(captions,root,'Captions',{allowEmpty:true});if(transcript)await stable(transcript,root,'Transcript',{allowEmpty:true});
 const fileRecord=file=>({path:file.path,sha256:file.sha256,bytes:file.stat.size});
 const receipt={schemaVersion:1,kind:'caption-qc',createdAt:new Date().toISOString(),status:checks.some(check=>check.status==='fail')?'failed':'passed',media:fileRecord(media),captions:{...fileRecord(captions),format:ext,cueCount:parsed.cues.length},...(transcript?{transcript:fileRecord(transcript),transcriptCoverage:transcriptResult}:{}),measured:{durationSeconds:duration,probeError},checks,advisories,expect:input.expect??{},approval:false,viewed:false,listened:false,limitations:['Technical QC checks caption syntax, timing and declared expectations only. It does not detect speech or verify transcription, translation, semantic accuracy, accessibility, synchronization to actual speech, or perceived readability.','Declared speech intervals are user-supplied hints; gap results are advisory and do not infer speech.','Transcript comparison is literal normalized token coverage only; it is not a semantic or accuracy pass.','This receipt does not certify playback, listening, creative quality, human approval, or delivery.']};
 const receiptPath=await writeReceipt(root,receipt);return {receiptPath,receipt};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{
  const [project,assessment]=process.argv.slice(2);
  if(!project||!assessment)throw Error('Usage: caption-qc.mjs PROJECT ASSESSMENT.json');
  const result=await withRunReport({directory:path.resolve(project),stage:'caption-qc'},async()=>{
   const {env}=await runtimeEnvironment(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
   return inspectCaptions(project,JSON.parse(await fs.readFile(assessment,'utf8')),{ffprobe:env.HYPERFRAMES_FFPROBE_PATH});
  });
  console.log(JSON.stringify(result,null,2));if(result.receipt?.status==='failed')process.exitCode=1;
 }catch(error){console.error(error.message);process.exitCode=1;}
}
