import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {collectBrowserTelemetry} from '../scripts/browser-telemetry.mjs';
test('collects actual renderer records and removes private telemetry',async()=>{
 let filename;const result=await collectBrowserTelemetry(async file=>{filename=file;await fs.appendFile(file,JSON.stringify({version:'fixture-version',executablePath:'/fixture'})+'\n');return 42;});
 assert.equal(result.value,42);assert.equal(result.telemetry.launches[0].version,'fixture-version');assert.equal(result.telemetry.available,true);await assert.rejects(fs.access(filename));
});
test('older renderers are explicitly unavailable and failed jobs clean telemetry',async()=>{
 const result=await collectBrowserTelemetry(async()=>{});assert.equal(result.telemetry.available,false);assert.match(result.telemetry.unavailableReason,/no effective/);
 let filename;await assert.rejects(collectBrowserTelemetry(async file=>{filename=file;throw Error('failed render');}),/failed render/);await assert.rejects(fs.access(filename));
});
test('text diagnostic evidence persists separately and never counts as a browser launch',async()=>{
 const result=await collectBrowserTelemetry(file=>fs.appendFile(file,JSON.stringify({kind:'text-diagnostics',available:true,diagnostics:[{code:'width',count:3}],droppedOccurrences:2})+'\n'));
 assert.equal(result.telemetry.available,false);assert.equal(result.telemetry.launches.length,0);
 assert.equal(result.telemetry.textDiagnostics.available,true);
 assert.equal(result.telemetry.textDiagnostics.pages[0].diagnostics[0].count,3);
 assert.equal(result.telemetry.textDiagnostics.pages[0].droppedOccurrences,2);
});

test('failed render preserves partial browser evidence before cleanup',async()=>{
 let filename;await assert.rejects(collectBrowserTelemetry(async file=>{filename=file;await fs.appendFile(file,JSON.stringify({version:'test-browser'})+'\n');throw Error('scene failed');}),e=>{assert.equal(e.partialBrowserTelemetry[0].version,'test-browser');return true;});await assert.rejects(fs.access(filename));
});
