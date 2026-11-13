import fs from 'node:fs';
import path from 'node:path';

/** Project-local recorded evidence only. Does not infer unrecorded render activity. */
export function summarizeReceipts(project,commands) {
 const byStatus={},byStage={};
 for(const command of commands){
  const status=command.unreadable?'unreadable':command.operation?.status??'unknown';
  byStatus[status]=(byStatus[status]??0)+1;
  const stage=command.stage??'unknown';byStage[stage]=(byStage[stage]??0)+1;
 }
 const proofs=[],errors=[],seen=new Set();const directory=path.join(project,'evidence/proofs');
 if(fs.existsSync(directory)&&!fs.lstatSync(directory).isSymbolicLink())for(const name of fs.readdirSync(directory).sort()){
  if(!name.endsWith('.json'))continue;
  const file=path.join(directory,name),relative=path.relative(project,file).split(path.sep).join('/');
  if(!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink())continue;
  try{
   const receipt=JSON.parse(fs.readFileSync(file,'utf8'));
   if(receipt.kind!=='internal-proof'||receipt.output?.decoded!==true||!receipt.output?.path||!/^[a-f0-9]{64}$/.test(receipt.output?.sha256??''))throw Error('Invalid internal-proof receipt');
   const key=JSON.stringify([receipt.output.path,receipt.output.sha256]);
   const duplicate=seen.has(key);seen.add(key);
   proofs.push({receipt:relative,output:receipt.output.path,sha256:receipt.output.sha256,duplicate});
  }catch(error){errors.push({receipt:relative,error:error.message});}
 }
 return {scope:'All recorded project command/proof receipts at this gate; not just the current conversation.',commands:{total:commands.length,byStatus,byStage},proofs:{receiptCount:proofs.length,uniqueOutputs:seen.size,records:proofs,errors},limitations:['Receipt count is not a count of every render attempt. Failed commands are counted separately.','Summarizes saved assertions; does not rehash outputs or prove playback, approval or model usage.']};
}
