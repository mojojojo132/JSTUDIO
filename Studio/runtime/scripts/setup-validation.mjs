import fs from 'node:fs/promises';
import path from 'node:path';

// A failed repair must never retain a readiness marker from an earlier setup.
export async function withSetupReadiness(runtime,metadata,work){
 await fs.mkdir(runtime,{recursive:true});
 const marker=path.join(runtime,'setup-complete.json');
 await fs.rm(marker,{force:true});
 await work();
 await fs.writeFile(marker,JSON.stringify({completedAt:new Date().toISOString(),...metadata},null,2));
}

export async function checkSetupProject(root,hf){
 // Validate shipped source in a disposable directory, never the creator's work.
 const fixture=await fs.mkdtemp(path.join(root,'.runtime/setup-check-'));
 try{
  await fs.cp(path.join(root,'starter'),fixture,{recursive:true});
  await hf(['check',fixture,'--strict']);
 }finally{
  await fs.rm(fixture,{recursive:true,force:true});
 }
}

// Optional speech must never downgrade a verified core installation.
export async function optionalVoiceSetup(requested,install){
 if(!requested)return {available:false,reason:'Not requested; run npm run setup -- --voice to enable local narration.'};
 try{await install();return {available:true,provider:'local',voice:'af_heart'};}
 catch(error){return {available:false,reason:error.message};}
}
