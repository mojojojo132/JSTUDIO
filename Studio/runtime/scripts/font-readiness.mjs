import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {assertBrowserLaunchAllowed} from './browser-launch.mjs';
import {withRunReport} from './tool-run.mjs';
import {writeMeasuredReceipt} from './media-readiness.mjs';

// Executed in the browser. Two deliberately different fallback families reduce
// same-width false positives; bitmap comparisons catch equal-width substitutions.
export async function checkGlyphsInBrowser(fonts){
 const results=[];
 const fingerprint=(text,family,weight,style)=>{const c=document.createElement('canvas');c.width=256;c.height=160;const x=c.getContext('2d');x.font=`${style||'normal'} ${weight} 64px ${family}`;x.fillText(text,16,100);return `${x.measureText(text).width}:${c.toDataURL()}`;};
 for(let i=0;i<fonts.length;i++){
  const font=fonts[i],family=`StudioReadiness${i}`;
  const face=new FontFace(family,`url(${font.data})`,{weight:String(font.weight||400),style:font.style||'normal'});
  await face.load();document.fonts.add(face);await document.fonts.ready;
  const characters=[...new Set([...font.text])].filter(c=>!/[\s\u200b-\u200f\ufe00-\ufe0f]/u.test(c));
  const suspect=characters.filter(c=>['serif','monospace'].every(fallback=>fingerprint(c,`"${family}", ${fallback}`,font.weight||400,font.style)===fingerprint(c,fallback,font.weight||400,font.style)));
  results.push({family:font.family,weight:font.weight||400,style:font.style||'normal',loaded:face.status==='loaded',text:font.text,charactersChecked:characters.length,suspectedFallback:suspect});
 }
 return results;
}
export async function inspectFonts(projectRoot,input,{launch,chrome=process.env.PDOOM_CHROME||process.env.CHROME_PATH,platform=process.platform,env=process.env}={}){
 assertBrowserLaunchAllowed({platform,env});
 const root=await fs.realpath(projectRoot);
 if(!Array.isArray(input.fonts)||!input.fonts.length)throw Error('Provide fonts with path, family, weight and exact text');
 const fonts=[];
 for(const font of input.fonts){
  if(typeof font.text!=='string'||!font.text.trim()||!font.family)throw Error('Every font requires family and nonempty exact text');
  const file=await fs.realpath(path.resolve(root,font.path));const relative=path.relative(root,file);
  if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('Fonts must be inside the project');
  const bytes=await fs.readFile(file);if(!bytes.length)throw Error('Font file is empty');
  fonts.push({...font,path:relative,sha256:createHash('sha256').update(bytes).digest('hex'),data:`data:application/octet-stream;base64,${bytes.toString('base64')}`});
 }
 if(!launch){const puppeteer=await import('puppeteer-core');launch=options=>puppeteer.default.launch(options);}
 chrome||=platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined;
 if(!chrome)throw Error('Pass --chrome /absolute/path/to/browser to select an installed browser executable');
 const browser=await launch({headless:true,executablePath:chrome});let results;
 try{const page=await browser.newPage();await page.setContent('<!doctype html><html><body></body></html>');results=await page.evaluate(checkGlyphsInBrowser,fonts);}finally{await browser.close();}
 for(const font of fonts){if(createHash('sha256').update(await fs.readFile(path.join(root,font.path))).digest('hex')!==font.sha256)throw Error('Font changed during measurement');}
 return writeMeasuredReceipt(root,'font-readiness',{schemaVersion:1,kind:'exact-copy-font-readiness',createdAt:new Date().toISOString(),fonts:results.map((r,i)=>({...r,path:fonts[i].path,sha256:fonts[i].sha256})),passed:results.every(r=>r.loaded&&!r.suspectedFallback.length),approval:false,limitations:['Bitmap fallback comparison is a heuristic, not a complete font cmap or shaping audit.','Whitespace, zero-width controls and variation selectors are excluded. Ligatures, combining sequences and final layout need rendered review.','Passing confirms this supplied copy and loaded face only; it does not establish licensing or brand approval.']});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{const [project,input]=process.argv.slice(2);if(!project||!input)throw Error('Usage: font-readiness.mjs PROJECT ASSESSMENT.json');await withRunReport({directory:path.resolve(project),stage:'font-readiness'},async()=>{const result=await inspectFonts(project,JSON.parse(await fs.readFile(input,'utf8')));console.log(JSON.stringify(result,null,2));if(!result.receipt.passed)throw Error('Exact-copy font check found suspected fallback; see measured receipt');return result;});}catch(error){console.error(error.message);process.exitCode=1;}}
