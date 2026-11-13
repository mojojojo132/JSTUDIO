/** Route document-wrapped template scenes through the native standalone render shell. */
import {readFileSync, writeFileSync, renameSync, statSync} from 'node:fs';
import {resolve} from 'node:path';

export const templateEntrySignatures = [
  [
    'if (entryFile !== "index.html" && rawEntry.trimStart().startsWith("<template")) {',
    'if (entryFile !== "index.html" && unwrapTemplate(rawEntry) !== rawEntry) {'
  ],
  [
    '  const renderClone = createStandaloneEntryRenderClone(root, host, sceneDuration);\n  replaceBodyWithRenderClone(body, renderClone);\n  return document2.toString();',
    '  const renderClone = createStandaloneEntryRenderClone(root, host, sceneDuration);\n  // The cloned master is a structural shell, not the selected animated scene.\n  if (root !== host) renderClone.setAttribute("data-no-timeline", "");\n  // Torq: keep parent dependency scripts (e.g. local GSAP), not master timeline code.\n  const dependencyScripts = Array.from(body.children).filter((el) => el.tagName === "SCRIPT" && el.hasAttribute("src")).map((el) => el.cloneNode(true));\n  replaceBodyWithRenderClone(body, renderClone);\n  for (const script of dependencyScripts) body.appendChild(script);\n  return document2.toString();'
  ]
];

function inspect(packageDir) {
  const version = JSON.parse(readFileSync(resolve(packageDir, 'package.json'), 'utf8')).version;
  if (version !== '0.8.77') throw Error(`Editor template-entry compatibility patch requires version 0.8.77; found ${version}.`);
  const target = resolve(packageDir, 'dist/cli.js');
  const source = readFileSync(target, 'utf8');
  const states = templateEntrySignatures.map(([before, after]) => {
    const oldCount = source.split(before).length - 1;
    const newCount = source.split(after).length - 1;
    if (oldCount === 1 && newCount === 0) return 'original';
    if (oldCount === 0 && newCount === 1) return 'patched';
    throw Error('Unexpected template entry signature; no files changed.');
  });
  if (new Set(states).size !== 1) throw Error('Partial template entry patch; no files changed.');
  return {target, source, patched: states[0] === 'patched'};
}

export function verifyStudioTemplateEntry(packageDir) {
  if (!inspect(packageDir).patched) throw Error('Template entry compatibility repair is missing. Rerun Setup.');
}

export function patchStudioTemplateEntry(packageDir) {
  const {target, source, patched} = inspect(packageDir);
  if (patched) return {target, changed: false};
  let updated = source;
  for (const [before, after] of templateEntrySignatures) updated = updated.replace(before, after);
  const temp = `${target}.torq-template-entry-${process.pid}.tmp`;
  writeFileSync(temp, updated, {mode: statSync(target).mode});
  renameSync(temp, target);
  return {target, changed: true};
}
