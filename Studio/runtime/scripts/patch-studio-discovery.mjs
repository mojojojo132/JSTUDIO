/** Native HyperFrames 0.8.77 compatibility patch; revalidate on upgrade. */
import { readFileSync, writeFileSync, renameSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export const originalPrefix = 'return join74(dirname30(outputPath), `work-${jobId}-`);';
export const patchedPrefix = 'return join74(dirname30(outputPath), `.hf-render-work-${jobId}-`);';
export function patchStudioDiscovery(packageDir) {
  const version = JSON.parse(readFileSync(resolve(packageDir, 'package.json'), 'utf8')).version;
  if (version !== '0.8.77') throw new Error(`Editor discovery compatibility patch requires version 0.8.77; found ${version}. Revalidate before upgrading.`);
  const target = resolve(packageDir, 'dist/cli.js'), source = readFileSync(target, 'utf8');
  const oldCount = source.split(originalPrefix).length - 1, newCount = source.split(patchedPrefix).length - 1;
  if (oldCount === 0 && newCount === 1) return { changed: false, target };
  if (oldCount !== 1 || newCount !== 0) throw new Error('Unexpected native work-directory signature; no files changed.');
  const temp = `${target}.torq-discovery-${process.pid}.tmp`;
  writeFileSync(temp, source.replace(originalPrefix, patchedPrefix), { mode: statSync(target).mode });
  renameSync(temp, target);
  return { changed: true, target };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(patchStudioDiscovery(process.argv[2] ?? resolve(dirname(fileURLToPath(import.meta.url)), '../node_modules/hyperframes'))));
