import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {diagnosticRun} from './process-diagnostics.mjs';
import {studioHome} from './workspace.mjs';
import {runtimeEnvironment} from './runtime.mjs';
import {withRunReport} from './tool-run.mjs';
import {finishRender,renderReportDirectory} from './finishing.mjs';
import {previewLaunchArguments} from './preview-launch.mjs';
import {verifyStudioNeutral} from './patch-studio-brand.mjs';
import {verifyStudioAssetCache} from './patch-studio-asset-cache.mjs';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const python=path.join(root,'.runtime/voice',process.platform==='win32'?'Scripts/python.exe':'bin/python');
export async function environment(options={}) { return (await runtimeEnvironment(root,options)).env; }
export async function run(command,args,options={}) { return diagnosticRun(command,args,{cwd:root,...options}); }
export async function hf(args,options={}) {
 args=previewLaunchArguments(args,{env:{...process.env,...options.env}});
 if(args[0]==='preview'&&!args.some(a=>['--help','-h','--status','--stop','--list','--selection','--context','--kill-all'].includes(a))){
  const native=path.join(root,'node_modules/hyperframes');verifyStudioNeutral(native);verifyStudioAssetCache(native);
 }
 const cwd=options.cwd??studioHome(root);
 const execute=async()=>{
  const env=await environment({requireVoice:args[0]==='tts'});
  const actual={cwd,...options,env:{...env,...options.env}};
  return finishRender(args,{runtime:root,cwd:actual.cwd,env:actual.env,runRender:forwarded=>run(process.execPath,[path.join(root,'node_modules/hyperframes/bin/hyperframes.mjs'),...forwarded],actual)});
 };
 if(args[0]!=='render'||args.includes('--help')||args.includes('-h'))return execute();
 return withRunReport({directory:renderReportDirectory(args,cwd),stage:'native-render'},execute);
}
