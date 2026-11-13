import fs from 'node:fs/promises';import path from 'node:path';
// Explicit package-owned test directories only; do not traverse dependencies or user files.
export async function directorNodeTests(director){
 const required=path.join(director,'tools/animation-handoff.test.mjs');
 if(!(await fs.lstat(required)).isFile())throw Error('Bundled animation handoff test is missing');
 const tests=[];
 for(const relative of ['tools','tools/tests']){
  const dir=path.join(director,relative);
  for(const e of await fs.readdir(dir,{withFileTypes:true}))if(e.isFile()&&e.name.endsWith('.test.mjs'))tests.push(path.join(dir,e.name));
 }
 return tests.sort();
}
