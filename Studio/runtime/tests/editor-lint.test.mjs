import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {lintNativeEditor} from '../scripts/editor-lint.mjs';

function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'jstudio-editor-lint-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.writeFileSync(path.join(root,'index.html'),'<main></main>');return root;}
function result(report,status=0){return (_command,args,options)=>{assert.equal(args[1],'lint');assert.equal(args.at(-1),'--json');assert.equal(options.encoding,'utf8');return {status,stdout:JSON.stringify(report),stderr:''};};}
const pinned={_meta:{version:'0.8.77'}};
test('accepts a clean report from the pinned Editor linter',t=>{
 const native=fixture(t),report={...pinned,ok:true,errorCount:0,warningCount:0,filesScanned:1,findings:[]};
 assert.deepEqual(lintNativeEditor(native,{run:result(report)}),{passed:true,skipped:false,version:'0.8.77',filesScanned:1,warningCount:0});
});
test('blocks the expensive missing-timeline warning and prints its fix hint',t=>{
 const native=fixture(t),report={...pinned,ok:true,errorCount:0,warningCount:1,findings:[{severity:'warning',code:'missing_data_no_timeline',message:'Video-only entry has no timeline marker',file:'index.html',line:1,fixHint:'Add data-no-timeline'}]};
 assert.throws(()=>lintNativeEditor(native,{run:result(report)}),/missing_data_no_timeline.*index\.html:1.*Add data-no-timeline/);
});
test('the installed pinned linter blocks a missing no-timeline marker and accepts the repaired entry',t=>{
 const native=fixture(t),entry=marker=>`<!doctype html><html><body><main data-composition-id="main"${marker} data-width="1920" data-height="1080" data-duration="30"></main></body></html>`;
 fs.writeFileSync(path.join(native,'index.html'),entry(''));
 assert.throws(()=>lintNativeEditor(native),/missing_data_no_timeline.*45 s/);
 fs.writeFileSync(path.join(native,'index.html'),entry(' data-no-timeline'));
 assert.equal(lintNativeEditor(native).passed,true);
});
test('the installed pinned linter accepts an entry with its matching composition timeline registered',t=>{
 const native=fixture(t);
 fs.writeFileSync(path.join(native,'index.html'),'<!doctype html><html><body><main data-composition-id="main" data-width="1920" data-height="1080" data-duration="30"></main><script>window.__timelines = window.__timelines || {}; window.__timelines["main"] = {};</script></body></html>');
 assert.equal(lintNativeEditor(native).passed,true);
});
test('blocks Editor errors before capture and rejects a non-pinned linter',t=>{
 const native=fixture(t),bad={...pinned,ok:false,errorCount:1,warningCount:0,findings:[{severity:'error',code:'invalid_media',message:'Unsupported source'}]};
 assert.throws(()=>lintNativeEditor(native,{run:result(bad,1)}),/invalid_media: Unsupported source/);
 assert.throws(()=>lintNativeEditor(native,{run:result({...pinned,_meta:{version:'0.8.152'},ok:true,findings:[]})}),/does not match the pinned runtime version/);
});
test('reports a not-yet-created Editor entry as skipped for ordinary exchange validation',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'jstudio-editor-lint-empty-'));
 try{const report=lintNativeEditor(root,{run:()=>{throw Error('must not run');}});assert.equal(report.skipped,true);}finally{fs.rmSync(root,{recursive:true,force:true});}
});
