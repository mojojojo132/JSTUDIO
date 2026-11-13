// Portable Node launcher for the pinned, project-local Bun runtime.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const engine=fileURLToPath(new URL('.',import.meta.url));
const marker=path.join(engine,'ANIMATION-WORKSPACE.json');
// Managed production enters the same guard/report boundary even when invoked directly.
// The internal marker avoids recursion; it is coordination, not a security boundary.
if (existsSync(marker) || existsSync(path.join(engine,'../PROJECT.json'))) {
 if (!process.env.STUDIO_GUARDED_ANIMATION_ROOT || realpathSync(process.env.STUDIO_GUARDED_ANIMATION_ROOT)!==realpathSync(engine)) {
  if (!existsSync(marker)) throw Error('Managed animation marker missing; run Studio workflow animation render.');
  const workspace=JSON.parse(readFileSync(marker,'utf8'));
  if (typeof workspace.runtimeRelativeToAnimation!=='string'||!workspace.runtimeRelativeToAnimation) throw Error('Managed runtime locator missing; use the Studio workflow animation render command.');
  const runtime=path.resolve(engine,workspace.runtimeRelativeToAnimation);
  const {main}=await import(pathToFileURL(path.join(runtime,'scripts/animation.mjs')).href);
  await main(['render',workspace.name,...process.argv.slice(2)],runtime);
  process.exit(0);
 }
}
const app=fileURLToPath(new URL('./app/',import.meta.url));
const bun=fileURLToPath(new URL('./app/node_modules/bun/bin/bun.exe',import.meta.url));
if (!existsSync(bun)) throw new Error('Run node setup.mjs first (local Bun missing).');
const args=process.argv.slice(2);
if (!args.includes('--project')) throw new Error('Use --project projects/<project>.json; upstream demo is reference only.');
if (args[0]==='video' && !args.includes('--ffmpeg') && !process.env.PDOOM_FFMPEG) {
 const probe=spawnSync('ffmpeg',['-version'],{stdio:'ignore'});
 if (probe.error || probe.status!==0) throw new Error('Provide --ffmpeg /path/to/ffmpeg or PDOOM_FFMPEG.');
}
const result=spawnSync(bun,[fileURLToPath(new URL('./app/scripts/render.ts',import.meta.url)),...args],{cwd:app,stdio:'inherit',env:process.env});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
