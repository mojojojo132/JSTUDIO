#!/usr/bin/env node
// Keep this process running in a persistent terminal throughout the rehearsal.
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import net from 'node:net';
const [browser,profileArg,sessionArg,url='about:blank']=process.argv.slice(2);
if(!browser||!profileArg||!sessionArg){console.error('Usage: node browser-session.mjs <browser-executable> <dedicated-profile> <new-session.json> [url]');process.exit(1);}
const profile=path.resolve(profileArg),session=path.resolve(sessionArg);
fs.mkdirSync(profile,{recursive:true});
// Reject an existing profile: prevents stealing a running session or confusing old endpoints.
if(fs.readdirSync(profile).length){console.error('Use a new empty dedicated browser profile directory.');process.exit(1);}
const lock=fs.openSync(session,'wx');fs.closeSync(lock);
const server=net.createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
const port=server.address().port;await new Promise(resolve=>server.close(resolve));
const state={startedAt:new Date().toISOString(),supervisorPid:process.pid,browser:path.resolve(browser),profile,url,port,status:'starting',requestedWindow:{width:1640,height:1000}};
const save=()=>fs.writeFileSync(session,JSON.stringify(state,null,2)+'\n');save();
const child=spawn(browser,[`--user-data-dir=${profile}`,`--remote-debugging-port=${port}`,'--remote-debugging-address=127.0.0.1','--no-first-run','--window-size=1640,1000',url],{stdio:['ignore','ignore','pipe'],windowsHide:false});
const log=fs.createWriteStream(session+'.browser.log',{flags:'a'});child.stderr.pipe(log);
state.browserPid=child.pid;save();
let ended=false;
const deadline=Date.now()+30000;
const poll=setInterval(async()=>{if(state.status==='starting'&&Date.now()>deadline){state.error='Browser did not expose its local control endpoint within 30 seconds';state.status='failed';save();child.kill();return;}try{const response=await fetch(`http://127.0.0.1:${port}/json/version`,{signal:AbortSignal.timeout(1500)});const info=await response.json();if(ended||state.status==='failed')return;state.status='ready';state.webSocketDebuggerUrl=info.webSocketDebuggerUrl;state.lastSeenAt=new Date().toISOString();save();}catch{if(!ended&&state.status==='ready'){state.status='unreachable';save();}}},2000);
child.on('error',error=>{ended=true;state.error=error.message;state.status='failed';save();clearInterval(poll);log.end();process.exitCode=1;});
child.on('exit',(code,signal)=>{ended=true;clearInterval(poll);state.status=state.error||(!state.stopRequestedAt&&code!==0)?'failed':'stopped';if(state.status==='failed')process.exitCode=1;state.exitCode=code;state.signal=signal;state.stoppedAt=new Date().toISOString();save();log.end();});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{state.stopRequestedAt=new Date().toISOString();save();child.kill();});
console.log('Keep this terminal running. Session receipt: '+session);
