import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const managed = name => name.startsWith('app/src/engine/') || name.startsWith('app/scripts/') || ['app/src/main.ts','app/src/project.ts','app/src/timeline.ts','render.mjs','setup.mjs'].includes(name);
const dependencies = ['app/package.json','app/package-lock.json'];
async function safeFile(root, relative, optional = false) {
  const parts = relative.split('/');
  if (!relative || path.isAbsolute(relative) || relative.includes('\\') || parts.some(p => !p || p === '.' || p === '..')) throw Error('Unsafe engine path: ' + relative);
  let file = root;
  for (const [i, part] of parts.entries()) {
    file = path.join(file, part);
    let stat;
    try { stat = await fs.lstat(file); } catch (error) { if (optional && error.code === 'ENOENT') return null; throw error; }
    if (stat.isSymbolicLink() || (i < parts.length - 1 ? !stat.isDirectory() : !stat.isFile())) throw Error('Unsafe engine file: ' + relative);
  }
  return fs.readFile(file);
}
async function rootCheck(root) {
  const absolute=path.resolve(root), parsed=path.parse(absolute);
  let current=parsed.root;
  for(const part of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current=path.join(current,part);const stat=await fs.lstat(current);
    if(stat.isSymbolicLink()||!stat.isDirectory())throw Error('Engine root ancestors must be real directories');
  }
}
function inventory(bytes) {
  const value=JSON.parse(bytes);
  if(!value||Array.isArray(value)||!Object.keys(value).length)throw Error('Missing engine baseline');
  for(const [name,digest] of Object.entries(value)) {
    if(path.isAbsolute(name)||name.includes('\\')||name.split('/').some(p=>!p||p==='.'||p==='..')||!/^[a-f0-9]{64}$/.test(digest))throw Error('Invalid engine baseline entry');
  }
  return value;
}
/** Default is a read-only plan. Caller must verify the packaged payload before calling. */
export async function updateAnimationEngine(animationRoot, payloadRoot, {apply=false}={}) {
  await rootCheck(animationRoot);await rootCheck(payloadRoot);
  const oldBytes=await safeFile(animationRoot,'SOURCE-SHA256.json');
  const old=inventory(oldBytes), nextBytes=await safeFile(payloadRoot,'SOURCE-SHA256.json'), next=inventory(nextBytes);
  const markerBytes=await safeFile(animationRoot,'ANIMATION-WORKSPACE.json');
  const marker=JSON.parse(markerBytes);
  if(marker.sourceManifestSha256!==hash(oldBytes))throw Error('Workspace baseline identity differs from its marker');
  for(const name of dependencies) {
    const current=await safeFile(animationRoot,name), target=await safeFile(payloadRoot,name);
    if(hash(current)!==old[name]||hash(target)!==next[name]||hash(current)!==hash(target))throw Error('Dependency change requires a separately validated migration: '+name);
  }
  const changes=[], conflicts=[];
  for(const name of [...new Set([...Object.keys(old),...Object.keys(next)])].filter(managed).sort()) {
    const current=await safeFile(animationRoot,name,true);
    if(old[name]&&(!current||hash(current)!==old[name])) {conflicts.push({path:name,reason:'Managed core differs from recorded baseline or is missing'});continue;}
    if(!old[name]&&current) {conflicts.push({path:name,reason:'New managed path collides with an existing file'});continue;}
    if(!next[name]) {conflicts.push({path:name,reason:'Managed file removal requires a separately reviewed migration'});continue;}
    const target=await safeFile(payloadRoot,name);
    if(hash(target)!==next[name])throw Error('Packaged engine file differs from manifest: '+name);
    if(old[name]!==next[name])changes.push({path:name,before:old[name]??null,after:next[name]});
  }
  const plan={schemaVersion:1,kind:'animation-engine-update',applied:false,oldBaselineSha256:hash(oldBytes),payloadManifestSha256:hash(nextBytes),changes,conflicts,dependenciesUnchanged:true,preserved:'Scenes, configs, brand, assets, media, dependencies and approval ledgers are not written. Prior source-bound reviews may become stale.'};
  if(!apply)return plan;
  if(conflicts.length)throw Error('Engine update conflicts: '+conflicts.map(c=>c.path).join(', '));
  if(!changes.length)return {...plan,note:'Managed engine already matches; no files changed.'};
  // Store recovery outside animation source so old core files cannot affect dependency inventory.
  const evidence=path.join(path.dirname(animationRoot),'evidence');
  await fs.mkdir(evidence,{recursive:true});await rootCheck(evidence);
  const backup=await fs.mkdtemp(path.join(evidence,'engine-update-'));
  await fs.writeFile(path.join(backup,'PLAN.json'),JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
  for(const name of ['SOURCE-SHA256.json','ANIMATION-WORKSPACE.json',...changes.filter(c=>c.before).map(c=>c.path)]) {
    const dest=path.join(backup,'before',name);await fs.mkdir(path.dirname(dest),{recursive:true});
    await fs.writeFile(dest,await safeFile(animationRoot,name),{flag:'wx'});
  }
  // Recheck every observed core/dependency immediately before writing; no partial apply on detected drift.
  const recheck=await updateAnimationEngine(animationRoot,payloadRoot);
  if(JSON.stringify(recheck)!==JSON.stringify(plan))throw Error('Engine changed while preparing update; recovery plan retained at '+backup);
  const written=[];
  try {
    for(const change of changes) {
      const target=await safeFile(payloadRoot,change.path);
      if(hash(target)!==change.after)throw Error('Packaged source changed during update');
      const dest=path.join(animationRoot,change.path);await fs.mkdir(path.dirname(dest),{recursive:true});
      // Register an existing file before writing so an interrupted/failed write is restored.
      if(change.before) {written.push(change);await fs.writeFile(dest,target);}
      else {
        const handle=await fs.open(dest,'wx');written.push(change);
        try {await handle.writeFile(target);} finally {await handle.close();}
      }
    }
    const merged={...old};for(const change of changes)merged[change.path]=change.after;
    const mergedBytes=JSON.stringify(merged,null,2)+'\n';
    await fs.writeFile(path.join(animationRoot,'SOURCE-SHA256.json'),mergedBytes);
    await fs.writeFile(path.join(animationRoot,'ANIMATION-WORKSPACE.json'),JSON.stringify({...marker,sourceManifestSha256:hash(mergedBytes),engineUpdate:{at:new Date().toISOString(),payloadManifestSha256:hash(nextBytes),managedCoreOnly:true}},null,2)+'\n');
    const result={...plan,applied:true,baselineSha256:hash(mergedBytes),backup};
    await fs.writeFile(path.join(backup,'RESULT.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
    return result;
  } catch(error) {
    for(const change of written.reverse()) {
      if(change.before)await fs.copyFile(path.join(backup,'before',change.path),path.join(animationRoot,change.path));
      else await fs.unlink(path.join(animationRoot,change.path));
    }
    await fs.writeFile(path.join(animationRoot,'SOURCE-SHA256.json'),oldBytes);
    await fs.writeFile(path.join(animationRoot,'ANIMATION-WORKSPACE.json'),markerBytes);
    throw error;
  }
}
