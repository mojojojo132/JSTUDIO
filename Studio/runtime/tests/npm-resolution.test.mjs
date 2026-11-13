import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveNpmCli} from '../scripts/npm-resolution.mjs';

test('finds npm in portable Node runtime layout',()=>{
 const executable='/studio/.runtime/node/bin/node',expected='/studio/.runtime/node/lib/node_modules/npm/bin/npm-cli.js';
 assert.equal(resolveNpmCli(executable,{platform:'linux',env:{},isFile:file=>file===expected}),expected);
});
test('finds npm in Homebrew Cellar layout',()=>{
 const executable='/opt/homebrew/Cellar/node/25.6.0/bin/node',expected='/opt/homebrew/Cellar/node/25.6.0/lib/node_modules/npm/bin/npm-cli.js';
 assert.equal(resolveNpmCli(executable,{platform:'darwin',env:{},isFile:file=>file===expected}),expected);
});
test('prefers the explicit npm CLI and explains invalid overrides',()=>{
 const expected='/custom/npm-cli.js';
 assert.equal(resolveNpmCli('/missing/node',{platform:'linux',env:{JSTUDIO_NPM_CLI:expected},isFile:file=>file===expected}),expected);
 assert.throws(()=>resolveNpmCli('/missing/node',{platform:'linux',env:{JSTUDIO_NPM_CLI:expected},isFile:()=>false}),/JSTUDIO_NPM_CLI.*not a readable npm CLI file/);
});
test('reports searched locations when npm is unavailable',()=>{
 assert.throws(()=>resolveNpmCli('/portable/node/bin/node',{platform:'linux',env:{},isFile:()=>false}),/Could not locate npm.*JSTUDIO_NPM_CLI/);
});
