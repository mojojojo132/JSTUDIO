/**
 * Advisory production evidence inventory. Presence means a record or asset exists;
 * it never establishes accuracy, rights, playback quality, or human approval.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const MAX_RECORD_BYTES = 2 * 1024 * 1024;
const MAX_ASSET_ENTRIES_PER_DIR = 200;
const PLACEHOLDER = /^(?:[-*]\s*)?(?:\[[ x]?\]|TODO|TBD|pending|<.*>)?\s*$/i;
const LABELS = {
  source: /^[ \t]*-[ \t]*Source material and provenance:[ \t]*(.*)$/im,
  audioPlan: /^[ \t]*-[ \t]*Audio strategy:[ \t]*(.*)$/im,
  voice: /^[ \t]*-[ \t]*Voice, captions, and audio:[ \t]*(.*)$/im,
};

function within(root, target) {
  const rel = path.relative(root, target);
  return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
}

function safeFile(root, relative) {
  const full = path.resolve(root, relative);
  if (!within(root, full)) return null;
  let cursor = full;
  while (within(root, cursor)) {
    try {
      if (fs.lstatSync(cursor).isSymbolicLink()) return null;
    } catch (error) {
      if (error.code !== 'ENOENT') return null;
    }
    if (cursor === root) break;
    cursor = path.dirname(cursor);
  }
  try {
    const stat = fs.statSync(full);
    if (!stat.isFile() || stat.size > MAX_RECORD_BYTES) return null;
    const bytes = fs.readFileSync(full);
    return { path: path.relative(root, full).split(path.sep).join('/'), bytes, text: bytes.toString('utf8'), sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  } catch { return null; }
}

function recordField(record, expression) {
  if (!record) return { state: 'needs-evidence', value: '', evidence: [] };
  const match = record.text.match(expression);
  const value = match?.[1]?.trim() ?? '';
  const templateGuidance = /^narration\/music\/sound effects\/silence\b.*unresolved constraints:$/i.test(value);
  return {
    state: !value || PLACEHOLDER.test(value) || templateGuidance ? 'needs-evidence' : 'record-found-unverified',
    value,
    evidence: [{ path: record.path, sha256: record.sha256 }],
  };
}
function substantiveRecord(record){
 if(!record)return false;
 const lines=record.text.split('\n');
 return lines.some((line,index)=>{
  const value=line.trim();
  if(!value||/^#|^Status:\s*(?:draft|pending)/i.test(value)||PLACEHOLDER.test(value)||/^\|[- :|]+\|$/.test(value)||/^\|[- :|]+\|$/.test((lines[index+1]??'').trim()))return false;
  return value.replace(/[|\s:-]/g,'').length>8;
 });
}

function explicitlyInapplicable(value, topic) {
  if (!value) return false;
  const text = value.toLowerCase();
  if (topic === 'caption') return /\b(no captions?|captions? (?:not needed|not applicable|n\/a)|without captions?)\b/.test(text);
  return /\b(silent|no audio|audio (?:not needed|not applicable|n\/a)|without (?:sound|audio))\b/.test(text);
}

function scanAssets(root, nativePath) {
  const found = { caption: [], audio: [] };
  const mediaExt = /\.(?:vtt|srt|ass|ssa)$/i;
  const audioExt = /\.(?:wav|mp3|m4a|aac|ogg|opus|flac|aiff?)$/i;
  const dirs = ['media/audio', 'media/captions', `${nativePath}/assets/audio`, `${nativePath}/assets/captions`];
  for (const relative of dirs) {
    const dir = path.resolve(root, relative);
    if (!within(root, dir)) continue;
    let entries;
    try {
      let cursor=root,unsafe=false;
      for(const part of path.relative(root,dir).split(path.sep)){cursor=path.join(cursor,part);if(fs.lstatSync(cursor).isSymbolicLink()){unsafe=true;break;}}
      if(unsafe)continue;
      entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a,b)=>a.name.localeCompare(b.name)).slice(0, MAX_ASSET_ENTRIES_PER_DIR);
    } catch { continue; }
    for (const entry of entries) {
      if (!entry.isFile() || entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name), rel = path.relative(root, full).split(path.sep).join('/');
      if (mediaExt.test(entry.name)) found.caption.push(rel);
      if (audioExt.test(entry.name)) found.audio.push(rel);
    }
  }
  const index = safeFile(root, `${nativePath}/index.html`);
  if (index) {
    if (/<track\b[^>]*\bkind\s*=\s*["']?(?:captions|subtitles)\b|\b(?:captions?|subtitles?)\s*[:=]/i.test(index.text)) found.caption.push(index.path);
    if (/<audio\b|\.(?:wav|mp3|m4a|aac|ogg|opus|flac)(?:[?#"'\s]|$)/i.test(index.text)) found.audio.push(index.path);
  }
  for (const key of Object.keys(found)) found[key] = [...new Set(found[key])].slice(0, 50);
  return found;
}

function evidenceForFiles(root, files) {
  return files.flatMap(relative => {
    const full = path.resolve(root, relative);
    if (!within(root, full)) return [];
    let cursor = full;
    while (within(root, cursor)) {
      try { if (fs.lstatSync(cursor).isSymbolicLink()) return []; }
      catch (error) { if (error.code !== 'ENOENT') return []; }
      if (cursor === root) break;
      cursor = path.dirname(cursor);
    }
    try {
      const stat = fs.statSync(full);
      if (!stat.isFile()) return [];
      const filePath = path.relative(root, full).split(path.sep).join('/');
      if (stat.size > MAX_RECORD_BYTES) return [{path: filePath, sha256: null, fingerprintStatus: 'not-computed-large-media'}];
      const bytes = fs.readFileSync(full);
      return [{path: filePath, sha256: crypto.createHash('sha256').update(bytes).digest('hex')}];
    } catch { return []; }
  });
}

export function productionReadiness(project) {
  const root = fs.realpathSync(project);
  if (!fs.statSync(root).isDirectory()) throw Error('Project must be a directory.');
  const projectFile = safeFile(root, 'PROJECT.json');
  let nativePath = 'editor';
  if (projectFile) {
    try {
      const manifest = JSON.parse(projectFile.text);
      if (typeof manifest.nativeProject === 'string' && !path.isAbsolute(manifest.nativeProject)) {
        const candidate = path.resolve(root, manifest.nativeProject);
        if (within(root, candidate)) nativePath = path.relative(root, candidate);
      }
    } catch { /* Keep the conventional editor path and report missing evidence below. */ }
  }
  const brief = safeFile(root, 'BRIEF.md');
  const board = safeFile(root, 'STORYBOARD.md');
  const source = recordField(brief, LABELS.source);
  const sourceRecords=['SOURCES.md','ASSETS.md','SOURCE-REGISTER.json','media/PROVENANCE.md'].map(name=>safeFile(root,name)).filter(substantiveRecord);
  const rightsRecord=safeFile(root,'RIGHTS.md');
  const rightsEvidence=[...sourceRecords,...(substantiveRecord(rightsRecord)?[rightsRecord]:[])].filter(record=>/\b(?:licen[cs]e|permission|rights|public domain|original|owned|consent)\b/i.test(record.text));
  if(source.state==='needs-evidence'&&sourceRecords.length){source.state='record-found-unverified';source.evidence=sourceRecords.map(({path,sha256})=>({path,sha256}));}
  const audioPlan = recordField(brief, LABELS.audioPlan);
  const voicePlan = recordField(brief, LABELS.voice);
  const assets = scanAssets(root, nativePath);
  const captionNA = explicitlyInapplicable(voicePlan.value, 'caption');
  const audioNA = explicitlyInapplicable(audioPlan.value, 'audio') || explicitlyInapplicable(voicePlan.value, 'audio');

  const checks = [
    {
      id: 'source-provenance', area: 'sources', state: source.state,
      evidence: source.evidence,
      action: source.state === 'needs-evidence' ? 'Record the source material and provenance in BRIEF.md, or point to the existing project record.' : 'Review the recorded source trail and confirm its accuracy for this film.',
    },
    {
      id: 'asset-rights-basis', area: 'rights', state: rightsEvidence.length?'evidence-found-unverified':'needs-evidence',
      evidence: rightsEvidence.length?rightsEvidence.map(({path,sha256})=>({path,sha256})):[...source.evidence, ...(audioPlan.state !== 'needs-evidence' ? audioPlan.evidence : [])],
      action: 'Record the permission or rights basis and usage limits for sourced material; source provenance alone does not establish clearance.',
    },
    {
      id: 'captions', area: 'captions',
      state: assets.caption.length ? 'evidence-found-unverified' : captionNA ? 'declared-not-applicable-unverified' : voicePlan.state === 'needs-evidence' ? 'needs-evidence' : 'plan-found-asset-not-discovered',
      evidence: evidenceForFiles(root, assets.caption),
      action: assets.caption.length ? 'Review caption timing, wording, and synchronization against the encoded candidate.' : captionNA ? 'No caption asset expected per the brief; confirm this remains appropriate for the delivery context.' : 'Record the caption plan and add or identify caption evidence, or explicitly document why captions do not apply.',
    },
    {
      id: 'audio', area: 'audio',
      state: assets.audio.length ? 'evidence-found-unverified' : audioNA ? 'declared-not-applicable-unverified' : audioPlan.state === 'needs-evidence' ? 'needs-evidence' : 'plan-found-asset-not-discovered',
      evidence: [...audioPlan.evidence, ...evidenceForFiles(root, assets.audio)],
      action: assets.audio.length ? 'Listen to the encoded candidate and assess the mix, levels, and intended sound.' : audioNA ? 'Silence or no audio is recorded; confirm the encoded candidate matches that intent.' : 'Record the intended audio, source and permission basis, availability, fallback, and unresolved constraints; identify audio evidence when available.',
    },
    {
      id: 'storyboard-source-cues', area: 'planning',
      state: board && board.text.split('\n').some((line,index,lines) => {
        if(!line.trim()||/^\s*#/.test(line)||/^\s*\|[- :|]+\|\s*$/.test(line)||/^\s*\|[- :|]+\|\s*$/.test(lines[index+1]??''))return false;
        return /\b(?:source|footage|archive|provided|original|stock|media\/)/i.test(line)&&!/^\s*[-*]?\s*(?:source|provenance)[^:]*:\s*$/i.test(line);
      }) ? 'evidence-found-unverified' : 'needs-evidence',
      evidence: board ? [{ path: board.path, sha256: board.sha256 }] : [],
      action: 'Record the source/provenance for storyboard material where applicable; preserve the storyboard’s free-form structure.',
    },
  ];
  return { checks, discovery: {scope:'Named source/rights records, BRIEF.md, STORYBOARD.md, the configured editor entry and four named media directories only; arbitrary project layouts are not exhaustively searched.', maxEntriesPerAssetDirectory:MAX_ASSET_ENTRIES_PER_DIR}, notice: 'Advisory evidence inventory only. Recorded material may be incomplete or inaccurate; rights, media quality, creative quality, and approval require human review.' };
}
