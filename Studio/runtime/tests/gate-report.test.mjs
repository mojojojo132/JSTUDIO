import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {writeGateReport} from '../scripts/gate-report.mjs';import {commandInvocation} from '../scripts/tool-run.mjs';
test('gate records command failures without miscounting process reports as tokens',t=>{
 const p=fs.mkdtempSync(path.join(os.tmpdir(),'gate-report-'));t.after(()=>fs.rmSync(p,{recursive:true,force:true}));
 fs.mkdirSync(path.join(p,'evidence/runs/one'),{recursive:true});fs.writeFileSync(path.join(p,'evidence/runs/one/RUN-REPORT.json'),JSON.stringify({runId:'one',operation:{status:'failed',error:'fixture'}}));
 const a=writeGateReport(p,{stage:'animation',event:'registered-awaiting-review',snapshot:{}}),b=writeGateReport(p,{stage:'animation',event:'registered-awaiting-review',snapshot:{}});
 assert.notEqual(a.reportPath,b.reportPath);const report=JSON.parse(fs.readFileSync(a.reportPath));assert.equal(report.commands[0].operation.status,'failed');const tokens=JSON.parse(fs.readFileSync(a.tokenReport));assert.equal(tokens.tokens.total.total,null);assert.equal(tokens.coverage.complete,false);
 assert.throws(()=>writeGateReport(p,{stage:'bad'}),/stage/);
});
test('presented-for-review gates emit a hash-bound learning packet and expose its path',t=>{
 const p=fs.mkdtempSync(path.join(os.tmpdir(),'gate-improvement-'));t.after(()=>fs.rmSync(p,{recursive:true,force:true}));
 const operations=path.join(p,'profile');
 const result=writeGateReport(p,{stage:'final',event:'presented-for-review',snapshot:{},operations});
 assert.ok(result.improvementPacket);assert.equal(result.improvementPacketError,null);
 const report=JSON.parse(fs.readFileSync(result.reportPath,'utf8'));
 assert.equal(report.improvementPacket.packetPath,result.improvementPacket.packetPath);
 assert.equal(report.improvementPacket.packetSha256.length,64);
 const packet=JSON.parse(fs.readFileSync(path.join(p,result.improvementPacket.packetPath),'utf8'));
 assert.equal(packet.gate.event,'presented-for-review');assert(packet.sources.some(source=>source.kind==='gate-token-report'));
 assert(fs.existsSync(path.join(p,result.improvementPacket.findingsTemplatePath)));
});
test('command provenance preserves arguments while redacting credential flag values',()=>{
 const result=commandInvocation(['workflow.mjs','video','render','--token','secret','--api-key=secret','--output','video.mp4'],'/fixture');
 assert.equal(result.cwd,'/fixture');assert.deepEqual(result.arguments,['workflow.mjs','video','render','--token','[REDACTED]','--api-key=[REDACTED]','--output','video.mp4']);
});
