#!/usr/bin/env node
// Read-only bounded source excerpts. This does not infer approvals or summarize missing text.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
const stages = {
  intake: ['PROJECT.json', 'BRIEF.md', 'STORYBOARD.md', 'INTERACTION-LOG.md'],
  animation: ['PROJECT.json', 'STORYBOARD.md', 'ANIMATION-REVIEW.md', 'INTERACTION-LOG.md'],
  finishing: ['PROJECT.json', 'EXCHANGE.json', 'ANIMATION-REVIEW.md', 'INTERACTION-LOG.md'],
  review: ['PROJECT.json', 'STORYBOARD.md', 'ANIMATION-REVIEW.md', 'INTERACTION-LOG.md'],
};
const roles={intake:'Director',animation:'Animator',finishing:'Editor',review:'Reviewer'};
export function buildStageContext(project, stage, maxChars = 12000) {
  if (!stages[stage]) throw new Error(`Unknown stage: ${stage}`);
  if (!Number.isInteger(maxChars) || maxChars < 1000 || maxChars > 50000) throw new Error('maxChars must be an integer from 1000 to 50000');
  const root = fs.realpathSync(project);
  if (!fs.statSync(root).isDirectory()) throw new Error('Project must be a directory');
  const names = ['AGENTS.md', 'brand/brand.json', ...stages[stage]];
  const allowance = Math.floor(maxChars / names.length);
  const files = names.map(name => {
    const candidate = path.join(root, name);
    if (!fs.existsSync(candidate)) return { path: name, status: 'missing' };
    const resolved = fs.realpathSync(candidate);
    if (!resolved.startsWith(root + path.sep)) return { path: name, status: 'outside-project', action: 'Inspect authorized source separately' };
    if (fs.statSync(resolved).size > 2 * 1024 * 1024) return { path: name, status: 'oversize', action: 'Inspect source separately' };
    const bytes = fs.readFileSync(resolved);
    const text = bytes.toString('utf8');
    const truncated = text.length > allowance;
    const tail = name === 'INTERACTION-LOG.md';
    return { path: name, status: 'available', sha256: crypto.createHash('sha256').update(bytes).digest('hex'), characters: text.length,
      truncated, excerptLocation: tail && truncated ? 'tail' : 'start',
      text: truncated ? (tail ? text.slice(-allowance) : text.slice(0, allowance)) : text };
  });
  const manifest=files.map(({path,status,sha256,characters,truncated,excerptLocation,text})=>({path,status,sha256:sha256??null,characters:characters??null,truncated:truncated??null,excerptLocation:excerptLocation??null,excerptSha256:text===undefined?null:crypto.createHash('sha256').update(text).digest('hex')}));
  const snapshotId=`stage-context-sha256:${crypto.createHash('sha256').update(JSON.stringify({schemaVersion:1,project:root,stage,role:roles[stage],maxChars,manifest})).digest('hex')}`;
  return { schemaVersion: 1, project: root, stage, role:roles[stage], snapshotId, maxExcerptCharacters: maxChars,
    reuse: 'If this snapshotId is already in the host context, reuse it and reload only changed source files. This identifies identical packets; it does not measure or claim model token savings.',
    notice: 'Read-only excerpts, not an approval summary. Missing or truncated text does not prove absence of decisions. Read authoritative records before acting on approvals. Hashes identify changes; reload changed sources only.',
    manifest, files };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2), options = {};
    for (let i = 0; i < args.length; i += 2) {
      if (!['--project', '--stage', '--max-chars'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Usage: stage-context.mjs --project <path> --stage <intake|animation|finishing|review> [--max-chars 12000]');
      options[args[i]] = args[i + 1];
    }
    if (!options['--project']) throw new Error('--project is required');
    console.log(JSON.stringify(buildStageContext(options['--project'], options['--stage'], options['--max-chars'] ? Number(options['--max-chars']) : 12000), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
