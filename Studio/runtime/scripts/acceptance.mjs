import {writeRunReport,unavailableRunInput} from './run-report.mjs';
import {directorNodeTests as discoverDirectorNodeTests} from './acceptance-tests.mjs';
// Execute on the actual target computer after Setup. Never certifies UI/capture/quality.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {studioHome} from './workspace.mjs';
import {root,environment} from './common.mjs';
import {validateInstallation} from './launch.mjs';
import {create} from './new-project.mjs';
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const out=process.env.JSTUDIO_ACCEPTANCE_OUTPUT?path.resolve(process.env.JSTUDIO_ACCEPTANCE_OUTPUT,stamp):path.join(root,'acceptance-results',stamp);
await fs.mkdir(out,{recursive:true});
const receipt={startedAt:new Date().toISOString(),platform:process.platform,arch:process.arch,osRelease:os.release(),node:process.version,checks:[],automatedPassed:false,manualAcceptance:'pending',limitations:['Does not prove pristine-machine setup, UI editing, screen capture, project transfer, playback or perceived audio quality.']};
async function check(label,command,args,env) {
 const log=await fs.open(path.join(out,`${receipt.checks.length+1}.log`),'w');
 try {
  const code=await new Promise((resolve,reject)=>{
   const child=spawn(command,args,{cwd:root,env,stdio:['ignore',log.fd,log.fd]});
   const timer=setTimeout(()=>{child.kill();setTimeout(()=>child.kill('SIGKILL'),2000).unref();reject(Error(`${label} exceeded 15 minutes`));},900000);
   child.on('error',error=>{clearTimeout(timer);reject(error);});child.on('exit',(code,signal)=>{clearTimeout(timer);resolve(signal||code);});
  });
  receipt.checks.push({label,passed:code===0,exit:code});
  if(code!==0) throw Error(`${label} failed; inspect ${out}`);
 } catch(error) {if(!receipt.checks.some(item=>item.label===label)) receipt.checks.push({label,passed:false,error:error.message});throw error;} finally {await log.close();}
}
try {
 await validateInstallation(root);
 receipt.package=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8')).version;
 const inventory=await fs.readFile(path.join(root,'FILES.sha256'),'utf8');
 receipt.payloadInventorySha256=crypto.createHash('sha256').update(inventory).digest('hex');
 const mismatches=[];
 for(const line of inventory.trim().split('\n')) {
  const match=/^([a-f0-9]{64})  (.+)$/.exec(line);
  if(!match) throw Error('Malformed payload inventory');
  const target=path.resolve(root,match[2]);
  if(!target.startsWith(root+path.sep)) throw Error('Unsafe inventory path');
  try {if(crypto.createHash('sha256').update(await fs.readFile(target)).digest('hex')!==match[1]) mismatches.push(match[2]);} catch {mismatches.push(match[2]);}
 }
 receipt.payloadVerified=mismatches.length===0;receipt.payloadMismatches=mismatches;
 if(!receipt.payloadVerified) throw Error('Payload differs from FILES.sha256; use an unmodified candidate package.');
 const env=await environment({requireVoice:true});
 const run=(label,script,args=[])=>check(label,process.execPath,[path.join(root,script),...args],env);
 await run('Media and voice doctor','scripts/doctor.mjs',['--voice']);
 await run('Pinned runtime and brand integrity','scripts/verify.mjs');
 const tests=(await fs.readdir(path.join(root,'tests'))).filter(name=>name.endsWith('.test.mjs')).sort().map(name=>path.join(root,'tests',name));
 await check('Studio regression tests',process.execPath,['--test',...tests],env);
 const director=path.join(studioHome(root),'.agents/skills/director');
 await fs.access(path.join(director,'SKILL.md'));
 await check('Bundled Director regression tests',env.HYPERFRAMES_PYTHON,['-m','unittest','discover','-s',path.join(director,'tools/tests'),'-v'],{...env,PYTHONDONTWRITEBYTECODE:'1'});
 const directorNodeTests=await discoverDirectorNodeTests(director);
 if(directorNodeTests.length) await check('Bundled Director Node regression tests',process.execPath,['--test',...directorNodeTests],{...env,FFMPEG_PATH:env.HYPERFRAMES_FFMPEG_PATH,FFPROBE_PATH:env.HYPERFRAMES_FFPROBE_PATH});
 const manifest=path.join(out,'narration-manifest.json');
 await fs.writeFile(manifest,JSON.stringify({version:1,voice:'af_heart',speed:1.02,scenes:[{id:'setup-check',chapter:'Setup check',lines:[{text:'JStudio Director is ready for a review on this computer.'}]}]},null,2));
 await check('Bundled Director narration build',process.execPath,[path.join(director,'tools/run-narration.mjs'),root,manifest,path.join(out,'director-narration')],env);
 await check('Director narration decode',env.HYPERFRAMES_FFMPEG_PATH,['-v','error','-xerror','-i',path.join(out,'director-narration/voice/narration.wav'),'-f','null','-'],env);
 const name=`acceptance-${Date.now()}`;
 const project=path.join(await create(name,root,{projectsDirectory:path.join(out,'fixtures')}),'hyperframes');receipt.project=path.relative(root,project);
 await run('Strict native project check','scripts/hf.mjs',['check',project,'--strict']);
 await run('Local narration','scripts/hf.mjs',['tts','JStudio works on this computer.','--voice','af_heart','--output',path.join(out,'voice.wav')]);
 await run('Native video export','scripts/hf.mjs',['render',project,'--output',path.join(out,'video.mp4'),'--quality','delivery']);
 await check('Full video decode',env.HYPERFRAMES_FFMPEG_PATH,['-v','error','-xerror','-i',path.join(out,'video.mp4'),'-f','null','-'],env);
 await check('Full voice decode',env.HYPERFRAMES_FFMPEG_PATH,['-v','error','-xerror','-i',path.join(out,'voice.wav'),'-f','null','-'],env);
 receipt.automatedPassed=true;
} catch(error) {receipt.error=error.message;process.exitCode=1;}
finally {
 receipt.finishedAt=new Date().toISOString();
 receipt.runReport=writeRunReport(unavailableRunInput({runId:'acceptance-'+stamp,stage:'technical-acceptance',startedAt:receipt.startedAt,endedAt:receipt.finishedAt,reason:'Technical acceptance does not receive AI host token telemetry; supply an overall host report including subagents separately.'}),path.join(out,'RUN-REPORT.json')); 
 await fs.writeFile(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
 console.log(`Acceptance evidence: ${out}\nAutomated checks: ${receipt.automatedPassed?'PASS':'FAIL'}. Manual device acceptance remains pending; see PLATFORM-ACCEPTANCE.md.`);
}
