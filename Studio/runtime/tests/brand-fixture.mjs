import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
export async function configureTestBrand(runtime){
 const parent=path.dirname(runtime);let home=runtime;
 try{await fs.access(path.join(parent,'STUDIO.json'));home=parent;}catch{}
 const configFile=path.join(home,'STUDIO.json');let config={};try{config=JSON.parse(await fs.readFile(configFile,'utf8'));}catch{}
 config.brands??='brand-packs';config.defaultBrand={id:'example',version:'1.0.0'};
 const pack=path.resolve(home,config.brands,'example/1.0.0');await fs.mkdir(pack,{recursive:true});
 const logo='<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>';
 await fs.writeFile(path.join(pack,'logo.svg'),logo);
 await fs.writeFile(path.join(pack,'brand.json'),JSON.stringify({schemaVersion:1,id:'example',version:'1.0.0',tokens:{background:'#FFFFFF',foreground:'#111111',primary:'#112233',secondary:'#445566',accent:'#778899',fontFamily:'Georgia'},assets:{logo:'logo.svg'},fonts:[],files:{'logo.svg':crypto.createHash('sha256').update(logo).digest('hex')}}));
 await fs.writeFile(configFile,JSON.stringify(config));return pack;
}
