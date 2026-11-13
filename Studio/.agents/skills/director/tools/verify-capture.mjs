#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
const [file, probe='ffprobe', receipt]=process.argv.slice(2);
try {
 if(!file)throw new Error('Usage: node verify-capture.mjs <saved-video> [ffprobe-path] [new-receipt.json]');
 const absolute=path.resolve(file), before=fs.statSync(absolute);
 if(!before.isFile()||before.size===0)throw new Error('Saved capture must be a nonempty file.');
 const result=spawnSync(probe,['-v','error','-show_format','-show_streams','-of','json',absolute],{encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
 if(result.error||result.status!==0)throw new Error('Video inspection failed: '+(result.error?.message||result.stderr));
 const media=JSON.parse(result.stdout), video=media.streams?.find(s=>s.codec_type==='video');
 if(!video||!(video.width>0)||!(video.height>0))throw new Error('No decodable video stream dimensions.');
 const hash=crypto.createHash('sha256');
 for await(const chunk of fs.createReadStream(absolute))hash.update(chunk);
 const after=fs.statSync(absolute);
 if(before.size!==after.size||before.mtimeMs!==after.mtimeMs)throw new Error('Capture changed during verification; wait for download completion.');
 const output={verifiedAt:new Date().toISOString(),path:absolute,bytes:after.size,sha256:hash.digest('hex'),video:{codec:video.codec_name,width:video.width,height:video.height,duration:video.duration||media.format?.duration||null},checks:{fileExists:true,nonempty:true,videoMetadata:true,unchangedDuringInspection:true,framesVisuallyReviewed:false,audioReviewed:false},next:'Open this exact file and inspect frames; metadata verification does not establish visual correctness.'};
 const json=JSON.stringify(output,null,2)+'\n';
 if(receipt)fs.writeFileSync(path.resolve(receipt),json,{flag:'wx'});
 process.stdout.write(json);
} catch(error){console.error(error.message);process.exitCode=1;}
