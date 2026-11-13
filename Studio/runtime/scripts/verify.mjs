import {studioHome,resolveWorkspace} from './workspace.mjs';
import {readBrandPack} from './brand.mjs';
import {verifyAnimationPayload} from './animation.mjs';
import fs from 'node:fs/promises';import path from 'node:path';import {root} from './common.mjs';
import {verifyStudioExport} from './patch-studio-export.mjs';
import {verifyStudioNeutral} from './patch-studio-brand.mjs';
import {verifyStudioAssetCache} from './patch-studio-asset-cache.mjs';
import {verifyStudioTemplateEntry} from './patch-studio-template-entry.mjs';
import {verifyStudioMediaReadiness} from './patch-studio-media-readiness.mjs';
const pkg=JSON.parse(await fs.readFile(path.join(root,'node_modules/hyperframes/package.json'),'utf8'));if(pkg.version!=='0.8.77')throw Error('Unexpected Editor version.');
console.log(`Pinned Editor ${pkg.version} installed.`);
verifyStudioNeutral(path.join(root,'node_modules/hyperframes'));
verifyStudioAssetCache(path.join(root,'node_modules/hyperframes'));
console.log('Neutral editor chrome verified independently of output brand.');
verifyStudioTemplateEntry(path.join(root,'node_modules/hyperframes'));
console.log('Native template-entry export repair verified.');
verifyStudioMediaReadiness(path.join(root,'node_modules/hyperframes'));
console.log('Native failed-media export guard verified.');
verifyStudioExport(path.join(root,'node_modules/hyperframes'));
console.log('Native editor export finishing bridge verified.');

if (studioHome(root)!==root || await fs.access(path.join(root,'CANDIDATE.md')).then(()=>true,()=>false)) {
 for (const skill of ['director','editor','editor-core','editor-cli','editor-animation','editor-keyframes','editor-creative','editor-studio','editor-audio','media-use','general-video']) {
  await fs.access(path.join(resolveWorkspace(root).skills,skill,'SKILL.md')).catch(()=>{throw Error(`Bundled authoring skill ${skill} is missing; restore the complete matched ZIP.`)});
 }
 const workspaceForSkills=resolveWorkspace(root);
 await fs.access(path.join(workspaceForSkills.skills,'director/references/continuous-improvement.md')).catch(()=>{throw Error('Continuous-improvement workflow reference is missing; restore the complete matched ZIP.')});
 const runtimePackage=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
 if(runtimePackage.scripts?.improve!=='node scripts/improvement-loop.mjs')throw Error('The continuous-improvement command is missing from runtime/package.json.');
 const studioPackage=JSON.parse(await fs.readFile(path.join(workspaceForSkills.home,'package.json'),'utf8'));
 if(studioPackage.scripts?.improve!=='node runtime/scripts/improvement-loop.mjs')throw Error('The continuous-improvement command is missing from Studio/package.json.');
 console.log('Matched Director and native authoring skills are present.');
}

for(const name of ['visual-plan.mjs','production-readiness.mjs','encoded-qc.mjs','caption-qc.mjs','review-workbench.mjs','review-workbench-ui.mjs'])await fs.access(path.join(root,'scripts',name)).catch(()=>{throw Error(`Production/review module ${name} is missing; restore the complete matched installation.`)});
await fs.access(path.join(root,'PRODUCTION-CHECKS.md'));
console.log('Visual production planning, readiness, candidate/caption QC and local review workspace are present.');

const animation=await verifyAnimationPayload(root);
console.log(`Pinned animation source verified (${animation.files} files); each authored animation workspace uses its own pinned install.`);

const workspace=resolveWorkspace(root);
if(workspace.defaultBrand){
 const selected=workspace.defaultBrand;const [id,version]=typeof selected==='string'?selected.split('/'):[selected.id,selected.version];
 if(!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(id)||!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(version))throw Error('Invalid configured brand identity');
 const pack=await readBrandPack(path.join(workspace.brands,id,version));
 if(pack.manifest.id!==id||pack.manifest.version!==version)throw Error('Configured brand identity mismatch');
 console.log(`External brand pack verified: ${id}/${version} (${pack.manifestSha256}).`);
}
