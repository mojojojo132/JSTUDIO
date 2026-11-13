import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const QUALITY_DIMENSIONS=['storyClarity','originality','visualCraft','pacingRhythm','legibilityAccessibility','sound','cohesion','factualAccuracy'];
async function mediaFile(root,relative){
 if(typeof relative!=='string'||!relative||path.isAbsolute(relative)||relative.includes('\\')||relative.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('Media must be a project-relative path');
 let current=root;
 for(const part of relative.split('/')){current=path.join(current,part);if((await fs.lstat(current)).isSymbolicLink())throw Error('Review media cannot use symlinks');}
 if(!(await fs.stat(current)).isFile())throw Error('Review media must be a file');
 return current;
}
function validate(input,{allowLegacy=false}={}){
 const legacy=input.schemaVersion===1&&allowLegacy;
 if((input.schemaVersion!==2&&!legacy)||typeof input.reviewer!=='string'||!input.reviewer.trim())throw Error('Review schemaVersion 2 and reviewer are required');
 if(!Number.isFinite(input.durationSeconds)||input.durationSeconds<=0)throw Error('Measured durationSeconds is required');
 if(!Array.isArray(input.inspectedRanges))throw Error('inspectedRanges is required');
 for(const r of input.inspectedRanges)if(!Number.isFinite(r.start)||!Number.isFinite(r.end)||r.start<0||r.end<=r.start||r.end>input.durationSeconds)throw Error('Invalid inspected range');
 for(const key of ['playback','listening']){
  const record=input[key],statuses=key==='listening'?['performed','unavailable','not-performed','not-applicable']:['performed','unavailable','not-performed'];
  if(!record||!statuses.includes(record.status))throw Error(`${key} status is required`);
  if(record.status!=='performed'&&(typeof record.reason!=='string'||!record.reason.trim()))throw Error(`${key} requires an honest reason`);
 }
 if(input.inspectionMethod!==undefined&&!['sampled-frames','continuous-playback','mixed','unspecified'].includes(input.inspectionMethod))throw Error('Invalid inspectionMethod');
 if(input.inspectionMethod==='sampled-frames'&&input.playback.status==='performed')throw Error('Sampled frames cannot establish continuous playback');
 if(!legacy){
  const target=input.displayTarget;
  if(!target||typeof target.context!=='string'||target.context.trim().length<4||target.context.length>300||!Number.isInteger(target.minimumWidthPx)||target.minimumWidthPx<160||target.minimumWidthPx>16384)throw Error('displayTarget requires a viewing context and minimumWidthPx from 160 to 16384');
  const inspection=input.legibilityInspection;
  if(!inspection||!['complete','partial','unavailable','not-applicable'].includes(inspection.status)||!Array.isArray(inspection.checks)||inspection.checks.length>100)throw Error('legibilityInspection requires complete, partial, unavailable or not-applicable status and checks');
  if(['unavailable','not-applicable'].includes(inspection.status)){
   if(inspection.inspectedWidthPx!==null||inspection.checks.length||typeof inspection.reason!=='string'||!inspection.reason.trim())throw Error(`${inspection.status} legibilityInspection requires a reason, null inspectedWidthPx and no checks`);
  }else{
   if(inspection.inspectedWidthPx!==target.minimumWidthPx)throw Error('legibilityInspection must use the declared minimum display width');
   if(inspection.status==='complete'&&(!inspection.checks.length||inspection.reason!==undefined))throw Error('Complete legibilityInspection needs checks and cannot have an unassessed reason');
   if(inspection.status==='partial'&&(!inspection.checks.length||typeof inspection.reason!=='string'||!inspection.reason.trim()))throw Error('Partial legibilityInspection requires at least one check and a reason');
   for(const [index,check] of inspection.checks.entries()){
    if(!check||!Number.isFinite(check.timeSeconds)||check.timeSeconds<0||check.timeSeconds>input.durationSeconds||typeof check.text!=='string'||!check.text.trim()||check.text.length>500||!['readable','unreadable'].includes(check.result)||typeof check.evidence!=='string'||!check.evidence.trim()||check.evidence.length>500)throw Error(`Invalid legibilityInspection check ${index}`);
    if(!input.inspectedRanges.some(range=>check.timeSeconds>=range.start-0.001&&check.timeSeconds<=range.end+0.001))throw Error(`legibilityInspection check ${index} falls outside inspectedRanges`);
   }
  }
 }
 if(!Array.isArray(input.defects)||input.defects.some(d=>!['critical','high','medium','low'].includes(d.severity)||typeof d.description!=='string'||!d.description.trim()))throw Error('defects must list severity and description');
 for(const defect of input.defects){
  if(defect.status!==undefined&&!['open','resolved','accepted'].includes(defect.status))throw Error('Invalid defect status');
  if(defect.status==='resolved'&&(!defect.verification||!/^([a-f0-9]{64})$/.test(defect.verification.mediaSha256??'')||typeof defect.verification.note!=='string'||!defect.verification.note.trim()))throw Error('Resolved defects require exact-media verification and a recheck note');
 }
 if(input.qualityAssessment!==undefined){
  const quality=input.qualityAssessment;
  if(!quality||quality.schemaVersion!==1||!quality.dimensions||typeof quality.dimensions!=='object'||Array.isArray(quality.dimensions))throw Error('qualityAssessment requires schemaVersion 1 and dimensions');
  if(Object.keys(quality.dimensions).sort().join('|')!==[...QUALITY_DIMENSIONS].sort().join('|'))throw Error(`qualityAssessment dimensions must be exactly: ${QUALITY_DIMENSIONS.join(', ')}`);
  for(const name of QUALITY_DIMENSIONS){
   const item=quality.dimensions[name];
   if(!item||!['assessed','unassessed','not-applicable'].includes(item.status))throw Error(`qualityAssessment.${name}.status is required`);
   if(!Array.isArray(item.evidence)||item.evidence.some(value=>typeof value!=='string'||!value.trim()||value.length>500))throw Error(`qualityAssessment.${name}.evidence must contain concise text evidence`);
   if(item.status==='assessed'){
    if(!Number.isInteger(item.rating)||item.rating<1||item.rating>5||!item.evidence.length)throw Error(`Assessed quality dimension ${name} needs a 1-5 rating and evidence`);
    if(item.reason!==undefined)throw Error(`Assessed quality dimension ${name} cannot carry an unassessed reason`);
   }else{
    if(item.rating!==null&&item.rating!==undefined)throw Error(`Unassessed quality dimension ${name} must not have a rating`);
    if(typeof item.reason!=='string'||!item.reason.trim()||item.reason.length>500)throw Error(`${name} needs a reason when unassessed or not applicable`);
   }
  }
  if(quality.dimensions.storyClarity.status==='assessed'&&input.playback.status!=='performed')throw Error('storyClarity requires performed playback');
  if(quality.dimensions.pacingRhythm.status==='assessed'&&input.playback.status!=='performed')throw Error('pacingRhythm requires performed playback');
  if(quality.dimensions.cohesion.status==='assessed'&&input.playback.status!=='performed')throw Error('cohesion requires performed playback');
  if(quality.dimensions.sound.status==='assessed'&&input.listening.status!=='performed')throw Error('sound requires perceptual listening');
  if(!legacy&&quality.dimensions.legibilityAccessibility.status==='assessed'&&input.legibilityInspection.status!=='complete')throw Error('legibilityAccessibility requires complete checks at the declared minimum display width');
  for(const key of ['strengths','opportunities'])if(quality[key]!==undefined&&(!Array.isArray(quality[key])||quality[key].length>12||quality[key].some(value=>typeof value!=='string'||!value.trim()||value.length>500)))throw Error(`qualityAssessment.${key} must be concise text entries`);
 }
 let end=0;
 for(const range of [...input.inspectedRanges].sort((a,b)=>a.start-b.start)){if(range.start>end+0.001)break;end=Math.max(end,range.end);}
 return end>=input.durationSeconds-0.001;
}
function reviewCoverage(input,complete){
 const continuousPlaybackComplete=complete&&input.playback.status==='performed'&&input.inspectionMethod!=='sampled-frames';
 const listeningComplete=['performed','not-applicable'].includes(input.listening.status);
 const legibilityComplete=input.schemaVersion===1||['complete','not-applicable'].includes(input.legibilityInspection?.status);
 return {coverageComplete:complete,coverageMeaning:'declared inspected ranges; not evidence of continuous playback',declaredRangeCoverageComplete:complete,continuousPlaybackComplete,listeningComplete,legibilityComplete,perceptualReviewComplete:continuousPlaybackComplete&&listeningComplete&&legibilityComplete};
}
function verifyDefectRechecks(input,mediaSha256){for(const defect of input.defects)if(defect.status==='resolved'&&defect.verification.mediaSha256!==mediaSha256)throw Error('Resolved defect recheck targets a different media hash');}
// These are auditable declarations, not authenticated identities or proof of perception.
async function checkAttestations(root,input,hash,{required=false}={}){
 let verified=true;
 for(const key of ['playback','listening']){
  if(input[key].status!=='performed')continue;
  const a=input[key].attestation;
  if(!a){if(required)throw Error(`${key} performed requires explicit human attestation; approval alone is insufficient`);verified=false;continue;}
  if(a.confirmed!==true||a.mediaSha256!==hash||typeof a.reviewer!=='string'||!a.reviewer.trim())throw Error(`${key} attestation requires reviewer, confirmed true and this exact mediaSha256`);
  const action=key==='playback'?/\b(watched|played|viewed)\b/i:/\b(listened|heard)\b/i;
  if(typeof a.quote!=='string'||!action.test(a.quote)||!/\b(entire|whole|complete|full)\b|from start to finish/i.test(a.quote)||/\b(not|never|haven't|didn't|couldn't)\b/i.test(a.quote))throw Error(`${key} attestation quote must explicitly describe the review; generic approval is insufficient`);
  const bytes=await fs.readFile(await mediaFile(root,a.source));
  if(a.sourceBytes!==undefined&&(!Number.isSafeInteger(a.sourceBytes)||a.sourceBytes<1||a.sourceBytes>bytes.length))throw Error(`${key} attestation source truncated or invalid`);
  const prefix=bytes.subarray(0,a.sourceBytes??bytes.length),source=prefix.toString('utf8');
  if(!source.includes(a.quote))throw Error(`${key} attestation quote is absent from its source`);
  if(a.sourceSha256&&a.sourceSha256!==digest(prefix))throw Error(`${key} attestation source changed`);
  a.sourceSha256=digest(prefix);a.sourceBytes=prefix.length;
 }
 return verified;
}
export async function writeReviewReceipt(projectRoot,input,{outputDirectory}={}){
 const coverageComplete=validate(input),media=await mediaFile(projectRoot,input.media),bytes=await fs.readFile(media);
 verifyDefectRechecks(input,digest(bytes));
 await checkAttestations(projectRoot,input,digest(bytes),{required:true});
 const receipt={schemaVersion:2,kind:'render-review',createdAt:new Date().toISOString(),media:input.media,mediaSha256:digest(bytes),mediaBytes:bytes.length,durationSeconds:input.durationSeconds,reviewer:input.reviewer,inspectedRanges:input.inspectedRanges,displayTarget:input.displayTarget,legibilityInspection:input.legibilityInspection,playback:input.playback,listening:input.listening,defects:input.defects,notes:input.notes??'',...(input.qualityAssessment?{qualityAssessment:input.qualityAssessment}:{}),inspectionMethod:input.inspectionMethod??'unspecified',...reviewCoverage(input,coverageComplete),approval:false,attestationTrust:'Locally recorded human declaration; identity and perception are not independently authenticated'};
 const target=outputDirectory??path.join(projectRoot,'evidence','review-receipts');
 const relative=path.relative(projectRoot,target);if(!relative||relative.startsWith('..')||path.isAbsolute(relative))throw Error('Receipt output must be inside the project');
 await fs.mkdir(target,{recursive:true});
 // Check real destination so a caller cannot send evidence through a directory symlink.
 const realRoot=await fs.realpath(projectRoot),realTarget=await fs.realpath(target),realRelative=path.relative(realRoot,realTarget);
 if(realRelative.startsWith('..')||path.isAbsolute(realRelative))throw Error('Receipt output escapes the project');
 const receiptPath=path.join(target,`${Date.now()}-${crypto.randomUUID()}.json`);
 await fs.writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
 return {receiptPath,receipt};
}
export async function verifyReviewReceipt(projectRoot,receiptPath,{mediaPath,expectedDuration,requireComplete=false}={}){
 const receipt=JSON.parse(await fs.readFile(await mediaFile(projectRoot,path.isAbsolute(receiptPath)?path.relative(projectRoot,receiptPath).split(path.sep).join('/'):receiptPath),'utf8'));
 const complete=validate(receipt,{allowLegacy:true});
 if(expectedDuration!==undefined&&(!Number.isFinite(expectedDuration)||Math.abs(receipt.durationSeconds-expectedDuration)>0.05))throw Error('Review duration differs from measured media duration');
 if(receipt.kind!=='render-review'||receipt.approval!==false)throw Error('Receipt is not a render review; review never implies approval');
 if(mediaPath&&receipt.media!==mediaPath)throw Error('Receipt targets a different media artifact');
 const bytes=await fs.readFile(await mediaFile(projectRoot,receipt.media));
 if(receipt.mediaSha256!==digest(bytes)||receipt.mediaBytes!==bytes.length)throw Error('Reviewed media changed; review the exact latest render');
 verifyDefectRechecks(receipt,digest(bytes));
 const attested=await checkAttestations(projectRoot,receipt,digest(bytes));
 const coverage=reviewCoverage(receipt,complete);
 if(!attested){coverage.continuousPlaybackComplete=false;coverage.perceptualReviewComplete=false;}
 if(requireComplete&&!coverage.perceptualReviewComplete)throw Error('Full review is incomplete; retain limitations and obtain actual review coverage');
 return {...receipt,...coverage};
}
