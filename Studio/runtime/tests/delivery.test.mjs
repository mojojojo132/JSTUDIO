import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {deliverApprovedCut} from '../scripts/delivery.mjs';
function setup(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'studio-delivery-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const bytes=Buffer.from('exact encoded candidate fixture'),sha256=crypto.createHash('sha256').update(bytes).digest('hex');
 fs.writeFileSync(path.join(root,'candidate.mp4'),bytes);
 const cut={kind:'cut',id:'main',fingerprint:'cut-fingerprint',media:'candidate.mp4',files:[{path:'candidate.mp4',sha256}],approval:{fingerprint:'cut-fingerprint',statement:'Approved',reviewer:'TEST'}};
 const ledger=path.join(root,'REVIEW.json');fs.writeFileSync(ledger,JSON.stringify({purpose:'production',artifacts:[cut]}));
 const status=()=>({artifacts:[{kind:'cut',id:'main',fingerprint:cut.fingerprint,current:true}]});return {root,ledger,cut,status,bytes};
}
test('promotion is exclusive, byte-identical and does not render',t=>{
 const f=setup(t);const result=deliverApprovedCut(f.root,f.ledger,'delivery/final.mp4',f);
 assert.equal(result.rendered,false);assert.equal(result.byteIdentical,true);assert.deepEqual(fs.readFileSync(result.path),f.bytes);
 assert.throws(()=>deliverApprovedCut(f.root,f.ledger,'delivery/final.mp4',f),/EEXIST/);
});
test('delivery rejects unapproved, synthetic, tampered, escaping and symlink candidates',t=>{
 const f=setup(t),write=purpose=>fs.writeFileSync(f.ledger,JSON.stringify({purpose,artifacts:[f.cut]}));
 f.cut.approval=null;write('production');assert.throws(()=>deliverApprovedCut(f.root,f.ledger,'delivery/f.mp4',f),/Approve/);
 f.cut.approval={fingerprint:f.cut.fingerprint};write('synthetic-test');assert.throws(()=>deliverApprovedCut(f.root,f.ledger,'delivery/f.mp4',f),/Synthetic/);
 write('production');assert.throws(()=>deliverApprovedCut(f.root,f.ledger,'delivery/../escape.mp4',f),/relative/);
 fs.mkdirSync(path.join(f.root,'outside'));fs.symlinkSync(path.join(f.root,'outside'),path.join(f.root,'delivery'));
 assert.throws(()=>deliverApprovedCut(f.root,f.ledger,'delivery/f.mp4',f),/symlink/i);fs.unlinkSync(path.join(f.root,'delivery'));
 fs.appendFileSync(path.join(f.root,'candidate.mp4'),'mutation');assert.throws(()=>deliverApprovedCut(f.root,f.ledger,'delivery/f.mp4',f),/bytes changed/);
});
