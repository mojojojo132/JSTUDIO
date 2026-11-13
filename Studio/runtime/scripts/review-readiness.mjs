/** Advisory completeness checks, not creative judgment or extra approval gates. */
import fs from 'node:fs';
import path from 'node:path';
import {productionReadiness} from './production-readiness.mjs';

const treatmentSections=['Visual world','Experience','Rhythm and transitions','Safety and accuracy','Audio'];
function treatmentReadiness(body){
 const headings=[...body.matchAll(/^#{2,6}\s+(.+?)\s*$/gm)];
 const sections=new Map(headings.map((heading,index)=>{
  const start=heading.index+heading[0].length,end=headings[index+1]?.index??body.length;
  return [heading[1].trim().toLowerCase(),body.slice(start,end).trim()];
 }));
 const present=treatmentSections.filter(name=>sections.has(name.toLowerCase()));
 if(!present.length)return null;
 const missing=treatmentSections.filter(name=>{
  const content=sections.get(name.toLowerCase())?.trim()??'';
  return !content||/^(?:[-*]\s*)?(?:\[[ x]?\]|TODO|TBD|pending|<.*>)?\s*$/i.test(content)||/^(?:describe|choose|enter|add|provide|record|list)\b.*(?:here|below|for this project|for this shot)\.?$/i.test(content);
 });
 return {filled:missing.length===0,missing};
}
function assessRecord(name,body){
 if(name==='ANIMATION-TREATMENT.md'){
  const sections=treatmentReadiness(body);
  if(sections)return sections;
 }
 const lines=body.split('\n');
 const filledBullet=lines.some(line=>/^\s*- [^:]+:\s*\S.{11}/.test(line)&&!/^\s*- (Internal decision|User approval):/.test(line));
 const filledRow=lines.some((line,index)=>/^\|/.test(line)&&!line.includes('---')&&!/^\s*\|[- :|]+\|\s*$/.test(lines[index+1]??'')&&line.split('|').filter(x=>x.trim()&&!/^(TBD|TODO|pending|<.*>|\[.*\])$/i.test(x.trim())).length>=3);
 if(filledBullet||filledRow)return {filled:true,missing:[]};
 const missing=lines.flatMap(line=>{
  const match=line.match(/^\s*-\s*([^:]+):\s*(.*)$/);if(!match)return [];
  const value=match[2].trim();return !value||/^(?:TODO|TBD|pending|<.*>|\[.*\])$/i.test(value)?[match[1].trim()]:[];
 });
 if(name==='ANIMATION-SEQUENCE.md'&&/^\|\s*\|/m.test(body))missing.unshift('sequence timing/action row');
 return {filled:false,missing:[...new Set(missing)]};
}

export function reviewReadiness(project,{animation=false}={}){
 const planning=[];
 if(animation)for(const name of ['ANIMATION-TREATMENT.md','ANIMATION-SEQUENCE.md','ANIMATION-REVIEW.md']){
  const file=path.join(project,name);
  if(!fs.existsSync(file)){planning.push({file:name,state:'missing',action:'Record the substantive decisions/review here or reference the existing project record.'});continue;}
  if(fs.lstatSync(file).isSymbolicLink()){planning.push({file:name,state:'unsupported-symlink'});continue;}
  const result=assessRecord(name,fs.readFileSync(file,'utf8'));
  planning.push({file:name,state:result.filled?'recorded-unassessed':'needs-substantive-record',action:result.filled?'Assess quality in review; presence alone is not a pass.':`Complete the missing field${result.missing.length===1?'':'s'}: ${result.missing.length?result.missing.join(', '):'add substantive planning or review evidence'}.`});
 }
 const presented=[];const dir=path.join(project,'evidence/gates');
 if(fs.existsSync(dir)&&!fs.lstatSync(dir).isSymbolicLink())for(const name of fs.readdirSync(dir)){
  const folder=path.join(dir,name),file=path.join(folder,'GATE-REPORT.json');
  if(fs.lstatSync(folder).isSymbolicLink()||!fs.existsSync(file)||fs.lstatSync(file).isSymbolicLink())continue;
  try{const r=JSON.parse(fs.readFileSync(file));if(r.event==='presented-for-review')presented.push({stage:r.stage,media:r.review?.receipt?.media,mediaSha256:r.review?.receipt?.mediaSha256,fingerprints:(r.snapshot?.ledger?.artifacts??[]).filter(a=>a.current).map(a=>a.fingerprint),path:path.relative(project,file)});}catch{}
 }
 return {planning,presentedGates:presented,production:productionReadiness(project),notice:'Advisory record checks only; no new creative approval gates.'};
}
