import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {resolveWorkspace} from './workspace.mjs';
import {root,hf} from './common.mjs';

export async function validateInstallation(directory,{platform=process.platform,arch=process.arch}={}) {
 const target=`${platform}-${arch}`;
 if (!['darwin-arm64','darwin-x64','win32-x64'].includes(target)) throw Error(`Unsupported runtime ${target}. Use a supported Mac or x64 Windows installation.`);
 let receipt;
 try { receipt=JSON.parse(await fs.readFile(path.join(directory,'.runtime/setup-complete.json'),'utf8')); }
 catch { throw Error('Setup is incomplete. Run the Setup launcher for this computer, then launch again.'); }
 if (receipt.platform!==target) throw Error(`This runtime was installed for ${receipt.platform}, not ${target}. Transfer project folders only; run Setup in a fresh package on this computer.`);
 await fs.access(path.join(directory,'node_modules/hyperframes/bin/hyperframes.mjs')).catch(()=>{throw Error('Studio dependencies are missing. Rerun Setup.');});
 return receipt;
}

export async function listProjects(directory=root) {
 const {projects}=resolveWorkspace(directory);
 let entries;
 try {entries=await fs.readdir(projects,{withFileTypes:true});}catch(error){if(error.code==='ENOENT')return [];throw error;}
 const result=[];
 for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))) {
  if(!entry.isDirectory())continue;
  try {const manifest=JSON.parse(await fs.readFile(path.join(projects,entry.name,'PROJECT.json'),'utf8'));result.push({name:entry.name,nativeProject:manifest.nativeProject??null});}
  catch(error){if(error.code!=='ENOENT')result.push({name:entry.name,error:error.message});}
 }
 return result;
}

export async function launch(args=process.argv.slice(2),{directory=root,preview=hf,validate=validateInstallation,log=console.log}={}) {
 const workspace=resolveWorkspace(directory);
 if(!args[0]) {
  const projects=await listProjects(directory);
  log(projects.length?'Available projects:\n'+projects.map(p=>`  ${p.name}${p.error?' (invalid manifest)':p.nativeProject?'':' (no native edit)'}`).join('\n')+'\nOpen one with npm start -- project-name.':'No projects yet. Create one with npm run new -- project-name, then npm start -- project-name.');
  return projects;
 }
 await validate(directory);
 let project=path.resolve(workspace.home,args[0]);
 if(/^projects[\\/]/.test(args[0]))project=path.resolve(workspace.projects,args[0].slice(9));
 if(!args[0].includes('/') && !args[0].includes('\\')) project=path.join(workspace.projects,args[0]);
 try {const manifest=JSON.parse(await fs.readFile(path.join(project,'PROJECT.json'),'utf8'));
  if(!manifest.nativeProject) throw Error('This project has no native edit yet. Read its storyboard and production records first.');
  project=path.resolve(project,manifest.nativeProject);
 } catch(error) {if(error.code!=='ENOENT')throw error;}
 await fs.access(path.join(project,'index.html')).catch(()=>{throw Error(`Project does not contain index.html: ${project}. Pass a native project folder or create one with npm run new -- project-name.`);});
 const flags=args.slice(1),mode=flags.some(a=>['--background','--foreground','--status','--stop','--list','--selection','--context','--kill-all','--help','-h'].includes(a))?[]:['--foreground'];
 await preview(['preview',project,...mode,...flags]);
}
if (process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
 try { await launch(); } catch(error) { console.error(error.message); process.exitCode=1; }
}
