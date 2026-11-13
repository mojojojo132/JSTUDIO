import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {validateInstallation,launch} from '../scripts/launch.mjs';
async function fixture(t,platform) {
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'jstudio-launch-test-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.mkdir(path.join(root,'.runtime'));
 await fs.writeFile(path.join(root,'.runtime/setup-complete.json'),JSON.stringify({platform}));
 await fs.mkdir(path.join(root,'node_modules/hyperframes/bin'),{recursive:true});
 await fs.writeFile(path.join(root,'node_modules/hyperframes/bin/hyperframes.mjs'),'');
 return root;
}
for (const [platform,arch] of [['darwin','arm64'],['darwin','x64'],['win32','x64']]) {
 test(`accept matching ${platform}-${arch} setup`,async t=>{
  const root=await fixture(t,`${platform}-${arch}`);
  assert.equal((await validateInstallation(root,{platform,arch})).platform,`${platform}-${arch}`);
 });
}
test('reject copying configured Mac runtime to Windows while preserving projects',async t=>{
 const root=await fixture(t,'darwin-arm64');
 await assert.rejects(()=>validateInstallation(root,{platform:'win32',arch:'x64'}),/Transfer project folders only/);
});
test('incomplete setup and missing dependencies fail with recovery guidance',async t=>{
 const root=await fixture(t,`${process.platform}-${process.arch}`);
 await fs.rm(path.join(root,'node_modules'),{recursive:true});
 await assert.rejects(()=>validateInstallation(root),/Rerun Setup/);
 await fs.writeFile(path.join(root,'.runtime/setup-complete.json'),'{');
 await assert.rejects(()=>validateInstallation(root),/Setup is incomplete/);
});

test('project launcher preserves lifecycle and explicit background flags',async t=>{
 const root=await fixture(t,`${process.platform}-${process.arch}`),project=path.join(root,'native');await fs.mkdir(project);await fs.writeFile(path.join(project,'index.html'),'fixture');
 for(const flag of ['--stop','--status','--background']){let actual;await launch([project,flag],{directory:root,validate:async()=>{},preview:async args=>{actual=args;}});assert(!actual.includes('--foreground'));assert(actual.includes(flag));}
 let actual;await launch([project],{directory:root,validate:async()=>{},preview:async args=>{actual=args;}});assert(actual.includes('--foreground'));
});
