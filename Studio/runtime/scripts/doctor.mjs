import {animationDoctor} from './animation.mjs';
import {root} from './common.mjs';
import {runtimeEnvironment} from './runtime.mjs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

function probeBinary(file,env){execFileSync(file,['-version'],{env,stdio:'pipe'});}
function checkVoice(env){execFileSync(env.HYPERFRAMES_PYTHON,['-c','import kokoro_onnx, espeakng_loader'],{env,stdio:'pipe'});}

/** Check core editing/export independently from optional local narration readiness. */
export async function runDoctor({
 studioRoot=root,
 requireVoice=false,
 animationPath,
 animationRequested=animationPath!==undefined,
 resolveEnvironment=runtimeEnvironment,
 probe=probeBinary,
 verifyVoice=checkVoice,
 checkAnimation=animationDoctor,
}={}){
 const report={ok:false,media:false,voice:false};
 let runtime;
 try{
  // Ask only for the core environment first. Voice absence must not hide usable media tools.
  runtime=await resolveEnvironment(studioRoot,{requireVoice:false});
  for(const key of ['HYPERFRAMES_FFMPEG_PATH','HYPERFRAMES_FFPROBE_PATH'])probe(runtime.env[key],runtime.env);
  report.media=true;
 }catch(error){
  report.error=error.message;
  return report;
 }

 if(runtime.voice){
  try{
   verifyVoice(runtime.env,runtime.voice);
   report.voice=true;report.voiceProvider='kokoro';report.voiceIdentityVerified=false;report.relocatedVoice=!!runtime.voice.relocated;
  }catch(error){report.voiceError=error.message;}
 }
 if(!report.voice){
  report.note='Editing/export available; local narration is unavailable. Use recorded or externally generated narration when needed.';
  if(requireVoice&&!report.voiceError)report.voiceError='Local voice is not set up. Run Setup for local narration, or use a recorded or externally generated voice track.';
 }

 if(animationRequested){
  try{report.animation=await checkAnimation(animationPath,studioRoot);}
  catch(error){report.error=error.message;}
 }
 report.ok=report.media&&(!requireVoice||report.voice)&&!report.error;
 return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const args=process.argv.slice(2),animationIndex=args.indexOf('--animation');
 const animationPath=animationIndex<0?undefined:args[animationIndex+1]?.startsWith('--')?undefined:args[animationIndex+1];
 const report=await runDoctor({requireVoice:args.includes('--voice'),animationPath,animationRequested:animationIndex>=0});
 console.log(JSON.stringify(report,null,2));
 if(!report.ok)process.exitCode=1;
}
