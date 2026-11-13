import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {init,register,approve,status,importShot,probe,generateShotDescriptor,beginAnimationRender,finishAnimationRender,verifyRenderReceipt,animationSourceInventory} from './animation-handoff.mjs';
let suite,media;
const ffprobe=process.env.FFPROBE_PATH||'ffprobe';
before(()=>{
 suite=fs.mkdtempSync(path.join(os.tmpdir(),'animation handoff tests '));media=path.join(suite,'fixture.mp4');
 execFileSync(process.env.FFMPEG_PATH||'ffmpeg',['-v','error','-f','lavfi','-i','color=c=blue:s=128x72:r=24:d=0.5','-c:v','libx264','-pix_fmt','yuv420p',media],{timeout:30000});
});
after(()=>fs.rmSync(suite,{recursive:true,force:true}));
function setup(purpose='production') {
 const root=fs.mkdtempSync(path.join(suite,'case ')),ledger=path.join(root,'review.json');
 init(ledger,purpose);fs.writeFileSync(path.join(root,'board.md'),'approved test storyboard');
 fs.writeFileSync(path.join(root,'scene.ts'),'scene version 1');fs.copyFileSync(media,path.join(root,'shot.mp4'));
 const board=register(ledger,'storyboard','main',{files:['board.md']});
 return {root,ledger,board};
}
function accept(f,a) {approve(f.ledger,a.kind,a.id,{reviewer:'Synthetic fixture reviewer',statement:'Automated test assertion, not user approval',fingerprint:a.fingerprint});}
function shot(f,id='demo') {return register(f.ledger,'shot',id,{files:['scene.ts'],media:'shot.mp4',engineRevision:'fixture',renderSettings:{fps:24},provenance:'Test only'},{ffprobe});}
function native(f,marked=false) {const p=path.join(f.root,'native');fs.mkdirSync(p);fs.writeFileSync(path.join(p,'index.html'),'<p>User edit stays here</p>');if(marked)fs.writeFileSync(path.join(p,'.synthetic-test'),'test');return p;}
test('measures actual frame rate, dimensions and duration',()=>{const m=probe(media,ffprobe);assert.equal(m.width,128);assert.equal(m.fps,'24/1');assert.equal(m.audio,false);assert.equal(m.duration,0.5);});
test('cannot overwrite an existing ledger',()=>{const f=setup();assert.throws(()=>init(f.ledger),/already exists/);assert.equal(status(f.ledger).artifacts.length,1);});
test('shot registration does not require an intermediate storyboard approval',()=>{const f=setup();assert.equal(shot(f).revision,1);assert.equal(status(f.ledger).artifacts[0].approved,false);});
test('approval binds to exact fingerprint and refuses changed files',()=>{const f=setup();assert.throws(()=>approve(f.ledger,'storyboard','main',{reviewer:'Test',statement:'yes',fingerprint:'wrong'}),/fingerprint/);fs.appendFileSync(path.join(f.root,'board.md'),' changed');assert.throws(()=>accept(f,f.board),/changed/);});
test('unapproved shots cannot import; approved import preserves HTML and rejects overwrite',()=>{const f=setup();accept(f,f.board);const a=shot(f),p=native(f);assert.throws(()=>importShot(f.ledger,'demo',p),/unapproved/);accept(f,a);const r=importShot(f.ledger,'demo',p);assert.equal(fs.readFileSync(path.join(p,'index.html'),'utf8'),'<p>User edit stays here</p>');assert.deepEqual(fs.readFileSync(path.join(p,r.relativeMediaPath)),fs.readFileSync(media));assert.throws(()=>importShot(f.ledger,'demo',p),/exist/i);});
test('source drift invalidates animation but leaves exact rendered cut approval intact',()=>{const f=setup();accept(f,f.board);const a=shot(f);accept(f,a);fs.writeFileSync(path.join(f.root,'index.html'),'native source');const cut=register(f.ledger,'cut','main',{files:['index.html'],media:'shot.mp4'},{ffprobe});accept(f,cut);fs.appendFileSync(path.join(f.root,'scene.ts'),' new');const s=status(f.ledger);assert.equal(s.artifacts.find(a=>a.kind==='shot').current,false);assert.equal(s.artifacts.find(a=>a.kind==='cut').current,true);});
test('new shot revisions preserve history and exact rendered cut approval',()=>{const f=setup();accept(f,f.board);const a=shot(f);accept(f,a);const cut=register(f.ledger,'cut','main',{files:['scene.ts'],media:'shot.mp4'},{ffprobe});accept(f,cut);fs.appendFileSync(path.join(f.root,'scene.ts'),' changed');const revision=shot(f);assert.equal(revision.revision,2);assert.equal(revision.approval,null);assert.equal(status(f.ledger).artifacts.find(a=>a.kind==='cut').current,true);assert.equal(JSON.parse(fs.readFileSync(f.ledger)).artifacts.filter(a=>a.kind==='shot').length,2);});
test('storyboard administration does not invalidate unchanged rendered shots',()=>{const f=setup();accept(f,f.board);const a=shot(f);accept(f,a);fs.appendFileSync(path.join(f.root,'board.md'),' revised');const b=register(f.ledger,'storyboard','main',{files:['board.md']});accept(f,b);assert.equal(status(f.ledger).artifacts.find(a=>a.kind==='shot').current,true);});
test('traversal and symlink dependencies are rejected',()=>{const f=setup();assert.throws(()=>register(f.ledger,'storyboard','main',{files:['../fixture.mp4']}),/traversal/);fs.symlinkSync(media,path.join(f.root,'linked.mp4'));assert.throws(()=>register(f.ledger,'storyboard','main',{files:['linked.mp4']}),/Symlink/);});
test('symlinked import destination cannot redirect writes',()=>{const f=setup();accept(f,f.board);const a=shot(f);accept(f,a);const p=native(f);fs.symlinkSync(suite,path.join(p,'assets'));assert.throws(()=>importShot(f.ledger,'demo',p),/Symlink/);});
test('synthetic approval imports are limited to marked test projects',()=>{const f=setup('synthetic-test');accept(f,f.board);const a=shot(f);accept(f,a);const p=native(f);assert.throws(()=>importShot(f.ledger,'demo',p),/marked test/);fs.writeFileSync(path.join(p,'.synthetic-test'),'test');assert.equal(importShot(f.ledger,'demo',p).purpose,'synthetic-test');});
test('bad media fails registration without writing a revision',()=>{const f=setup();accept(f,f.board);fs.writeFileSync(path.join(f.root,'bad.mp4'),'not media');assert.throws(()=>register(f.ledger,'shot','bad',{files:['scene.ts'],media:'bad.mp4',engineRevision:'fixture',renderSettings:{fps:24}},{ffprobe}));assert.equal(status(f.ledger).artifacts.length,1);});

test('concurrent edit between ledger load and mutation is preserved',t=>{
 const f=setup();const read=fs.readFileSync;let changed=false;
 const injected=JSON.parse(read(f.ledger,'utf8'));injected.concurrentNote='must survive';
 t.mock.method(fs,'readFileSync',function(filename,...args){
  const result=read.call(fs,filename,...args);
  if(fs.realpathSync(filename)===fs.realpathSync(f.ledger)&&!changed){changed=true;fs.writeFileSync(f.ledger,JSON.stringify(injected));}
  return result;
 });
 assert.throws(()=>accept(f,f.board),/changed concurrently/);
 assert.equal(JSON.parse(read(f.ledger,'utf8')).concurrentNote,'must survive');
 assert.equal(JSON.parse(read(f.ledger,'utf8')).artifacts[0].approval,null);
});
test('Windows-style relative media paths are normalized for immutable import',()=>{
 const f=setup();accept(f,f.board);fs.mkdirSync(path.join(f.root,'renders'));fs.copyFileSync(media,path.join(f.root,'renders','shot.mp4'));
 const a=register(f.ledger,'shot','demo',{files:['scene.ts'],media:'renders\\shot.mp4',engineRevision:'fixture',renderSettings:{fps:24}},{ffprobe});
 assert.equal(a.media,'renders/shot.mp4');accept(f,a);
 const p=native(f),r=importShot(f.ledger,'demo',p);
 assert.deepEqual(fs.readFileSync(path.join(p,r.relativeMediaPath)),fs.readFileSync(media));
});

test('cut source snapshot preserves included references without cascading approval invalidation',()=>{
 const f=setup();accept(f,f.board);const a=shot(f);accept(f,a);
 const cut=register(f.ledger,'cut','main',{files:['shot.mp4'],media:'shot.mp4',includedShots:[{id:a.id,revision:a.revision,fingerprint:a.fingerprint}]},{ffprobe});accept(f,cut);
 const alt=shot(f,'unused');accept(f,alt);
 assert.equal(status(f.ledger).artifacts.find(a=>a.kind==='cut').current,true);
 const next=shot(f);accept(f,next);
 assert.equal(status(f.ledger).artifacts.find(a=>a.kind==='cut').current,true);
});
test('explicit cut rejects missing, duplicate or inexact shot identities',()=>{
 const f=setup();accept(f,f.board);const a=shot(f);accept(f,a);
 const ref={id:a.id,revision:a.revision,fingerprint:a.fingerprint};
 for(const refs of [[{...ref,revision:2}],[ref,ref],[{...ref,id:'absent'}]])assert.throws(()=>register(f.ledger,'cut','main',{files:['shot.mp4'],media:'shot.mp4',includedShots:refs},{ffprobe}),/Included|Duplicate/);
 const cut=register(f.ledger,'cut','main',{files:['shot.mp4'],media:'shot.mp4',includedShots:[]},{ffprobe});assert.equal(cut.dependencies.filter(d=>d.kind==='shot').length,0);
});


test('unsupported dependencies field cannot silently omit brand or engine files',()=>{
 const f=setup();accept(f,f.board);const before=fs.readFileSync(f.ledger,'utf8');
 assert.throws(()=>register(f.ledger,'shot','demo',{files:['scene.ts'],dependencies:['brand/manifest.json','animation/app/src/engine.ts'],media:'shot.mp4',engineRevision:'fixture',renderSettings:{fps:24}},{ffprobe}),/Unsupported descriptor field "dependencies".*files/);
 assert.equal(fs.readFileSync(f.ledger,'utf8'),before);
 for(const bad of [{file:['scene.ts']},{files:['scene.ts'],notes:'silently ignored'},{files:['scene.ts'],includedShots:[]}])assert.throws(()=>register(f.ledger,'storyboard','main',bad),/Unsupported descriptor field/);
});
function inventoryFixture() {
 const f=setup('synthetic-test');accept(f,f.board);
 fs.writeFileSync(path.join(f.root,'PROJECT.json'),JSON.stringify({animationProject:'animation',brand:{id:'fixture',version:'1'}}));
 for(const name of ['animation/app/src/engine.ts','animation/app/projects/scene.ts','animation/app/public/brand/font.woff2','animation/app/package-lock.json','animation/render.mjs','brand/brand.json','brand/fonts/font.woff2','animation/app/node_modules/ignored.js','animation/app/.cache/ignored','animation/outputs/old.mp4']) {
  fs.mkdirSync(path.dirname(path.join(f.root,name)),{recursive:true});fs.writeFileSync(path.join(f.root,name),name);
 }
 attest(f);return f;
}
function attest(f){
 fs.rmSync(path.join(f.root,"shot.mp4"),{force:true});fs.rmSync(path.join(f.root,"shot.mp4.render.json"),{force:true});
 const started=beginAnimationRender(f.root,"shot.mp4",["video","--project","projects/test.json"]);
 fs.copyFileSync(media,path.join(f.root,"shot.mp4"));finishAnimationRender(f.root,started);
}
const inventoryOptions={media:'shot.mp4',engineRevision:'test-engine-1',renderSettings:{fps:24,width:128,height:72}};
test('generated shot inventories track engine, configuration and both font copies; changes invalidate approval',()=>{
 const f=inventoryFixture(),descriptor=generateShotDescriptor(f.root,inventoryOptions);
 for(const required of ['PROJECT.json','shot.mp4','animation/app/src/engine.ts','animation/app/projects/scene.ts','animation/app/public/brand/font.woff2','animation/app/package-lock.json','animation/render.mjs','brand/brand.json','brand/fonts/font.woff2'])assert.ok(descriptor.files.includes(required),required);
 assert.equal(descriptor.files.some(p=>/node_modules|\.cache|outputs/.test(p)),false);
 assert.deepEqual(generateShotDescriptor(f.root,inventoryOptions),descriptor);
 for(const changed of ['animation/app/src/engine.ts','animation/app/public/brand/font.woff2','brand/fonts/font.woff2']) {
  attest(f);const a=register(f.ledger,'shot','demo',generateShotDescriptor(f.root,inventoryOptions),{ffprobe});accept(f,a);
  assert.equal(status(f.ledger).artifacts.find(a=>a.kind==='shot').current,true);
  fs.appendFileSync(path.join(f.root,changed),' changed');
  const state=status(f.ledger).artifacts.find(a=>a.kind==='shot');assert.equal(state.current,false);assert.ok(state.issues.includes('Changed file: '+changed));
 }
});
test('generator rejects source symlinks, traversal, missing media and misspelled options',()=>{
 const f=inventoryFixture();
 assert.throws(()=>generateShotDescriptor(f.root,{...inventoryOptions,dependencies:['scene.ts']}),/Unsupported descriptor option/);
 assert.throws(()=>generateShotDescriptor(f.root,{...inventoryOptions,files:['../outside']}),/traversal/);
 assert.throws(()=>generateShotDescriptor(f.root,{...inventoryOptions,media:'missing.mp4'}),/Missing regular file/);
 assert.throws(()=>generateShotDescriptor(f.root,{...inventoryOptions,provenance:42}),/field "provenance" must be a string.*number/);
 assert.throws(()=>generateShotDescriptor(f.root,{...inventoryOptions,renderSettings:[]}),/field "renderSettings" must be an object/);
 assert.throws(()=>generateShotDescriptor(f.root,{...inventoryOptions,engineRevision:undefined}),/field "engineRevision" must be a nonempty string/);
 assert.throws(()=>generateShotDescriptor(f.root,{...inventoryOptions,files:'scene.ts'}),/field "files" must be an array/);
 fs.symlinkSync(path.join(f.root,'scene.ts'),path.join(f.root,'animation/app/public/linked.ts'));
 assert.throws(()=>generateShotDescriptor(f.root,inventoryOptions),/Symlink/);
});

test('unapproved legacy shots require explicit new registration while approved history remains usable',()=>{
 const f=setup('synthetic-test');accept(f,f.board);const a=shot(f);assert.equal(a.registrationSchemaVersion,1);
 const historical=JSON.parse(fs.readFileSync(f.ledger));delete historical.artifacts.at(-1).registrationSchemaVersion;
 fs.writeFileSync(f.ledger,JSON.stringify(historical));const before=fs.readFileSync(f.ledger,'utf8');
 assert.throws(()=>accept(f,a),/Legacy unapproved shot.*Regenerate.*new revision/);assert.equal(fs.readFileSync(f.ledger,'utf8'),before);
 const next=shot(f);assert.equal(next.revision,2);accept(f,next);
 // Historical approved entries are not retroactively invalidated or rewritten.
 const approved=JSON.parse(fs.readFileSync(f.ledger));delete approved.artifacts.at(-1).registrationSchemaVersion;
 fs.writeFileSync(f.ledger,JSON.stringify(approved));assert.equal(status(f.ledger).artifacts.find(a=>a.kind==='shot').approved,true);
 const imported=importShot(f.ledger,'demo',native(f,true));assert.equal(imported.fingerprint,next.fingerprint);
 assert.equal(JSON.parse(fs.readFileSync(f.ledger)).artifacts.at(-1).registrationSchemaVersion,undefined);
});

test('render receipt rejects postrender source edits and media changes before descriptor registration',()=>{
 const f=inventoryFixture();verifyRenderReceipt(f.root,'shot.mp4');
 fs.appendFileSync(path.join(f.root,'animation/app/src/engine.ts'),' changed');
 assert.throws(()=>generateShotDescriptor(f.root,inventoryOptions),/Source changed since render/);
 attest(f);fs.appendFileSync(path.join(f.root,'shot.mp4'),' changed');
 assert.throws(()=>generateShotDescriptor(f.root,inventoryOptions),/media differs/);
});
test('render receipt rejects source membership changes and edits during rendering',()=>{
 const f=inventoryFixture();fs.writeFileSync(path.join(f.root,'animation/app/src/new.ts'),'new dependency');
 assert.throws(()=>generateShotDescriptor(f.root,inventoryOptions),/membership changed/);
 fs.rmSync(path.join(f.root,'shot.mp4'));fs.rmSync(path.join(f.root,'shot.mp4.render.json'));
 const started=beginAnimationRender(f.root,'shot.mp4',['video']);fs.copyFileSync(media,path.join(f.root,'shot.mp4'));
 fs.appendFileSync(path.join(f.root,'animation/app/src/engine.ts'),'changed during render');
 assert.throws(()=>finishAnimationRender(f.root,started),/changed during render/);
 assert.equal(fs.existsSync(path.join(f.root,'shot.mp4.render.json')),false);
});
test('managed registration cannot omit receipt dependencies or bind stale source',()=>{
 const f=inventoryFixture(),descriptor=generateShotDescriptor(f.root,inventoryOptions);
 assert.throws(()=>register(f.ledger,'shot','demo',{...descriptor,files:['shot.mp4']},{ffprobe}),/omits render dependency/);
 fs.appendFileSync(path.join(f.root,'animation/app/public/brand/font.woff2'),'changed');
 assert.throws(()=>register(f.ledger,'shot','demo',descriptor,{ffprobe}),/Source changed since render/);
});
test('missing provenance is actionable and versioned outputs cannot overwrite',()=>{
 const f=inventoryFixture();assert.throws(()=>beginAnimationRender(f.root,'shot.mp4',['video']),/already exists/);
 fs.rmSync(path.join(f.root,'shot.mp4.render.json'));
 assert.throws(()=>generateShotDescriptor(f.root,inventoryOptions),/Rerender.*workflow animation render video/);
 assert.throws(()=>beginAnimationRender(f.root,'animation/app/src/bad.mp4',['video']),/excluded output directory/);
});

test('managed old unapproved shots require rerender while approved history is preserved',()=>{
 const f=inventoryFixture(),a=register(f.ledger,'shot','demo',generateShotDescriptor(f.root,inventoryOptions),{ffprobe});
 assert.equal(a.registrationSchemaVersion,2);
 const data=JSON.parse(fs.readFileSync(f.ledger));data.artifacts.at(-1).registrationSchemaVersion=1;
 fs.writeFileSync(f.ledger,JSON.stringify(data));
 assert.throws(()=>accept(f,a),/lacks render-time provenance.*Rerender/);
 data.artifacts.at(-1).approval={reviewer:'historical reviewer',statement:'historic fixture only'};
 fs.writeFileSync(f.ledger,JSON.stringify(data));const before=fs.readFileSync(f.ledger,'utf8');
 assert.equal(status(f.ledger).artifacts.at(-1).approved,true);
 assert.equal(fs.readFileSync(f.ledger,'utf8'),before);
});

test('generated directory names inside source/public/brand remain attested inputs',()=>{
 const f=inventoryFixture();
 const files=['animation/app/public/outputs/real.png','animation/app/src/evidence/helper.ts','animation/app/src/node_modules/source.ts','brand/outputs/asset.png'];
 for(const file of files){fs.mkdirSync(path.dirname(path.join(f.root,file)),{recursive:true});fs.writeFileSync(path.join(f.root,file),'input');}
 attest(f);const inputs=animationSourceInventory(f.root).map(file=>file.path);
 for(const file of files)assert.ok(inputs.includes(file),file);
 assert.equal(inputs.includes('animation/outputs/old.mp4'),false);
 assert.equal(inputs.includes('animation/app/node_modules/ignored.js'),false);
 fs.appendFileSync(path.join(f.root,files[0]),'changed');
 assert.throws(()=>generateShotDescriptor(f.root,inventoryOptions),/Source changed since render/);
 assert.throws(()=>beginAnimationRender(f.root,'animation/app/src/outputs/new.mp4',['video']),/excluded output directory/);
});
test('descriptor-only external dependencies cannot imply render-time attestation',()=>{
 const f=inventoryFixture();
 assert.throws(()=>generateShotDescriptor(f.root,{...inventoryOptions,files:['scene.ts']}),/not inventoried at render time/);
 const descriptor=generateShotDescriptor(f.root,inventoryOptions);descriptor.files.push('scene.ts');
 assert.throws(()=>register(f.ledger,'shot','demo',descriptor,{ffprobe}),/not inventoried at render time/);
});


test('review-only staging permits unapproved current shots without granting approval',()=>{
 const f=setup(),a=shot(f),p=native(f);
 const r=importShot(f.ledger,a.id,p,{reviewOnly:true});assert.equal(r.reviewOnly,true);
 assert.equal(status(f.ledger).artifacts.find(x=>x.kind==='shot').approved,false);
 assert.equal(JSON.parse(fs.readFileSync(f.ledger)).imports[0].reviewOnly,true);
 assert.throws(()=>importShot(f.ledger,a.id,p),/unapproved/);
});
test('review-only staging rejects stale source, legacy unvalidated shots and other projects',()=>{
 const f=setup(),a=shot(f),p=native(f);
 const other=fs.mkdtempSync(path.join(suite,'other '));fs.writeFileSync(path.join(other,'index.html'),'');
 assert.throws(()=>importShot(f.ledger,a.id,other,{reviewOnly:true}),/inside its source project/);
 fs.appendFileSync(path.join(f.root,'scene.ts'),'drift');
 assert.throws(()=>importShot(f.ledger,a.id,p,{reviewOnly:true}),/stale/);
 fs.writeFileSync(path.join(f.root,'scene.ts'),'scene version 1');
 const data=JSON.parse(fs.readFileSync(f.ledger));delete data.artifacts.at(-1).registrationSchemaVersion;fs.writeFileSync(f.ledger,JSON.stringify(data));
 assert.throws(()=>importShot(f.ledger,a.id,p,{reviewOnly:true}),/Legacy unapproved/);
});
test('complete candidate accepts unapproved shots, snapshots sources, and binds changed media',()=>{
 const f=setup(),a=shot(f);fs.writeFileSync(path.join(f.root,'native.html'),'captions and audio');
 const cut=register(f.ledger,'cut','main',{files:['native.html'],media:'shot.mp4',includedShots:[{id:a.id,revision:a.revision,fingerprint:a.fingerprint}]},{ffprobe});
 assert.equal(cut.approvalBinding,'rendered-media');assert.deepEqual(cut.files.map(x=>x.path),['shot.mp4']);
 assert.ok(cut.sourceSnapshot.files.some(x=>x.path==='native.html'));assert.equal(cut.sourceSnapshot.shots[0].fingerprint,a.fingerprint);
 approve(f.ledger,'cut','main',{reviewer:'Fixture',statement:'Approved',fingerprint:cut.fingerprint});
 fs.appendFileSync(path.join(f.root,'native.html'),'later edit');fs.appendFileSync(path.join(f.root,'board.md'),'administration');
 assert.equal(status(f.ledger).artifacts.find(x=>x.kind==='cut').current,true);
 assert.equal(status(f.ledger).artifacts.find(x=>x.kind==='shot').approved,false);
 fs.appendFileSync(path.join(f.root,'shot.mp4'),'changed candidate');assert.equal(status(f.ledger).artifacts.find(x=>x.kind==='cut').current,false);
});
test('historical storyboard and cut dependencies retain their conservative semantics',()=>{
 const f=setup();accept(f,f.board);const a=shot(f);accept(f,a);
 const data=JSON.parse(fs.readFileSync(f.ledger));data.artifacts.at(-1).dependencies=[{kind:'storyboard',id:'main',revision:f.board.revision,fingerprint:f.board.fingerprint}];
 fs.writeFileSync(f.ledger,JSON.stringify(data));const original=fs.readFileSync(f.ledger,'utf8');
 fs.appendFileSync(path.join(f.root,'board.md'),'changed');assert.equal(status(f.ledger).artifacts.find(x=>x.kind==='shot').current,false);
 assert.equal(fs.readFileSync(f.ledger,'utf8'),original);
});
test('cut registration still rejects stale component sources before candidate registration',()=>{
 const f=setup(),a=shot(f);fs.appendFileSync(path.join(f.root,'scene.ts'),'changed');
 assert.throws(()=>register(f.ledger,'cut','main',{files:['scene.ts'],media:'shot.mp4',includedShots:[{id:a.id,revision:a.revision,fingerprint:a.fingerprint}]},{ffprobe}),/stale/);
});


test('new render provenance projects administrative manifest fields without weakening render inputs',()=>{
 const f=inventoryFixture();
 const receipt=JSON.parse(fs.readFileSync(path.join(f.root,'shot.mp4.render.json')));
 assert.equal(receipt.schema,2);assert.equal(receipt.inputs.find(x=>x.path==='PROJECT.json').projection,'animation-project-v1');
 const a=register(f.ledger,'shot','demo',generateShotDescriptor(f.root,inventoryOptions),{ffprobe});accept(f,a);
 assert.equal(a.files.find(x=>x.path==='PROJECT.json').projection,'animation-project-v1');
 const manifest=JSON.parse(fs.readFileSync(path.join(f.root,'PROJECT.json')));
 Object.assign(manifest,{name:'new display name',createdAt:'later',creationContext:{request:'recorded'},interactionLog:'LOG.md',workflow:{version:1,ledger:'review.json'},studioRuntime:'../new-runtime'});
 fs.writeFileSync(path.join(f.root,'PROJECT.json'),JSON.stringify(manifest,null,4));
 assert.equal(status(f.ledger).artifacts.find(x=>x.kind==='shot').current,true);
 assert.equal(verifyRenderReceipt(f.root,'shot.mp4').schema,2);
 assert.doesNotThrow(()=>generateShotDescriptor(f.root,inventoryOptions));
 for(const [key,value] of [['brand',{id:'different',version:'2'}],['animationProject','other-animation'],['nativeProject','other-native'],['format',{width:999,height:999}],['unknownRenderSetting',true]]) {
  fs.writeFileSync(path.join(f.root,'PROJECT.json'),JSON.stringify({...manifest,[key]:value}));
  assert.equal(status(f.ledger).artifacts.find(x=>x.kind==='shot').current,false,key);
  assert.throws(()=>verifyRenderReceipt(f.root,'shot.mp4'),/Source changed since render/,key);
 }
});
test('legacy schema1 receipts keep full-byte manifest verification and can still register',()=>{
 const f=inventoryFixture(),receiptFile=path.join(f.root,'shot.mp4.render.json');
 const receipt=JSON.parse(fs.readFileSync(receiptFile));receipt.schema=1;
 receipt.inputs=animationSourceInventory(f.root,{manifestProjection:false});receipt.afterInputs=receipt.inputs;
 fs.writeFileSync(receiptFile,JSON.stringify(receipt));
 assert.equal(verifyRenderReceipt(f.root,'shot.mp4').schema,1);
 const a=register(f.ledger,'shot','demo',generateShotDescriptor(f.root,inventoryOptions),{ffprobe});
 assert.equal(a.files.find(x=>x.path==='PROJECT.json').projection,undefined);accept(f,a);
 const manifest=JSON.parse(fs.readFileSync(path.join(f.root,'PROJECT.json')));manifest.name='administrative change';fs.writeFileSync(path.join(f.root,'PROJECT.json'),JSON.stringify(manifest));
 assert.throws(()=>verifyRenderReceipt(f.root,'shot.mp4'),/Source changed since render/);
 assert.equal(status(f.ledger).artifacts.find(x=>x.kind==='shot').current,false);
});
test('administrative manifest changes during new renders do not fake source drift',()=>{
 const f=inventoryFixture();fs.rmSync(path.join(f.root,'shot.mp4'));fs.rmSync(path.join(f.root,'shot.mp4.render.json'));
 const started=beginAnimationRender(f.root,'shot.mp4',['video']);
 const manifest=JSON.parse(fs.readFileSync(path.join(f.root,'PROJECT.json')));manifest.workflow={ledger:'review.json'};fs.writeFileSync(path.join(f.root,'PROJECT.json'),JSON.stringify(manifest));
 fs.copyFileSync(media,path.join(f.root,'shot.mp4'));assert.equal(finishAnimationRender(f.root,started).schema,2);
});

test('render audio must be an inventoried input and later changes stale its receipt',()=>{
 const f=inventoryFixture(),audio=path.join(f.root,'animation/app/public/narration.wav');fs.writeFileSync(audio,'fixture audio');
 const started=beginAnimationRender(f.root,'audio-shot.mp4',['video','--audio','public/narration.wav']);
 assert.ok(started.inputs.some(file=>file.path==='animation/app/public/narration.wav'));
 fs.copyFileSync(media,path.join(f.root,'audio-shot.mp4'));finishAnimationRender(f.root,started);
 verifyRenderReceipt(f.root,'audio-shot.mp4');fs.appendFileSync(audio,' changed');
 assert.throws(()=>verifyRenderReceipt(f.root,'audio-shot.mp4'),/Source changed since render.*narration/);
});
test('untracked render audio is rejected before rendering; absolute inventoried audio works',()=>{
 const f=inventoryFixture(),outside=path.join(f.root,'narration.wav');fs.writeFileSync(outside,'outside animation source');
 assert.throws(()=>beginAnimationRender(f.root,'audio-shot.mp4',['video','--audio',outside]),/not inventoried/);
 assert.throws(()=>beginAnimationRender(f.root,'audio-shot.mp4',['video','--audio','../../narration.wav']),/not inventoried/);
 assert.throws(()=>beginAnimationRender(f.root,'audio-shot.mp4',['video','--audio']),/Missing --audio/);
 assert.throws(()=>beginAnimationRender(f.root,'audio-shot.mp4',['video','--audio=a.wav']),/Use --audio FILE/);
 assert.throws(()=>beginAnimationRender(f.root,'audio-shot.mp4',['video','--audio','a','--audio','b']),/only once/);
 const audio=path.join(f.root,'animation/app/public/narration.wav');fs.writeFileSync(audio,'fixture');
 assert.ok(beginAnimationRender(f.root,'audio-shot.mp4',['video','--audio',audio]).inputs.some(file=>file.path.endsWith('/narration.wav')));
 assert.doesNotThrow(()=>beginAnimationRender(f.root,'audio-shot.mp4',['video','--audio',outside,'--noaudio']));
});
