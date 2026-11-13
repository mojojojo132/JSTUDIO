import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {init,register,approve,importShot} from './animation-handoff.mjs';
import {preflight} from './animation-exchange.mjs';
let suite,media;const ffprobe=process.env.FFPROBE_PATH||'ffprobe';
before(()=>{suite=fs.mkdtempSync(path.join(os.tmpdir(),'exchange tests '));media=path.join(suite,'fixture.mp4');execFileSync(process.env.FFMPEG_PATH||'ffmpeg',['-v','error','-f','lavfi','-i','color=c=blue:s=128x72:r=24:d=1','-c:v','libx264','-pix_fmt','yuv420p',media],{timeout:30000});});
after(()=>fs.rmSync(suite,{recursive:true,force:true}));
function fixture(){
 const root=fs.mkdtempSync(path.join(suite,'project ')),ledger=path.join(root,'review.json'),native=path.join(root,'hyperframes');fs.mkdirSync(native);fs.writeFileSync(path.join(native,'index.html'),'');fs.writeFileSync(path.join(native,'.synthetic-test'),'');
 init(ledger,'synthetic-test');fs.writeFileSync(path.join(root,'board.md'),'test');fs.copyFileSync(media,path.join(root,'shot.mp4'));
 const accept=a=>approve(ledger,a.kind,a.id,{reviewer:'Test fixture',statement:'Synthetic test only',fingerprint:a.fingerprint});accept(register(ledger,'storyboard','main',{files:['board.md']}));
 const a=register(ledger,'shot','a',{files:['shot.mp4'],media:'shot.mp4',engineRevision:'fixture',renderSettings:{fps:24}},{ffprobe});accept(a);const receipt=importShot(ledger,'a',native);
 const html=`<div data-composition-id="main" data-width="128" data-height="72" data-duration="1"><video id="a" src="${receipt.relativeMediaPath}" data-start="0" data-duration="0.5" data-media-start="0.25"></video></div>`;
 fs.writeFileSync(path.join(native,'index.html'),html);
 const c={schema:1,ledger:'review.json',master:{width:128,height:72,fps:'24/1'},audioPolicy:'silent-for-finishing',shots:[{id:'a',revision:a.revision,fingerprint:a.fingerprint,sha256:receipt.sha256,html:'index.html',elementId:'a',startFrame:0,durationFrames:12,sourceInFrame:6}]};
 return {root,native,c,html,receipt,check:()=>preflight(root,c,{ffprobe}),write:h=>fs.writeFileSync(path.join(native,'index.html'),h)};
}
test('valid approved immutable native clip and frame ranges pass without rewriting HTML',()=>{const f=fixture();assert.equal(f.check().ok,true);assert.equal(fs.readFileSync(path.join(f.native,'index.html'),'utf8'),f.html);});
test('wrong clip and changed imported bytes fail',()=>{const f=fixture();f.write(f.html.replace(f.receipt.relativeMediaPath,'assets/animations/wrong.mp4'));assert.throws(f.check,/Wrong native clip/);f.write(f.html);fs.appendFileSync(path.join(f.native,f.receipt.relativeMediaPath),'changed');assert.throws(f.check,/Changed imported/);});
test('source drift fails even though approved imported bytes remain intact',()=>{const f=fixture();fs.appendFileSync(path.join(f.root,'shot.mp4'),'change');assert.throws(f.check,/Stale or unapproved/);});
test('trim, placement and playback changes fail',()=>{const f=fixture();for(const h of [f.html.replace('data-start="0"','data-start="1"'),f.html.replace('data-media-start="0.25"','data-media-start="0"'),f.html.replace('<video','<video data-playback-rate="2"')]){f.write(h);assert.throws(f.check,/mismatch/);}});
test('source range beyond actual media reports measured duration, range and exact overrun',()=>{
 const f=fixture();f.c.shots[0].durationFrames=24;f.write(f.html.replace('data-duration="0.5"','data-duration="1"'));
 assert.throws(f.check,error=>/measured video/.test(error.message)&&/actualDurationSeconds=1\.000000000/.test(error.message)&&/requestedSourceRangeSeconds=\[0\.250000000, 1\.250000000\]/.test(error.message)&&/overrunSeconds=0\.250000000/.test(error.message)&&/allowedToleranceSeconds=0\.000001/.test(error.message));
});
test('mismatched frame cadence needs explicit conversion',()=>{const f=fixture();f.c.master.fps='30/1';f.c.shots[0].durationFrames=15;assert.throws(f.check,/frame-rate conversion/);f.c.shots[0].frameRateConversion='resample';assert.equal(f.check().ok,true);});
test('extra animation reference cannot be omitted',()=>{const f=fixture();f.write(f.html+`<video id="other" src="${f.receipt.relativeMediaPath}"></video>`);assert.throws(f.check,/Unmapped/);});
test('linked native composition placement is checked',()=>{const f=fixture();fs.mkdirSync(path.join(f.native,'compositions'));fs.writeFileSync(path.join(f.native,'compositions','shot.html'),f.html.replace('src="assets/','src="../assets/'));f.write('<div data-composition-id="main" data-width="128" data-height="72"><div data-composition-src="compositions/shot.html" data-start="0.5"></div></div>');f.c.shots[0].html='compositions/shot.html';f.c.shots[0].startFrame=12;assert.equal(f.check().ok,true);f.c.shots[0].startFrame=0;assert.throws(f.check,/mismatch/);});
test('linked host visible duration clips nested video and exact fit passes',()=>{
 const f=fixture();fs.mkdirSync(path.join(f.native,'compositions'));fs.writeFileSync(path.join(f.native,'compositions','shot.html'),f.html.replace('src="assets/','src="../assets/'));
 f.write('<div data-composition-id="main" data-width="128" data-height="72" data-duration="2"><div data-composition-src="compositions/shot.html" data-start="0.5" data-duration="0.5"></div></div>');
 f.c.shots[0].html='compositions/shot.html';f.c.shots[0].startFrame=12;assert.equal(f.check().ok,true);
 f.write(f.html.replace('data-start="0"','data-start="0.25"').replace('data-media-start="0.25"','data-media-start="0.25"'));
 fs.writeFileSync(path.join(f.native,'compositions','shot.html'),fs.readFileSync(path.join(f.native,'index.html'),'utf8').replace('src="assets/','src="../assets/'));
 f.write('<div data-composition-id="main" data-width="128" data-height="72" data-duration="2"><div data-composition-src="compositions/shot.html" data-start="0.5" data-duration="0.5"></div></div>');
 f.c.shots[0].startFrame=18;assert.throws(f.check,/visible window/);
});
test('nested linked windows intersect across every ancestor and accept exact fit',()=>{
 const f=fixture(),comps=path.join(f.native,'compositions');fs.mkdirSync(comps);
 fs.writeFileSync(path.join(comps,'shot.html'),f.html.replace('src="assets/','src="../assets/'));
 fs.writeFileSync(path.join(comps,'inner.html'),'<div data-composition-id="inner"><div data-composition-src="shot.html" data-start="0.25" data-duration="0.5"></div></div>');
 f.write('<div data-composition-id="main" data-width="128" data-height="72" data-duration="1"><div data-composition-src="compositions/inner.html" data-start="0.25" data-duration="0.75"></div></div>');
 f.c.shots[0].html='compositions/shot.html';f.c.shots[0].startFrame=12;assert.equal(f.check().ok,true);
 fs.writeFileSync(path.join(comps,'inner.html'),'<div data-composition-id="inner"><div data-composition-src="shot.html" data-start="0.25" data-duration="0.49"></div></div>');
 assert.throws(f.check,/visible window/);
 fs.writeFileSync(path.join(comps,'inner.html'),'<div data-composition-id="inner"><div data-composition-src="shot.html" data-start="-0.25" data-duration="0.75"></div></div>');
 assert.throws(f.check,/Invalid linked composition placement/);
});
test('linked host timing rejects non-finite starts and non-positive authored durations',()=>{
 const f=fixture();fs.mkdirSync(path.join(f.native,'compositions'));fs.writeFileSync(path.join(f.native,'compositions','shot.html'),f.html.replace('src="assets/','src="../assets/'));
 f.c.shots[0].html='compositions/shot.html';f.c.shots[0].startFrame=0;
 for(const timing of ['data-start="NaN" data-duration="0.5"','data-start="0" data-duration="0"']){
  f.write(`<div data-composition-id="main" data-width="128" data-height="72"><div data-composition-src="compositions/shot.html" ${timing}></div></div>`);
  assert.throws(f.check,/Invalid linked composition (placement|duration)/);
 }
});
test('explicit nested audio binding must fit the linked host window',()=>{
 const f=fixture(),comps=path.join(f.native,'compositions');fs.mkdirSync(comps);
 const tone=path.join(f.native,'tone.wav');execFileSync(process.env.FFMPEG_PATH||'ffmpeg',['-v','error','-f','lavfi','-i','sine=frequency=500:duration=1',tone],{timeout:30000});
 const audioSha=crypto.createHash('sha256').update(fs.readFileSync(tone)).digest('hex');
 const child=f.html.replace('src="assets/','src="../assets/')+'<audio id="tone" src="../tone.wav" data-start="0" data-duration="0.6"></audio>';
 fs.writeFileSync(path.join(comps,'shot.html'),child);
 f.write('<div data-composition-id="main" data-width="128" data-height="72" data-duration="1"><div data-composition-src="compositions/shot.html" data-start="0" data-duration="0.5"></div></div>');
 f.c.shots[0].html='compositions/shot.html';f.c.media=[{kind:'audio',html:'compositions/shot.html',elementId:'tone',path:'tone.wav',sha256:audioSha,startFrame:0,durationSeconds:0.6}];
 assert.throws(f.check,/visible window/);
});
test('negative local media starts are rejected even when an ancestor offset masks them',()=>{
 const f=fixture(),comps=path.join(f.native,'compositions');fs.mkdirSync(comps);
 fs.writeFileSync(path.join(comps,'shot.html'),f.html.replace('src="assets/','src="../assets/').replace('data-start="0"','data-start="-0.25"'));
 f.write('<div data-composition-id="main" data-width="128" data-height="72" data-duration="1"><div data-composition-src="compositions/shot.html" data-start="0.5" data-duration="0.5"></div></div>');
 f.c.shots[0].html='compositions/shot.html';f.c.shots[0].startFrame=6;assert.throws(f.check,/Invalid native media placement/);
});
test('brand identity and bytes are pinned',()=>{const f=fixture();fs.mkdirSync(path.join(f.root,'brand'));fs.writeFileSync(path.join(f.root,'brand','brand.json'),'{}');const sha=crypto.createHash('sha256').update('{}').digest('hex');fs.writeFileSync(path.join(f.root,'PROJECT.json'),JSON.stringify({brand:{manifestSha256:sha}}));assert.throws(f.check,/Brand snapshot/);f.c.brandSha256=sha;fs.cpSync(path.join(f.root,'brand'),path.join(f.native,'assets/brand'),{recursive:true});assert.equal(f.check().ok,true);fs.writeFileSync(path.join(f.root,'brand','brand.json'),'changed');assert.throws(f.check,/Brand snapshot/);});
test('project-relative import receipts survive project relocation',()=>{const f=fixture();const moved=f.root+' moved';fs.renameSync(f.root,moved);assert.equal(preflight(moved,f.c,{ffprobe}).ok,true);});
test('comments and script strings cannot impersonate an actual clip',()=>{const f=fixture();f.write('<!--'+f.html+'--><script>'+JSON.stringify(f.html)+'</script>');assert.throws(f.check,/canvas mismatch|Missing/);});
test('encoded final output must match master settings',()=>{const f=fixture();f.c.export='shot.mp4';assert.equal(f.check().ok,true);f.c.master.fps='30/1';f.c.shots[0].durationFrames=15;f.c.shots[0].frameRateConversion='resample';assert.throws(f.check,/export settings/);});
test('changed brand font/mark bytes fail even with unchanged manifest',()=>{const f=fixture();fs.mkdirSync(path.join(f.root,'brand'));fs.writeFileSync(path.join(f.root,'brand','font.ttf'),'fixture font');const digest=s=>crypto.createHash('sha256').update(s).digest('hex');const pack=JSON.stringify({id:'test',version:'1',files:{'font.ttf':digest('fixture font')}});fs.writeFileSync(path.join(f.root,'brand','brand.json'),pack);f.c.brandSha256=digest(pack);fs.writeFileSync(path.join(f.root,'PROJECT.json'),JSON.stringify({brand:{id:'test',version:'1',manifestSha256:f.c.brandSha256}}));fs.cpSync(path.join(f.root,'brand'),path.join(f.native,'assets/brand'),{recursive:true});assert.equal(f.check().ok,true);fs.appendFileSync(path.join(f.root,'brand','font.ttf'),'changed');assert.throws(f.check,/Changed brand asset/);});
test('canvas conversion and shortened export are detected',()=>{const f=fixture();f.c.master.width=256;f.write(f.html.replace('data-width="128"','data-width="256"'));assert.throws(f.check,/canvas conversion/);f.c.shots[0].scaling='fit';assert.equal(f.check().ok,true);f.c.master.width=128;f.write(f.html.replace('data-duration="1"','data-duration="2"'));f.c.export='shot.mp4';assert.throws(f.check,/duration mismatch/);});
test('silent policy rejects actual embedded audio',()=>{
 const f=fixture(),sound=path.join(f.root,'sound.mp4');execFileSync(process.env.FFMPEG_PATH||'ffmpeg',['-v','error','-i',media,'-f','lavfi','-i','sine=frequency=440:duration=1','-c:v','copy','-c:a','aac','-shortest',sound],{timeout:30000});
 const ledger=path.join(f.root,'review.json'),a=register(ledger,'shot','sound',{files:['sound.mp4'],media:'sound.mp4',engineRevision:'fixture',renderSettings:{fps:24}},{ffprobe});approve(ledger,'shot','sound',{reviewer:'Fixture',statement:'Synthetic test only',fingerprint:a.fingerprint});const r=importShot(ledger,'sound',f.native);f.write(f.html.replace(f.receipt.relativeMediaPath,r.relativeMediaPath));Object.assign(f.c.shots[0],{id:'sound',revision:a.revision,fingerprint:a.fingerprint,sha256:r.sha256});assert.throws(f.check,/Embedded audio/);f.c.audioPolicy='embedded';assert.equal(f.check().ok,true);
});

test('direct preflight checks generated native fonts, logos, manifest and symlinks without PDOOM',()=>{
 const f=fixture(),digest=s=>crypto.createHash('sha256').update(s).digest('hex');
 const canonical=path.join(f.root,'brand'),nativeBrand=path.join(f.native,'assets/brand');
 fs.mkdirSync(canonical);const pack={id:'test',version:'1',files:{'font.ttf':digest('font'),'logo.svg':digest('logo')}};
 fs.writeFileSync(path.join(canonical,'font.ttf'),'font');fs.writeFileSync(path.join(canonical,'logo.svg'),'logo');
 fs.writeFileSync(path.join(canonical,'brand.json'),JSON.stringify(pack));f.c.brandSha256=digest(JSON.stringify(pack));
 fs.writeFileSync(path.join(f.root,'PROJECT.json'),JSON.stringify({brand:{id:'test',version:'1',manifestSha256:f.c.brandSha256}}));
 fs.cpSync(canonical,nativeBrand,{recursive:true});assert.equal(f.check().ok,true);assert.equal(fs.existsSync(path.join(f.root,'animation')),false);
 for(const name of ['font.ttf','logo.svg']) {
  fs.appendFileSync(path.join(nativeBrand,name),' drift');assert.throws(f.check,/Changed native brand asset/);
  fs.copyFileSync(path.join(canonical,name),path.join(nativeBrand,name));
 }
 fs.appendFileSync(path.join(nativeBrand,'brand.json'),' ');assert.throws(f.check,/Native brand snapshot mismatch/);
 fs.copyFileSync(path.join(canonical,'brand.json'),path.join(nativeBrand,'brand.json'));
 fs.unlinkSync(path.join(nativeBrand,'font.ttf'));fs.symlinkSync(path.join(canonical,'font.ttf'),path.join(nativeBrand,'font.ttf'));
 assert.throws(f.check,/Symlink unsupported/);
});

function audioBinding(f){
 const target=path.join(f.native,'tone.wav');execFileSync(process.env.FFMPEG_PATH||'ffmpeg',['-v','error','-f','lavfi','-i','sine=frequency=500:duration=1',target],{timeout:30000});
 const binding={kind:'audio',html:'index.html',elementId:'tone',path:'tone.wav',sha256:crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex'),startFrame:0,durationFrames:12,sourceInSeconds:0.25};
 f.write(f.html+'<audio id="tone" src="tone.wav" data-start="0" data-duration="0.5" data-media-start="0.25"></audio>');return {target,binding};
}
test('explicit audio bindings verify decoded bytes and exact timeline; legacy reports missing coverage',()=>{
 const f=fixture(),{target,binding}=audioBinding(f);assert.equal(f.check().untrackedMedia.length,1);assert.match(f.check().limitations.join(' '),/integrity is not complete/);
 f.c.media=[binding];const result=f.check();assert.equal(result.mediaFiles.length,1);assert.equal(result.untrackedMedia.length,0);assert.ok(result.mediaFiles[0].metadata.decodedFrames>0);
 binding.sourceInSeconds=0;assert.throws(f.check,/timeline/);binding.sourceInSeconds=0.25;
 fs.appendFileSync(target,'changed');assert.throws(f.check,/Changed native media/);
});
test('explicit mapping rejects omissions, duplicates, corrupt audio and animation relabeling',()=>{
 const f=fixture(),{target,binding}=audioBinding(f);f.c.media=[];assert.throws(f.check,/Unmapped native media/);f.c.media=[binding,binding];assert.throws(f.check,/Duplicate/);
 f.c.media=[binding];fs.writeFileSync(target,'not audio');binding.sha256=crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');assert.throws(f.check);
 const g=fixture();g.c.media=[{kind:'video',html:'index.html',elementId:'a',path:g.receipt.relativeMediaPath,sha256:g.receipt.sha256,startFrame:0,durationFrames:12,sourceInSeconds:0.25}];g.c.shots=[];assert.throws(g.check,/Unmapped animation|approved shot/);
});
test('recorded video has an explicit binding and drift protection',()=>{
 const f=fixture(),target=path.join(f.native,'recording.mp4');execFileSync(process.env.FFMPEG_PATH||'ffmpeg',['-v','error','-f','lavfi','-i','color=c=red:s=128x72:r=24:d=1','-c:v','libx264','-pix_fmt','yuv420p',target],{timeout:30000});
 const binding={kind:'video',html:'index.html',elementId:'screen',path:'recording.mp4',sha256:crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex'),startFrame:0,durationFrames:24};
 f.c.media=[binding];f.write(f.html+'<video id="screen" src="recording.mp4" data-start="0" data-duration="1"></video>');assert.equal(f.check().mediaFiles[0].kind,'video');
 binding.durationFrames=25;assert.throws(f.check,/timeline|exceeds/);
});


test('review preflight permits current unapproved shots but default finishing remains guarded',()=>{
 const f=fixture(),ledger=path.join(f.root,'review.json'),data=JSON.parse(fs.readFileSync(ledger));
 data.artifacts.find(a=>a.kind==='shot').approval=null;data.imports[0].reviewOnly=true;fs.writeFileSync(ledger,JSON.stringify(data));
 assert.throws(f.check,/unapproved/);
 const result=preflight(f.root,f.c,{ffprobe,reviewOnly:true});assert.equal(result.reviewOnly,true);assert.equal(result.ok,true);
 data.artifacts.find(a=>a.kind==='shot').approval={reviewer:'Fixture',statement:'historical fixture'};fs.writeFileSync(ledger,JSON.stringify(data));
 assert.throws(f.check,/Review-only import/);
 fs.appendFileSync(path.join(f.root,'shot.mp4'),'drift');assert.throws(()=>preflight(f.root,f.c,{ffprobe,reviewOnly:true}),/Stale/);
});
test('review preflight retains exact timeline, imported byte, audio and project mapping checks',()=>{
 const f=fixture();f.c.reviewOnly=true;
 f.write(f.html.replace('data-start="0"','data-start="0.1"'));assert.throws(()=>preflight(f.root,f.c,{ffprobe,reviewOnly:true}),/mismatch/);
 f.write(f.html);const ledger=path.join(f.root,'review.json'),data=JSON.parse(fs.readFileSync(ledger));
 data.imports[0].projectRelativePath='elsewhere';fs.mkdirSync(path.join(f.root,'elsewhere'));fs.writeFileSync(ledger,JSON.stringify(data));
 assert.throws(()=>preflight(f.root,f.c,{ffprobe,reviewOnly:true}),/Missing immutable import/);
});


test('review-only contracts require explicit invocation even with approved components',()=>{
 const f=fixture();f.c.reviewOnly=true;assert.throws(f.check,/explicit review-only invocation/);
 assert.equal(preflight(f.root,f.c,{ffprobe,reviewOnly:true}).ok,true);
});
test('audio bindings preserve fractional-frame tails and enforce exact seconds',()=>{
 const f=fixture(),{binding}=audioBinding(f);delete binding.durationFrames;binding.sourceInSeconds=0;binding.durationSeconds=0.9835;
 f.c.media=[binding];f.write(f.html+'<audio id="tone" src="tone.wav" data-start="0" data-duration="0.9835"></audio>');
 assert.equal(f.check().ok,true);
 binding.durationSeconds=23/24;assert.throws(f.check,/timeline/);
 binding.durationSeconds=0.9835;binding.durationFrames=24;assert.throws(f.check,/not both/);delete binding.durationFrames;
 binding.durationSeconds=1.1;f.write(f.html+'<audio id="tone" src="tone.wav" data-start="0" data-duration="1.1"></audio>');assert.throws(f.check,/exceeds/);
});
test('audio range diagnostics report actual WAV bounds and retain the one-microsecond tolerance',()=>{
 const f=fixture(),{binding}=audioBinding(f);delete binding.durationFrames;binding.sourceInSeconds=0;binding.durationSeconds=1.000002;
 f.c.media=[binding];f.write(f.html+'<audio id="tone" src="tone.wav" data-start="0" data-duration="1.000002"></audio>');
 assert.throws(f.check,error=>/measured audio/.test(error.message)&&/file: tone\.wav/.test(error.message)&&/actualDurationSeconds=1\.000000000/.test(error.message)&&/requestedSourceRangeSeconds=\[0\.000000000, 1\.000002000\]/.test(error.message)&&/overrunSeconds=0\.000002000/.test(error.message)&&/0\.002000 ms/.test(error.message)&&/allowedToleranceSeconds=0\.000001/.test(error.message));
 binding.durationSeconds=1.0000005;f.write(f.html+'<audio id="tone" src="tone.wav" data-start="0" data-duration="1.0000005"></audio>');
 assert.equal(f.check().ok,true);
});

test('explicit approved import remains usable after earlier review-only staging',()=>{
 const f=fixture(),ledger=path.join(f.root,'review.json'),data=JSON.parse(fs.readFileSync(ledger));
 const approved={...data.imports[0]};data.imports[0].reviewOnly=true;data.imports.push(approved);fs.writeFileSync(ledger,JSON.stringify(data));
 assert.equal(f.check().ok,true);
});
