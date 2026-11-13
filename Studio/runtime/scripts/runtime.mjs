import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';

async function exists(file) { try { await fs.access(file); return true; } catch { return false; } }
async function directories(dir) {
  try { return (await fs.readdir(dir, {withFileTypes:true})).filter(e => e.isDirectory()).map(e => path.join(dir,e.name)); }
  catch (e) { if (e.code === 'ENOENT') return []; throw e; }
}
export async function resolveVoice(runtime, platform=process.platform) {
  const voice=path.join(runtime,'voice');
  const sites=platform==='win32' ? [path.join(voice,'Lib/site-packages')] :
    (await directories(path.join(voice,'lib'))).filter(p=>/^python3\.\d+$/.test(path.basename(p))).map(p=>path.join(p,'site-packages'));
  const site=(await Promise.all(sites.map(async p=>await exists(path.join(p,'kokoro_onnx')) ? p : null))).find(Boolean);
  if (!site) return null;
  const venvPython=path.join(voice,platform==='win32'?'Scripts/python.exe':'bin/python');
  if (await exists(venvPython)) return {python:venvPython,site,runtime,relocated:false};
  // uv environments can retain absolute links after a folder move. Use only
  // the matching managed interpreter inside this package, never global Python.
  const version=platform==='win32' ? null : path.basename(path.dirname(site)).slice(6);
  for (const install of (await directories(path.join(runtime,'python'))).sort().reverse()) {
    if (version && !path.basename(install).startsWith(`cpython-${version}.`)) continue;
    const binary=path.join(install,platform==='win32'?'python.exe':`bin/python${version}`);
    if (await exists(binary)) return {python:binary,site,runtime,relocated:true};
  }
  return null;
}

export async function prepareVoice(voice, {cacheRoot=os.tmpdir(),env=process.env}={}) {
  const loader=path.join(voice.site,'espeakng_loader');
  let paths=[voice.site];
  if (await exists(path.join(loader,'espeak-ng-data/phontab')) && path.join(loader,'espeak-ng-data').length>180) {
    const stamp=await fs.stat(path.join(loader,'__init__.py'));
    const key=crypto.createHash('sha256').update(loader+stamp.mtimeMs+stamp.size).digest('hex').slice(0,16);
    const cache=path.join(cacheRoot,`jstudio-voice-${key}`);
    if (path.join(cache,'espeakng_loader/espeak-ng-data').length>180)
      throw Error('The temporary directory is too long for local voice. Set JSTUDIO_VOICE_CACHE to a short writable local directory.');
    if (!await exists(path.join(cache,'complete'))) {
      await fs.mkdir(cacheRoot,{recursive:true});
      const staging=await fs.mkdtemp(path.join(cacheRoot,'jstudio-voice-stage-'));
      try {
        await fs.cp(loader,path.join(staging,'espeakng_loader'),{recursive:true});
        await fs.writeFile(path.join(staging,'complete'),'ready\n');
        try { await fs.rename(staging,cache); }
        catch(e) { if (!await exists(path.join(cache,'complete'))) throw e; }
      } finally { await fs.rm(staging,{recursive:true,force:true}); }
    }
    paths.unshift(cache);
  }
  if (env.PYTHONPATH) paths.push(env.PYTHONPATH);
  return {HYPERFRAMES_PYTHON:voice.python,PYTHONPATH:paths.join(path.delimiter)};
}

export async function runtimeEnvironment(root,{requireVoice=false,env=process.env,platform=process.platform}={}) {
  const require=createRequire(path.join(root,'package.json'));
  let ffmpeg,ffprobe;
  try { ffmpeg=require('ffmpeg-static'); ffprobe=require('ffprobe-static').path; }
  catch { throw Error('Bundled media tools are missing. Run setup (portable package) or npm ci (development workspace).'); }
  for (const file of [ffmpeg,ffprobe]) if (!file || !await exists(file))
    throw Error(`Bundled media binary is missing: ${file}. Run setup again.`);
  const result={...env,HYPERFRAMES_FFMPEG_PATH:ffmpeg,HYPERFRAMES_FFPROBE_PATH:ffprobe,
    PATH:[path.dirname(process.execPath),path.dirname(ffmpeg),path.dirname(ffprobe),env.PATH||''].join(path.delimiter)};
  if (env.HYPERFRAMES_PYTHON) {
    if (requireVoice && !await exists(env.HYPERFRAMES_PYTHON)) throw Error('The configured speech runtime points to a missing interpreter. Correct its path or rerun setup.');
    return {env:result,voice:await exists(env.HYPERFRAMES_PYTHON)?{python:env.HYPERFRAMES_PYTHON,explicit:true}:null};
  }
  const roots=[env.JSTUDIO_RUNTIME_ROOT,path.join(root,'.runtime')].filter(Boolean);
  // Source workspace may use its sibling portable installation; never silently
  // depend on a historical demo or a particular user's absolute directory.
  if (await exists(path.join(root,'native-starter'))) roots.push(path.resolve(root,'../JStudio-Editor-1.1.0/.runtime'));
  for (const runtime of roots) {
    const voice=await resolveVoice(runtime,platform);
    if (voice) return {env:{...result,...await prepareVoice(voice,{env,cacheRoot:env.JSTUDIO_VOICE_CACHE||os.tmpdir()})},voice};
  }
  if (requireVoice) throw Error('Local voice is not set up. Run the portable Setup launcher, or set JSTUDIO_RUNTIME_ROOT to its .runtime directory. Video editing and silent export remain available.');
  return {env:result,voice:null};
}
