import {withRunReport} from './tool-run.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {root} from './common.mjs';
import {resolveWorkspace} from './workspace.mjs';
import {pinProjectBrand,validateProjectFormat} from './brand.mjs';

export const projectLauncher=`import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const native=path.dirname(fileURLToPath(import.meta.url));
let project=path.dirname(native);
try {
 while(true){try{await fs.access(path.join(project,'PROJECT.json'));break;}catch(error){if(error.code!=='ENOENT')throw error;const parent=path.dirname(project);if(parent===project)throw Error('PROJECT.json not found above native edit.');project=parent;}}
 const manifest=JSON.parse(await fs.readFile(path.join(project,'PROJECT.json'),'utf8'));
 const pointer=process.env.JSTUDIO_RUNTIME||manifest.studioRuntime;
 if(!pointer)throw Error('Set JSTUDIO_RUNTIME to the installed Studio runtime folder.');
 const runtime=path.resolve(project,pointer);
 const adapter=path.join(runtime,'scripts/project.mjs');
 await fs.access(adapter).catch(()=>{throw Error('Studio runtime not found. Set JSTUDIO_RUNTIME or update PROJECT.json studioRuntime after moving the installation.');});
 process.chdir(native);
 await import(pathToFileURL(adapter).href);
} catch(error){console.error(error.message);process.exitCode=1;}
`;

// Reusable for explicit migrations; callers preserve originals before rewriting.
export async function writeProjectLauncher(project,runtime) {
 const file=path.join(project,'PROJECT.json');
 const manifest=JSON.parse(await fs.readFile(file,'utf8'));
 if(!manifest.nativeProject)throw Error('Project has no native edit.');
 const native=path.resolve(project,manifest.nativeProject);
 const pkgFile=path.join(native,'package.json');
 let pkg={name:manifest.name,private:true,type:'module'};
 try {pkg=JSON.parse(await fs.readFile(pkgFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 pkg.scripts={...pkg.scripts,dev:'node studio-project.mjs preview',check:'node studio-project.mjs check',render:'node studio-project.mjs render'};
 manifest.studioRuntime=path.relative(project,runtime).split(path.sep).join('/');
 await fs.writeFile(path.join(native,'studio-project.mjs'),projectLauncher);
 await fs.writeFile(pkgFile,JSON.stringify(pkg,null,2)+'\n');
 await fs.writeFile(file,JSON.stringify(manifest,null,2)+'\n');
}

function projectAgent(name){return `# Video project: ${name}

This folder is the canonical home for all work on this video. Keep the brief, storyboard, mockups, source media, Animator source and renders, review versions, decisions, interaction history and final delivery here.

This is a single video in the Production workstream, not the JStudio Builder or product source tree. For a request to change Studio itself, follow the Studio-level routing instructions in the configured Studio home’s \`AGENTS.md\`. Keep product code, package builds and product-wide QA out of this folder.

## Project map

- \`PROJECT.json\`, \`BRIEF.md\`, \`STORYBOARD.md\`, and \`INTERACTION-LOG.md\` are project records.
- Animation planning, when applicable: \`ANIMATION-TREATMENT.md\`, \`ANIMATION-SEQUENCE.md\`, \`ANIMATION-REVIEW.md\`. These records guide free-form authoring and do not approve a scene.\n- \`mockups/\`, \`media/\`, \`animation/\`, \`reviews/\`, \`delivery/\`, and \`evidence/\` hold video-specific material.
- \`editor/\` is the native Editor project. Keep its editable HTML, compositions and linked assets intact; open it with \`npm start -- ${name}\` from the Studio runtime.
- Keep Animator previews and source under \`animation/\`, outside the native \`editor/\` project. Stage versioned clips with guarded review-only imports until the complete candidate is approved; keep them in \`editor/assets/animations/\`.

## Output brand

The selected pack from Studio Brand Packs is pinned in \`PROJECT.json.brand\` and snapshotted under \`brand/\`. Read that snapshot’s \`brand.json\` and inventoried rules. Editor \`assets/brand/\` and Animator \`app/public/brand/\` are generated copies of this snapshot, not independent brand sources. Never use runtime brand folders or silently switch an existing project when the workspace default changes. The editor itself is brand-neutral.

## Record and preserve

Append each video-specific user request, material question and answer, decision, revision request and approval to \`INTERACTION-LOG.md\`. Quote material instructions and approvals exactly; link each review or approval to the exact artifact path and hash when available. Do not invent approvals or copy unrelated chat into this project.

Keep prior review versions and last approved exports. Do not overwrite approved media during revision. Use relative references between project files where the native tools support them. Do not move project material into sibling project folders or shared scratch areas.

Follow the Studio-level \`AGENTS.md\` and \`AI-AUTHORING.md\` at the configured Studio home. The root of this folder is not itself an Editor composition directory; the native editor project is \`editor/\`.
`}

function nativeAgent(name){return `# Native Editor project: ${name}

This folder contains the editable native Editor project for the video whose project root is its parent folder.

Read \`../AGENTS.md\`, the configured Studio home’s \`AGENTS.md\` and \`AI-AUTHORING.md\`. Keep native compositions and their required assets here. The sibling \`../animation/\` directory holds Animator source and previews; do not copy its HTML previews into this project's composition tree. Store project-wide briefs, storyboard mockups, media originals, interactions, review records, and final deliveries in the parent video project folder.
`}

const templates = {
 'BRIEF.md': `# Video brief\n\n- Topic:\n- Audience:\n- Desired outcome:\n- Target duration and format:\n- Intended platform and viewing context:\n- Minimum displayed player width for each output (px); record assumptions if unspecified:\n- Source material and provenance:\n- Required footage or media:\n- Voice, captions, and audio:\n- Audio strategy: narration/music/sound effects/silence, source, permission, availability, fallback and unresolved constraints:\n- Open questions:\n- Confirmed scope and date:\n`,
 'STORYBOARD.md': `# Storyboard\n\nStatus: Draft. Record the exact revision and approval in INTERACTION-LOG.md.\n\n| Scene / time | Viewer takeaway | Narration / on-screen copy | Medium and source | Visual action | Review notes |\n|---|---|---|---|---|---|\n`,
 'INTERACTION-LOG.md': `# Video project interaction log\n\nAppend entries in chronological order. This is the durable record for this video's requests and production decisions, not a log for unrelated conversations. Preserve material user instructions and approval wording verbatim; summarize routine assistant work. Record timestamps only when known. Link artifact paths and SHA-256 hashes when available. Never infer approval from silence or a technical pass.\n\n## Entries\n\n`,
 'README.md': `# Video project\n\nThis folder owns all content and production history for this video. Read AGENTS.md first. The editable native Editor project is in \`editor/\`; Animator source is in \`animation/\`.\n\nOpen the editor from the Studio runtime with:\n\n\`\`\`sh\nnpm start -- PROJECT_NAME\n\`\`\`\n\nReplace PROJECT_NAME with this folder's name. You can also run npm run dev, npm run check, or npm run render inside editor. PROJECT.json studioRuntime is a relative pointer to the installed runtime; if that installation moves independently, set JSTUDIO_RUNTIME to its runtime folder or update the pointer. Keep video-specific prompts, questions and answers, decisions, revision requests, approvals, media, review cuts and final delivery here.\n`
};

export async function create(name, directory=root, {projectsDirectory=resolveWorkspace(directory).projects,brand,width=1920,height=1080,duration=8,initiator=null,requestFile=null}={}){
 if(!name||!/^[a-z0-9][a-z0-9-]{0,63}$/.test(name)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(name))throw Error('Use a project name such as course-authoring, with lowercase letters and numbers.');
 const format=validateProjectFormat({width,height,duration});
 if(initiator!==null&&(typeof initiator!=='string'||!initiator.trim()||initiator.length>500))throw Error('Initiator must be a non-empty name or host label of at most 500 characters');
 let request=null;
 if(requestFile){const bytes=await fs.readFile(requestFile);if(bytes.length>65536)throw Error('Creation request exceeds 64 KiB');request=bytes.toString('utf8');if(!request.trim())throw Error('Creation request is empty');}
 const creationContext={initiator:initiator?.trim()??null,request,requestSha256:request===null?null:crypto.createHash('sha256').update(request).digest('hex'),source:request===null?'not-supplied':'caller-supplied-request-file',identityVerified:false,limitations:'Caller-supplied provenance, not authenticated identity. Missing request or initiator is unknown, never inferred.'};
 const projects=projectsDirectory;
 await fs.mkdir(projects,{recursive:true});
 if((await fs.lstat(projects)).isSymbolicLink())throw Error('Projects must be a real directory, not a symbolic link.');
 const dir=path.join(projects,name);
 await fs.mkdir(dir); // exclusive: never merge into or overwrite prior work
 try {
  const native=path.join(dir,'editor');
  await fs.mkdir(native);
  const folders=['mockups','media/source','media/captures','media/graphics','media/audio','animation','reviews/storyboard','reviews/animation','reviews/final','delivery','evidence'];
  for(const folder of folders)await fs.mkdir(path.join(dir,folder),{recursive:true});
  await fs.writeFile(path.join(dir,'AGENTS.md'),projectAgent(name));
  await fs.writeFile(path.join(native,'AGENTS.md'),nativeAgent(name));
  const runtimePointer=path.relative(dir,directory).split(path.sep).join('/');
  await fs.writeFile(path.join(native,'studio-project.mjs'),projectLauncher);
  await fs.writeFile(path.join(native,'package.json'),JSON.stringify({name,private:true,type:'module',scripts:{dev:'node studio-project.mjs preview',check:'node studio-project.mjs check',render:'node studio-project.mjs render'}},null,2)+'\n');
  await fs.writeFile(path.join(dir,'PROJECT.json'),JSON.stringify({schemaVersion:1,name,createdAt:new Date().toISOString(),storageModel:'jstudio-video-project-v1',creationContext,nativeProject:'editor',animationProject:'animation',interactionLog:'INTERACTION-LOG.md',studioRuntime:runtimePointer,format,workflow:{version:1,ledger:'REVIEW.json',exchange:'EXCHANGE.json'}},null,2)+'\n');
  await pinProjectBrand(dir,directory,{brand,newProject:true,...format});
  await fs.copyFile(path.join(directory,'node_modules/gsap/dist/gsap.min.js'),path.join(native,'assets/gsap.min.js'));
  for(const [file,content] of Object.entries(templates))await fs.writeFile(path.join(dir,file),content.replaceAll('PROJECT_NAME',name));
  await fs.appendFile(path.join(dir,'INTERACTION-LOG.md'),'## Creation provenance\n\nInitiator: '+JSON.stringify(creationContext.initiator)+'\nRequest source: '+creationContext.source+'\nIdentity verified: false\n\n'+(request===null?'Initiating request unavailable; record it before creative work.':request.split('\n').map(line=>'> '+line).join('\n'))+'\n\n');
  // These are authored once in Director and assembled by packaging, never a scene schema.
  const planning=path.join(directory,'project-templates');
  try {
   const entries=await fs.readdir(planning);
   for(const name of ['ANIMATION-TREATMENT.md','ANIMATION-SEQUENCE.md','ANIMATION-REVIEW.md']) {
    if(!entries.includes(name))throw Error('Incomplete animation planning templates: '+name);
    await fs.copyFile(path.join(planning,name),path.join(dir,name));
   }
  } catch(error) { if(error.code!=='ENOENT')throw error; }

 } catch(error) { await fs.rm(dir,{recursive:true,force:true}); throw error; }
 console.log(`Created video project at ${dir}. Open native Studio with: npm start -- ${name}`);return dir;
}
if(process.argv[1]?.endsWith('new-project.mjs'))try{
 const args=process.argv.slice(2),name=args.shift(),options={};
 while(args.length){const key=args.shift(),value=args.shift();if(!['--brand','--width','--height','--duration','--initiator','--request-file'].includes(key)||value===undefined||Object.hasOwn(options,key.slice(2)))throw Error('Usage: npm run new -- project-name [--brand id/version] [--width 1920 --height 1080 --duration 30] [--initiator host-or-person --request-file brief.txt]');options[key==='--request-file'?'requestFile':key.slice(2)]=['--brand','--initiator','--request-file'].includes(key)?value:Number(value);}
 const created=await create(name,root,options);
 await withRunReport({directory:created,stage:'new-project',details:{creationContext:JSON.parse(await fs.readFile(path.join(created,'PROJECT.json'),'utf8')).creationContext,route:'new-project',arguments:process.argv.slice(2),scope:'Successful creation receipt; creation failures before a project exists are reported to stderr.'}},async()=>({project:created}));
}catch(e){console.error(e.message);process.exitCode=1;}
