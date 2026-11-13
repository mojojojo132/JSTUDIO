import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {withRunReport,executionIdentity} from '../scripts/tool-run.mjs';
import {renderReportDirectory} from '../scripts/finishing.mjs';

test('successful and failed commands preserve distinct truthful token reports',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'studio-run-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 assert.equal(await withRunReport({directory:dir,stage:'fixture'},async()=>42),42);
 await assert.rejects(withRunReport({directory:dir,stage:'fixture'},async()=>{throw Error('fixture failed');}),/fixture failed/);
 const revisions=await fs.readdir(path.join(dir,'evidence/runs'));assert.equal(revisions.length,2);
 const reports=await Promise.all(revisions.map(async revision=>JSON.parse(await fs.readFile(path.join(dir,'evidence/runs',revision,'RUN-REPORT.json')))));
 assert.deepEqual(reports.map(r=>r.operation.status).sort(),['completed','failed']);
 for(const report of reports){assert.equal(report.tokens.total.total,null);assert.equal(report.tokens.total.knownSubtotal,null);assert.equal(report.coverage.complete,false);assert.match(report.entries[0].unavailableReasons.input,/host AI token telemetry/);assert(report.elapsedMs>=0);}
});

test('native report stays with canonical project for explicit and implicit render paths',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'studio-run-path-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await fs.mkdir(path.join(dir,'hyperframes'));await fs.writeFile(path.join(dir,'PROJECT.json'),'{}');
 assert.equal(renderReportDirectory(['render','hyperframes'],dir),dir);
 assert.equal(renderReportDirectory(['render','--quality','delivery','hyperframes'],dir),dir);
 assert.equal(renderReportDirectory(['render'],path.join(dir,'hyperframes')),dir);
});

test('animation dependency failure is recorded before any render can begin',async t=>{
 const {main}=await import('../scripts/animation.mjs');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'studio-run-early-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await assert.rejects(main(['render','missing','video','--project','projects/test.json'],dir),/ENOENT/);
 const [revision]=await fs.readdir(path.join(dir,'evidence/runs'));
 const report=JSON.parse(await fs.readFile(path.join(dir,'evidence/runs',revision,'RUN-REPORT.json')));
 assert.equal(report.operation.status,'failed');assert.match(report.operation.error,/SOURCE-SHA256/);assert.equal(report.tokens.total.total,null);
});

 test('duplicated operation arguments are redacted as well as process invocation',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'studio-run-redact-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await withRunReport({directory:dir,stage:'fixture',details:{arguments:['--token','secret-value','--output','film.mp4']}},async()=>{});
 const [id]=await fs.readdir(path.join(dir,'evidence/runs'));const report=JSON.parse(await fs.readFile(path.join(dir,'evidence/runs',id,'RUN-REPORT.json')));
 assert.deepEqual(report.operation.arguments,['--token','[REDACTED]','--output','film.mp4']);
 });

test('command build identity distinguishes changed inventory bytes',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'studio-build-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await fs.writeFile(path.join(dir,'FILES.sha256'),'first');await fs.writeFile(path.join(dir,'package.json'),JSON.stringify({version:'test'}));
 const first=await executionIdentity(dir);await fs.writeFile(path.join(dir,'FILES.sha256'),'second');const second=await executionIdentity(dir);
 assert.equal(first.packageVersion,'test');assert.notEqual(first.runtimeInventorySha256,second.runtimeInventorySha256);assert.match(first.limitations.join(' '),/does not verify/);
});
