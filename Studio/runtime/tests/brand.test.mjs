import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';
import {readBrandPack,pinProjectBrand,materializeAnimationBrand,brandCSS,verifyProjectBrandCopies} from '../scripts/brand.mjs';
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
async function fixture(t){const home=await fs.mkdtemp(path.join(os.tmpdir(),'studio-brand-'));t.after(()=>fs.rm(home,{recursive:true,force:true}));const runtime=path.join(home,'runtime'),pack=path.join(home,'brands/example/1.0.0'),project=path.join(home,'projects/example');await fs.mkdir(runtime,{recursive:true});await fs.mkdir(pack,{recursive:true});await fs.mkdir(path.join(project,'hyperframes'),{recursive:true});await fs.writeFile(path.join(project,'PROJECT.json'),'{}');await fs.writeFile(path.join(home,'STUDIO.json'),JSON.stringify({brands:'brands',defaultBrand:{id:'example',version:'1.0.0'}}));const logo='<svg/>';await fs.writeFile(path.join(pack,'logo.svg'),logo);const manifest={schemaVersion:1,id:'example',version:'1.0.0',tokens:{background:'#FFFFFF',foreground:'#111111',primary:'#112233',secondary:'#445566',accent:'#778899',fontFamily:'Georgia'},assets:{logo:'logo.svg'},fonts:[],files:{'logo.svg':digest(logo)}};await fs.writeFile(path.join(pack,'brand.json'),JSON.stringify(manifest));return {home,runtime,pack,project,manifest};}
test('brand pin is independent of later pack changes and shared by both engines',async t=>{const f=await fixture(t);const identity=await pinProjectBrand(f.project,f.runtime,{newProject:true});assert.equal(identity.id,'example');await fs.writeFile(path.join(f.pack,'logo.svg'),'changed');assert.equal(await fs.readFile(path.join(f.project,'brand/logo.svg'),'utf8'),'<svg/>');assert.deepEqual(await materializeAnimationBrand(f.project,path.join(f.project,'animation')),identity);assert.equal(await fs.readFile(path.join(f.project,'animation/app/public/brand/logo.svg'),'utf8'),'<svg/>');assert.match(await fs.readFile(path.join(f.project,'hyperframes/styles/brand.css'),'utf8'),/Georgia/);await assert.rejects(readBrandPack(f.pack),/hash mismatch/);});
test('brand rejects traversal and symlink assets',async t=>{const f=await fixture(t);f.manifest.files={'../escape':digest('x')};await fs.writeFile(path.join(f.pack,'brand.json'),JSON.stringify(f.manifest));await assert.rejects(readBrandPack(f.pack),/Unsafe/);f.manifest.files={'logo.svg':digest('<svg/>')};await fs.writeFile(path.join(f.pack,'brand.json'),JSON.stringify(f.manifest));await fs.rm(path.join(f.pack,'logo.svg'));await fs.symlink(path.join(f.home,'STUDIO.json'),path.join(f.pack,'logo.svg'));await assert.rejects(readBrandPack(f.pack),/symlinks/);});
test('pin cannot overwrite a previous snapshot and tampering prevents animation',async t=>{const f=await fixture(t);await pinProjectBrand(f.project,f.runtime,{newProject:true});await assert.rejects(pinProjectBrand(f.project,f.runtime,{newProject:true}));await fs.writeFile(path.join(f.project,'brand/logo.svg'),'changed');await assert.rejects(materializeAnimationBrand(f.project,path.join(f.project,'animation')),/hash mismatch/);});
test('brand CSS uses manifest colors and font only',async t=>{const f=await fixture(t);assert.match(brandCSS(f.manifest),/--brand-primary:#112233/);assert.doesNotMatch(brandCSS(f.manifest),/Inter|JStudio/);});
test('existing projects cannot be implicitly rebranded',async t=>{const f=await fixture(t);await fs.writeFile(path.join(f.project,'hyperframes/index.html'),'existing film');await assert.rejects(pinProjectBrand(f.project,f.runtime),/creation-only/);assert.equal(await fs.readFile(path.join(f.project,'hyperframes/index.html'),'utf8'),'existing film');});
test('extra token values cannot inject CSS',async t=>{const f=await fixture(t);f.manifest.tokens.evil='red;}body{display:none';assert.doesNotMatch(brandCSS(f.manifest),/evil|display/);});
test('bundled local fonts bind inline to a unique native family without remote substitution',async t=>{const f=await fixture(t);for(const weight of [400,700]){const file=`font-${weight}.ttf`,bytes=Buffer.from(`fixture font ${weight}`);await fs.writeFile(path.join(f.pack,file),bytes);f.manifest.files[file]=digest(bytes);f.manifest.fonts.push({path:file,weight});}await fs.writeFile(path.join(f.pack,'brand.json'),JSON.stringify(f.manifest));await pinProjectBrand(f.project,f.runtime,{newProject:true});const html=await fs.readFile(path.join(f.project,'hyperframes/index.html'),'utf8');assert.match(html,/<style data-studio-brand>@font-face/);assert.match(html,/font-family:'StudioBrand-example-1.0.0'/);assert.match(html,/url\('assets\/brand\/font-700.ttf'\)/);assert.doesNotMatch(html,/googleapis|fonts.gstatic/);await materializeAnimationBrand(f.project,path.join(f.project,'animation'));const snapshot=await readBrandPack(path.join(f.project,'animation/app/public/brand'));assert.deepEqual(snapshot.manifest.fonts,f.manifest.fonts);});

test('new projects require an external selection even if legacy runtime assets exist',async t=>{
 const f=await fixture(t);await fs.writeFile(path.join(f.home,'STUDIO.json'),JSON.stringify({brands:'brands'}));
 await fs.mkdir(path.join(f.runtime,'brand'),{recursive:true});await fs.writeFile(path.join(f.runtime,'brand/manifest.json'),'{}');
 await assert.rejects(pinProjectBrand(f.project,f.runtime,{newProject:true}),/No output brand selected/);
 await assert.rejects(pinProjectBrand(f.project,f.runtime,{brand:'missing/1.0.0',newProject:true}),/legacy runtime assets are never a fallback/);
 await assert.rejects(fs.access(path.join(f.project,'brand')),{code:'ENOENT'});
});
test('explicit brand overrides the configured default without copying stale starter assets',async t=>{
 const f=await fixture(t);await fs.writeFile(path.join(f.home,'STUDIO.json'),JSON.stringify({brands:'brands',defaultBrand:{id:'missing',version:'1.0.0'}}));
 const identity=await pinProjectBrand(f.project,f.runtime,{brand:'example/1.0.0',newProject:true});assert.equal(identity.id,'example');
 const native=await fs.readFile(path.join(f.project,'hyperframes/index.html'),'utf8');assert.doesNotMatch(native,/JStudio|brand-current/);
});

test('managed engine brand copies reject logo drift without changing canonical snapshot',async t=>{
 const f=await fixture(t);await pinProjectBrand(f.project,f.runtime,{newProject:true});
 await materializeAnimationBrand(f.project,path.join(f.project,'animation'));
 assert.equal((await verifyProjectBrandCopies(f.project)).verified,true);
 assert.equal((await verifyProjectBrandCopies(f.project,{engine:'animation'})).verified,true);
 await fs.writeFile(path.join(f.project,'hyperframes/assets/brand/logo.svg'),'wrong logo');
 await assert.rejects(verifyProjectBrandCopies(f.project),/integrity failed.*hash mismatch/);
 assert.equal((await verifyProjectBrandCopies(f.project,{engine:'animation'})).verified,true);
 await fs.writeFile(path.join(f.project,'animation/app/public/brand/logo.svg'),'wrong logo');
 await assert.rejects(verifyProjectBrandCopies(f.project,{engine:'animation'}),/integrity failed.*hash mismatch/);
 assert.equal(await fs.readFile(path.join(f.project,'brand/logo.svg'),'utf8'),'<svg/>');
});
test('managed font and canonical snapshot drift fail; unpinned legacy projects remain supported',async t=>{
 const f=await fixture(t);assert.equal(await verifyProjectBrandCopies(f.project),null);
 for(const weight of [400,700]){const file=`font-${weight}.ttf`,bytes=Buffer.from(`font ${weight}`);await fs.writeFile(path.join(f.pack,file),bytes);f.manifest.files[file]=digest(bytes);f.manifest.fonts.push({path:file,weight});}
 await fs.writeFile(path.join(f.pack,'brand.json'),JSON.stringify(f.manifest));await pinProjectBrand(f.project,f.runtime,{newProject:true});
 await fs.writeFile(path.join(f.project,'hyperframes/assets/brand/font-700.ttf'),'wrong font');await assert.rejects(verifyProjectBrandCopies(f.project),/font-700.ttf/);
 await fs.writeFile(path.join(f.project,'brand/logo.svg'),'wrong source');await assert.rejects(verifyProjectBrandCopies(f.project),/logo.svg/);
});
