import fs from 'node:fs';
import path from 'node:path';
export function studioHome(runtime) {
 const absolute=path.resolve(runtime);
 if(fs.existsSync(path.join(absolute,'STUDIO.json')))return absolute;
 const parent=path.dirname(absolute);
 return fs.existsSync(path.join(parent,'STUDIO.json'))?parent:absolute;
}

// Configuration paths are relative to the installation, never the caller's cwd.
export function resolveWorkspace(runtime) {
 const home=studioHome(runtime), file=path.join(home,'STUDIO.json');
 let config={};
 if(fs.existsSync(file)) {
  try {config=JSON.parse(fs.readFileSync(file,'utf8'));} catch(error){throw Error(`Invalid Studio configuration ${file}: ${error.message}`);}
  if(!config||Array.isArray(config)||typeof config!=='object')throw Error(`Invalid Studio configuration ${file}: expected an object.`);
 }
 const resolve=(key,fallback)=>{
  const value=config[key]??fallback;
  if(typeof value!=='string'||!value.trim())throw Error(`STUDIO.json ${key} must be a nonempty path.`);
  return path.resolve(home,value);
 };
 return {home,runtime:resolve('runtime',path.relative(home,path.resolve(runtime))||'.'),projects:resolve('projects','projects'),library:resolve('library','library'),operations:resolve('operations','operations'),skills:resolve('skills','.agents/skills'),brands:resolve('brands','library/brand'),defaultBrand:config.defaultBrand??null};
}
