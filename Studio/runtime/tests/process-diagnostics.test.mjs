import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {diagnosticRun} from '../scripts/process-diagnostics.mjs';
test('retains original error and full log despite trailing output',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'studio-diagnostics-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const logPath=path.join(dir,'render.log');
 await assert.rejects(diagnosticRun(process.execPath,['-e',"console.error('RangeError: negative radius at frame 0');console.log('cleanup complete');process.exit(1)"],{logPath}),error=>{assert.match(error.message,/negative radius at frame 0/);assert.equal(error.diagnostic.exitCode,1);return true;});
 assert.match(await fs.readFile(logPath,'utf8'),/cleanup complete/);
 await assert.rejects(diagnosticRun(process.execPath,['-e',''],{logPath}),/EEXIST/);
});
test('reports failed executable and accepts successful command',async()=>{
 await assert.rejects(diagnosticRun('/nonexistent/studio-executable',[]),/ENOENT/);
 await diagnosticRun(process.execPath,['-e','process.exit(0)']);
});
