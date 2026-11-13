import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
/** Per-command private telemetry, outside inventoried creative sources. */
export async function collectBrowserTelemetry(callback) {
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'studio-browser-'));
 const filename=path.join(directory,'launches.jsonl');
 await fs.writeFile(filename,'',{flag:'wx'});
 try {
  const value=await callback(filename);
  const rows=(await fs.readFile(filename,'utf8')).split('\n').filter(Boolean).map(line=>JSON.parse(line));
  const launches=rows.filter(row=>row.kind!=='text-diagnostics');
  const diagnostics=rows.filter(row=>row.kind==='text-diagnostics');
  return {value,telemetry:{launches,available:launches.length>0,unavailableReason:launches.length?null:'Renderer supplied no effective browser telemetry (older workspace payload or unsupported renderer).',textDiagnostics:{pages:diagnostics,available:diagnostics.some(row=>row.available),unavailableReason:diagnostics.length?null:'Renderer supplied no text diagnostic snapshots (older workspace payload or unsupported renderer).'}}};
 } catch(error) {
  try {const rows=(await fs.readFile(filename,'utf8')).split('\n').filter(Boolean);error.partialBrowserTelemetry=rows.map(line=>{try{return JSON.parse(line);}catch{return {kind:'unparsed-telemetry',line:line.slice(0,1000)};}});}catch{}
  throw error;
 } finally {await fs.rm(directory,{recursive:true,force:true});}
}
