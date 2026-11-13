import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {summarizeReceipts} from '../scripts/receipt-summary.mjs';
test('receipt totals distinguish unique artifacts, failures and invalid evidence',t=>{
 const p=fs.mkdtempSync(path.join(os.tmpdir(),'receipt-summary-'));t.after(()=>fs.rmSync(p,{recursive:true,force:true}));const d=path.join(p,'evidence/proofs');fs.mkdirSync(d,{recursive:true});
 const r={kind:'internal-proof',output:{path:'reviews/proof/v1/proof.mp4',sha256:'a'.repeat(64),decoded:true}};
 fs.writeFileSync(path.join(d,'one.json'),JSON.stringify(r));fs.writeFileSync(path.join(d,'duplicate.json'),JSON.stringify(r));fs.writeFileSync(path.join(d,'broken.json'),'{');
 const result=summarizeReceipts(p,[{stage:'proof',operation:{status:'completed'}},{stage:'proof',operation:{status:'failed'}}]);
 assert.equal(result.proofs.receiptCount,2);assert.equal(result.proofs.uniqueOutputs,1);assert.equal(result.proofs.errors.length,1);assert.equal(result.commands.byStatus.failed,1);assert.equal(result.commands.byStage.proof,2);
});
