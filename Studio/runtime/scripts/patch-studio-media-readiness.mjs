/** Block delivery of known failed image/video loads in the shared native renderer. */
import {readFileSync, writeFileSync, renameSync, statSync} from 'node:fs';
import {resolve} from 'node:path';

export const mediaReadinessSignature = [
  '  if (strictness === "strict" || hasAudioProcessingFailure || hasSubTimelineScriptFailure) {\n    throw new RenderQualityError(job.warnings);\n  }',
  '  // Torq: actual failed media is not a deliverable; other best-effort warnings remain warnings.\n  const failedMedia = job.warnings.filter((warning) => warning.code === "media_load_failed");\n  for (const warning of failedMedia) {\n    const sources = Array.isArray(warning.details?.sources) ? warning.details.sources.join(", ") : "referenced image/video";\n    warning.message = `Media failed to load: ${sources}. Restore the missing/unreadable asset or update its source, then retry export. Run the project check to identify exact asset paths.`;\n  }\n  if (strictness === "strict" || hasAudioProcessingFailure || hasSubTimelineScriptFailure || failedMedia.length > 0) {\n    throw new RenderQualityError(job.warnings);\n  }'
];

function inspect(packageDir) {
  const version = JSON.parse(readFileSync(resolve(packageDir, 'package.json'), 'utf8')).version;
  if (version !== '0.8.77') throw Error(`Editor media-readiness compatibility patch requires version 0.8.77; found ${version}.`);
  const target = resolve(packageDir, 'dist/cli.js');
  const source = readFileSync(target, 'utf8');
  const [before, after] = mediaReadinessSignature;
  const oldCount = source.split(before).length - 1, newCount = source.split(after).length - 1;
  if (!((oldCount === 1 && newCount === 0) || (oldCount === 0 && newCount === 1)))
    throw Error('Unexpected media readiness signature; no files changed.');
  return {target, source, patched: newCount === 1};
}

export function verifyStudioMediaReadiness(packageDir) {
  if (!inspect(packageDir).patched) throw Error('Media readiness repair is missing. Rerun Setup.');
}

export function patchStudioMediaReadiness(packageDir) {
  const {target, source, patched} = inspect(packageDir);
  if (patched) return {target, changed: false};
  const temp = `${target}.torq-media-readiness-${process.pid}.tmp`;
  writeFileSync(temp, source.replace(...mediaReadinessSignature), {mode: statSync(target).mode});
  renameSync(temp, target);
  return {target, changed: true};
}
