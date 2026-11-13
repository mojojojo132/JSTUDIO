import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertBrowserLaunchAllowed} from '../scripts/browser-launch.mjs';
import {finishRender} from '../scripts/finishing.mjs';
test('restricted macOS browser launch fails with actionable code; approved and other platforms pass',()=>{
 assert.throws(()=>assertBrowserLaunchAllowed({platform:'darwin',env:{CODEX_SANDBOX:'seatbelt'}}),{code:'STUDIO_BROWSER_EXECUTION_REQUIRED'});
 for(const [platform,env] of [['darwin',{}],['win32',{CODEX_SANDBOX:'seatbelt'}],['linux',{}]])assert.doesNotThrow(()=>assertBrowserLaunchAllowed({platform,env}));
});
test('native restricted render stops before child callback; help remains usable',{skip:process.platform!=='darwin'},async()=>{
 let calls=0;const options={env:{CODEX_SANDBOX:'seatbelt'},runRender:async()=>calls++};
 await assert.rejects(finishRender(['render'],options),{code:'STUDIO_BROWSER_EXECUTION_REQUIRED'});assert.equal(calls,0);
 await finishRender(['render','--help'],options);assert.equal(calls,1);
});
