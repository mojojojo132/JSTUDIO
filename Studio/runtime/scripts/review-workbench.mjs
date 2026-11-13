import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import {inspectEncodedCandidate} from './encoded-qc.mjs';
import {writeReviewReceipt} from './review-receipt.mjs';
import {renderReviewWorkbench} from './review-workbench-ui.mjs';

const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function fileHash(file){const h=crypto.createHash('sha256');for await(const chunk of createReadStream(file))h.update(chunk);return h.digest('hex');}
const relative=(root,file)=>path.relative(root,file).split(path.sep).join('/');
async function local(root,name,{missing=false}={}){
 if(typeof name!=='string'||!name||path.isAbsolute(name)||name.includes('\\')||name.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('Use a project-relative path without traversal');
 let cursor=root;
 for(const part of name.split('/')){cursor=path.join(cursor,part);try{if((await fs.lstat(cursor)).isSymbolicLink())throw Error('Review paths cannot contain symlinks');}catch(error){if(error.code!=='ENOENT'||!missing)throw error;}}
 return cursor;
}
function displayTarget(target){
 if(!target||typeof target.context!=='string'||target.context.trim().length<4||target.context.length>300||!Number.isInteger(target.minimumWidthPx)||target.minimumWidthPx<160||target.minimumWidthPx>16384)throw Error('displayTarget needs context and minimumWidthPx (160–16384)');
 return {context:target.context,minimumWidthPx:target.minimumWidthPx};
}
async function identity(root,name){const file=await local(root,name),stat=await fs.stat(file);if(!stat.isFile()||!stat.size)throw Error('Expected a nonempty regular file');return {path:name,bytes:stat.size,sha256:await fileHash(file)};}
async function unchanged(root,record){const current=await identity(root,record.path);if(current.sha256!==record.sha256||current.bytes!==record.bytes)throw Error('Review source changed; create a new workbench for the latest candidate');return local(root,record.path);}

/** Build a review packet for the actual candidate, without making perceptual claims. */
export async function createReviewWorkbench(projectRoot,input,{inspect=inspectEncodedCandidate,...options}={}){
 const root=await fs.realpath(projectRoot),target=displayTarget(input?.displayTarget);
 const media=await identity(root,input.media);
 const qc=await inspect(root,{media:input.media,expect:{streams:['video'],...(input.expect??{})},analyze:input.analyze??false,...(input.timeoutMs===undefined?{}:{timeoutMs:input.timeoutMs})},options);
 await unchanged(root,media);
 if(qc.receipt.status!=='passed')throw Object.assign(Error('Encoded candidate QC failed; inspect the saved QC receipt before preparing review'),{receiptPath:qc.receiptPath});
 const durationSeconds=qc.receipt.measured?.durationSeconds;
 if(!Number.isFinite(durationSeconds)||durationSeconds<=0)throw Error('QC did not supply a measured duration');
 let captions=null;
 const captionLanguage=input.captionLanguage??'und';if(typeof captionLanguage!=='string'||!/^[-A-Za-z0-9]{2,35}$/.test(captionLanguage))throw Error('captionLanguage must be a language tag such as en or und');
 if(input.captions){if(!/\.vtt$/i.test(input.captions))throw Error('Workbench sidecar captions must be WebVTT; SRT remains supported by caption QC');captions=await identity(root,input.captions);}
 const folder=await local(root,`evidence/review-workbench/${new Date().toISOString().replace(/[:.]/g,'-')}-${crypto.randomUUID()}`,{missing:true});
 await fs.mkdir(folder,{recursive:true});
 const qcBytes=await fs.readFile(qc.receiptPath);
 const video=qc.receipt.measured.streams.find(s=>s.type==='video');
 const packet={schemaVersion:1,kind:'candidate-review-workbench',createdAt:new Date().toISOString(),media:media.path,mediaSha256:media.sha256,mediaBytes:media.bytes,durationSeconds,displayTarget:target,hasAudio:qc.receipt.measured.streams.some(s=>s.type==='audio'),videoWidth:video?.width,videoHeight:video?.height,captions,captionsAvailable:!!captions,captionLanguage,qc:{status:qc.receipt.status,receiptPath:relative(root,qc.receiptPath),sha256:hash(qcBytes)},approval:false,notice:'Original encoded bytes. Review controls and playback events never establish human viewing/listening or creative approval.'};
 const packetPath=path.join(folder,'PACKET.json');await fs.writeFile(packetPath,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});
 return {packetPath,packet,nextAction:`workflow <project> review-open ${relative(root,packetPath)}`};
}

function rangeFor(value,size){
 if(!value)return {start:0,end:size-1,partial:false};
 const m=/^bytes=(\d*)-(\d*)$/.exec(value);if(!m||(!m[1]&&!m[2]))throw Error('Invalid byte range');
 let start=m[1]?Number(m[1]):Math.max(0,size-Number(m[2])),end=m[1]&&m[2]?Number(m[2]):size-1;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||start>=size)throw Error('Invalid byte range');
 return {start,end:Math.min(end,size-1),partial:true};
}
function text(value,max,name){if(typeof value!=='string'||value.length>max)throw Error(`${name} must be text up to ${max} characters`);return value;}
async function saveAssessment(root,packet,packetName,input){
 await unchanged(root,{path:packet.media,sha256:packet.mediaSha256,bytes:packet.mediaBytes});
 if(packet.captions)await unchanged(root,packet.captions);
 const reviewer=text(input.reviewer,200,'reviewer').trim();if(!reviewer)throw Error('Reviewer name is required');
 const playbackQuote=text(input.playbackQuote??'',2000,'playbackQuote').trim(),listeningQuote=text(input.listeningQuote??'',2000,'listeningQuote').trim();
 const notes=text(input.notes??'',20000,'notes');
 const parent=path.posix.dirname(packetName),saveDir=await local(root,`${parent}/assessments/${crypto.randomUUID()}`,{missing:true});await fs.mkdir(saveDir,{recursive:true});
 const source=relative(root,path.join(saveDir,'DECLARATIONS.txt'));
 await fs.writeFile(path.join(saveDir,'DECLARATIONS.txt'),`Reviewer: ${reviewer}\nCandidate SHA-256: ${packet.mediaSha256}\nRecorded: ${new Date().toISOString()}\n\nPlayback statement (blank means none):\n${playbackQuote}\n\nListening statement (blank means none):\n${listeningQuote}\n\nThese are locally supplied declarations; identity and perception are not authenticated. No approval is recorded.\n`,{flag:'wx'});
 const attestation=quote=>({confirmed:true,mediaSha256:packet.mediaSha256,reviewer,quote,source});
 const assessment={schemaVersion:2,media:packet.media,durationSeconds:packet.durationSeconds,reviewer,displayTarget:packet.displayTarget,inspectedRanges:input.inspectedRanges,inspectionMethod:input.inspectionMethod??'unspecified',legibilityInspection:input.legibilityInspection,
  playback:playbackQuote?{status:'performed',attestation:attestation(playbackQuote)}:{status:'not-performed',reason:'No explicit complete-playback declaration was supplied in this workbench.'},
  listening:listeningQuote?{status:'performed',attestation:attestation(listeningQuote)}:input.listeningNotApplicableReason?{status:'not-applicable',reason:text(input.listeningNotApplicableReason,1000,'listeningNotApplicableReason')}:{status:'not-performed',reason:'No explicit listening declaration was supplied in this workbench.'},
  defects:input.defects??[],notes,...(input.qualityAssessment?{qualityAssessment:input.qualityAssessment}:{})};
 if(!Array.isArray(assessment.defects)||assessment.defects.length>100||!Array.isArray(assessment.inspectedRanges)||assessment.inspectedRanges.length>200)throw Error('Keep defects and inspected ranges bounded');
 const result=await writeReviewReceipt(root,assessment);
 const assessmentPath=path.join(saveDir,'ASSESSMENT.json');await fs.writeFile(assessmentPath,JSON.stringify(assessment,null,2)+'\n',{flag:'wx'});
 return {assessmentPath:relative(root,assessmentPath),assessment,receiptPath:relative(root,result.receiptPath),receipt:result.receipt};
}

/** Loopback-only, exact-file review. Never exposes a general file server or approval route. */
export async function startReviewWorkbench(projectRoot,packetName,{port=0}={}){
 if(!Number.isInteger(port)||port<0||port>65535)throw Error('Port must be an integer from 0 to 65535');
 const root=await fs.realpath(projectRoot),packetFile=await local(root,packetName),packet=JSON.parse(await fs.readFile(packetFile,'utf8'));
 if(packet.schemaVersion!==1||packet.kind!=='candidate-review-workbench'||!/^[a-f0-9]{64}$/.test(packet.mediaSha256??''))throw Error('Invalid review workbench packet');
 if(!Number.isFinite(packet.durationSeconds)||packet.durationSeconds<=0||!Number.isSafeInteger(packet.mediaBytes)||packet.mediaBytes<1)throw Error('Invalid review candidate measurements');
 displayTarget(packet.displayTarget);
 await unchanged(root,{path:packet.media,sha256:packet.mediaSha256,bytes:packet.mediaBytes});
 if(packet.captions)await unchanged(root,packet.captions);
 const qcFile=await local(root,packet.qc.receiptPath),qcBytes=await fs.readFile(qcFile);if(hash(qcBytes)!==packet.qc.sha256)throw Error('QC receipt changed; recreate the review workbench');
 const qc=JSON.parse(qcBytes);if(qc.kind!=='encoded-candidate-qc'||qc.status!=='passed'||qc.candidate?.path!==packet.media||qc.candidate?.sha256!==packet.mediaSha256)throw Error('QC receipt does not identify this passing candidate');
 const sources=new Map();let invalidated=false;
 const signature=stat=>[stat.dev,stat.ino,stat.size,stat.mtimeMs,stat.ctimeMs].join(':');
 try{
  for(const record of [{path:packet.media,sha256:packet.mediaSha256,bytes:packet.mediaBytes},...(packet.captions?[packet.captions]:[])]){
   const file=await local(root,record.path),handle=await fs.open(file,'r');
   try{
    const before=await handle.stat(),h=crypto.createHash('sha256');
    for await(const chunk of handle.createReadStream({start:0,autoClose:false}))h.update(chunk);
    if(before.size!==record.bytes||h.digest('hex')!==record.sha256||signature(before)!==signature(await handle.stat()))throw Error('Candidate changed while opening the review session');
    sources.set(record.path,{file,handle,signature:signature(before)});
   }catch(error){await handle.close();throw error;}
  }
 }catch(error){await Promise.all([...sources.values()].map(s=>s.handle.close()));throw error;}
 const stableSource=async record=>{
  if(invalidated)throw Error('Review source changed during this session; create a fresh workbench');
  const source=sources.get(record.path),file=await local(root,record.path);
  if(!source||signature(await source.handle.stat())!==source.signature||signature(await fs.stat(file))!==source.signature){invalidated=true;throw Error('Review source changed during this session; create a fresh workbench');}
  return source;
 };
 const token=crypto.randomBytes(32).toString('hex');let origin;
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; media-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'");
  const json=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
  try{
   if(req.headers.host!==new URL(origin).host)return json(403,{error:'Invalid review host'});
   const url=new URL(req.url,origin);
   if(url.pathname==='/'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(renderReviewWorkbench(packet,token));}
   if(['/media','/captions'].includes(url.pathname)&&['GET','HEAD'].includes(req.method)){
    const isCaption=url.pathname==='/captions',record=isCaption?packet.captions:{path:packet.media,sha256:packet.mediaSha256,bytes:packet.mediaBytes};
    if(!record)return json(404,{error:'No sidecar captions supplied'});
    const source=await stableSource(record),file=source.file;let range;
    try{range=rangeFor(req.headers.range,record.bytes);}catch{res.writeHead(416,{'Content-Range':`bytes */${record.bytes}`});return res.end();}
    const types={'.mp4':'video/mp4','.mov':'video/quicktime','.webm':'video/webm','.m4v':'video/mp4','.mkv':'video/x-matroska'};
    const headers={'Content-Type':isCaption?'text/vtt; charset=utf-8':types[path.extname(file).toLowerCase()]??'application/octet-stream','Accept-Ranges':'bytes','Content-Length':range.end-range.start+1};
    if(range.partial)headers['Content-Range']=`bytes ${range.start}-${range.end}/${record.bytes}`;
    res.writeHead(range.partial?206:200,headers);if(req.method==='HEAD')return res.end();
    // Browsers routinely cancel range requests. Give each request its own
    // verified handle so cancellation cannot close the session's pinned handle.
    const requestHandle=await fs.open(file,'r');
    if(signature(await requestHandle.stat())!==source.signature){await requestHandle.close();invalidated=true;throw Error('Review source changed before streaming');}
    const stream=requestHandle.createReadStream({autoClose:true,start:range.start,end:range.end});
    stream.on('error',()=>res.destroy());stream.once('end',async()=>{try{await stableSource(record);res.end();}catch{res.destroy();}});
    res.once('close',()=>stream.destroy());return stream.pipe(res,{end:false});
   }
   if(url.pathname==='/save'&&req.method==='POST'){
    if(req.headers['x-review-token']!==token||(req.headers.origin&&req.headers.origin!==origin))return json(403,{error:'Invalid review session token or origin'});
    if(!String(req.headers['content-type']??'').startsWith('application/json'))return json(415,{error:'Send application/json'});
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>1024*1024)return json(413,{error:'Review assessment is too large'});chunks.push(chunk);}
    await stableSource({path:packet.media});if(packet.captions)await stableSource(packet.captions);
    const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));return json(200,await saveAssessment(root,packet,packetName,input));
   }
   return json(404,{error:'Review route not found'});
  }catch(error){if(!res.headersSent)json(409,{error:error.message});else res.destroy();}
 });
 server.once('close',()=>{for(const source of sources.values())source.handle.close().catch(()=>{});});
 try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});}catch(error){await Promise.all([...sources.values()].map(s=>s.handle.close()));throw error;}
 origin=`http://127.0.0.1:${server.address().port}`;
 return {url:origin,packet,server,close:()=>new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()))};
}
