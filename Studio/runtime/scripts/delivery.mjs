/** Promote an approved encoded candidate without rendering or altering its bytes. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function local(root,name){
 if(typeof name!=='string'||!name||path.isAbsolute(name)||name.includes('\\')||name.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('Expected a project-relative delivery path');
 let target=root;for(const part of name.split('/')){target=path.join(target,part);let stat;try{stat=fs.lstatSync(target);}catch(error){if(error.code!=='ENOENT')throw error;}if(stat?.isSymbolicLink())throw Error('Delivery cannot follow symlinks');}return target;
}
export function deliverApprovedCut(project,ledgerPath,destination,{status}={}){
 const ledger=JSON.parse(fs.readFileSync(ledgerPath,'utf8'));
 if(ledger.purpose==='synthetic-test')throw Error('Synthetic test approvals cannot authorize production delivery');
 const cut=ledger.artifacts.findLast(a=>a.kind==='cut'&&a.id==='main');
 if(!cut?.approval||cut.approval.fingerprint!==cut.fingerprint)throw Error('Approve the exact complete cut before delivery');
 const current=status(ledgerPath).artifacts.find(a=>a.kind==='cut'&&a.id==='main');
 if(!current?.current||current.fingerprint!==cut.fingerprint)throw Error('Approved candidate changed; review the new candidate');
 if(!destination?.startsWith('delivery/')||! /\.(mp4|mov|webm|m4v|mkv)$/i.test(destination))throw Error('Delivery must be a video inside delivery/');
 const source=local(project,cut.media),target=local(project,destination),record=cut.files.find(f=>f.path===cut.media);
 if(!record||hash(source)!==record.sha256)throw Error('Approved candidate bytes changed');
 fs.mkdirSync(path.dirname(target),{recursive:true});
 const folder=local(project,'evidence/delivery');fs.mkdirSync(folder,{recursive:true});
 // Exclusive copy preserves old deliveries. A candidate already in delivery needs no copy.
 if(source!==target)fs.copyFileSync(source,target,fs.constants.COPYFILE_EXCL);
 if(hash(target)!==record.sha256||hash(source)!==record.sha256)throw Error('Delivery byte verification failed');
 const receipt={schemaVersion:1,kind:'approved-byte-delivery',createdAt:new Date().toISOString(),candidate:cut.media,destination,sha256:record.sha256,cutFingerprint:cut.fingerprint,approval:cut.approval,rendered:false,byteIdentical:true,scope:'Local delivery only; no publication or independent viewing attestation'};
 const receiptPath=path.join(folder,Date.now()+'-'+crypto.randomUUID()+'.json');fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
 return {path:target,receiptPath,...receipt};
}
