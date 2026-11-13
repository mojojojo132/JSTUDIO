import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {root,run,hf,python} from './common.mjs';
import {verifyAnimationPayload} from './animation.mjs';
import {withSetupReadiness,checkSetupProject,optionalVoiceSetup} from './setup-validation.mjs';
async function exists(p){try{await fs.access(p);return true;}catch{return false;}}
async function download(url,file,hash){
 const response=await fetch(url);if(!response.ok)throw Error(`Download failed: ${response.status} ${url}`);
 const bytes=Buffer.from(await response.arrayBuffer());
 if(crypto.createHash('sha256').update(bytes).digest('hex')!==hash)throw Error('Downloaded runtime checksum mismatch.');
 await fs.writeFile(file,bytes);
}
try{
 const platform=`${process.platform}-${process.arch}`;
 if(!['darwin-arm64','darwin-x64','win32-x64'].includes(platform))throw Error('This package targets Apple Silicon / Intel Mac and x64 Windows.');
 if(Number(process.versions.node.split('.')[0])<22)throw Error('Node 22 or newer required. Use the included setup launcher.');
 await verifyAnimationPayload(root);
 const runtime=path.join(root,'.runtime');
 const metadata={platform,node:process.version,editor:'0.8.77',voice:{available:false,reason:'Optional narration not requested'}};
 await withSetupReadiness(runtime,metadata,async()=>{
 const npm=path.join(path.dirname(process.execPath),process.platform==='win32'?'node_modules/npm/bin/npm-cli.js':'../lib/node_modules/npm/bin/npm-cli.js');
 await run(process.execPath,[npm,'ci','--no-audit','--no-fund'],{env:{...process.env,PATH:[path.dirname(process.execPath),process.env.PATH||''].join(path.delimiter)}});
 await hf(['browser','ensure']);
 await checkSetupProject(root,hf);
 await run(process.execPath,[path.join(root,'scripts/verify.mjs')]);
 metadata.voice=await optionalVoiceSetup(process.argv.includes('--voice'),async()=>{
 const manifests=JSON.parse(await fs.readFile(path.join(root,'runtime-manifest.json'),'utf8'));
 const asset=manifests.uv[platform];const archive=path.join(runtime,asset.file);const folder=path.join(runtime,'uv');await fs.mkdir(folder,{recursive:true});
 const uv=path.join(folder,process.platform==='win32'?'uv.exe':'uv');
 if(!await exists(uv)){
  console.log('Downloading verified uv to install local Python for narration…');await download(asset.url,archive,asset.sha256);
  if(process.platform==='win32'){
   const quote=s=>"'"+s.replaceAll("'","''")+"'";
   await run('powershell.exe',['-NoProfile','-Command',`$ErrorActionPreference='Stop'; Expand-Archive -LiteralPath ${quote(archive)} -DestinationPath ${quote(folder)} -Force`]);
  }else await run('/usr/bin/tar',['-xzf',archive,'-C',folder,'--strip-components=1']);
 }
 const env={...process.env,UV_PYTHON_INSTALL_DIR:path.join(runtime,'python'),UV_CACHE_DIR:path.join(runtime,'uv-cache'),UV_PYTHON_BIN_DIR:path.join(runtime,'bin')};
 await run(uv,['python','install','3.12'],{env});
 if(!await exists(python))await run(uv,['venv','--python','3.12','--managed-python','--relocatable','--allow-existing',path.join(runtime,'voice')],{env});
 await run(uv,['pip','install','--python',python,'-r',path.join(root,'requirements-voice.txt')],{env});
 await hf(['tts','Every video starts with a useful idea.','--voice','af_heart','--speed','1.02','--output',path.join(runtime,'voice-check.wav')]);
 });
 metadata.status=metadata.voice.available?'ready':'core-ready-with-voice-unavailable';
 if(!metadata.voice.available)console.log('Core verified; Animator source available. Narration: '+metadata.voice.reason);
 });
 console.log('Animation source is verified. For animated shots: npm run animation -- new <name>, then setup <name>.');
 console.log('Ready. Open your AI assistant in this folder and read START-HERE.md. The launch shortcut opens the native Editor editor.');
}catch(e){console.error('\nSetup did not finish:',e.message,'\nFix the reported issue and rerun setup.');process.exitCode=1;}
