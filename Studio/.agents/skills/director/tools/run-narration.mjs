#!/usr/bin/env node
// Resolve this package's local voice runtime, including long-path eSpeak recovery.
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
const [packageArg, manifest, output, ...flags] = process.argv.slice(2);
if (!packageArg || !manifest || !output || flags.some((flag,i) => flag !== '--check' && flag !== '--project-root' && flags[i-1] !== '--project-root') || flags.at(-1) === '--project-root') {
  console.error('Usage: node run-narration.mjs <studio-package-root> <manifest.json> <generated-output-dir> [--check] [--project-root <native-project>]');
  process.exit(1);
}
const home=path.resolve(packageArg);
const root=fs.existsSync(path.join(home,'STUDIO.json'))?path.join(home,'runtime'):home;
const runtimeFile=path.join(root,'scripts/runtime.mjs');
if (!fs.existsSync(runtimeFile)) {console.error('Studio package runtime.mjs is missing');process.exit(1);}
try {
  const {runtimeEnvironment}=await import(pathToFileURL(runtimeFile).href);
  const {env}=await runtimeEnvironment(root,{requireVoice:true});
  const tool=path.join(path.dirname(fileURLToPath(import.meta.url)),'build_narration.py');
  const result=spawnSync(env.HYPERFRAMES_PYTHON,[tool,path.resolve(manifest),'--output',path.resolve(output),...flags],{env,stdio:'inherit'});
  if (result.error) throw result.error;
  process.exit(result.status??1);
} catch(error) {console.error(`narration runtime: ${error.message}`);process.exit(1);}
