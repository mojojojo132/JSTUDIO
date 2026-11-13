import path from 'node:path';
import {hf,root} from './common.mjs';
import {launch} from './launch.mjs';
import {resolveWorkspace} from './workspace.mjs';
try{
 const [command,...args]=process.argv.slice(2);
 if(command==='preview'&&(!args[0]||!args[0].startsWith('-')))await launch(args);
 else {
  const {projects}=resolveWorkspace(root);
  await hf([command,...args.map(arg=>/^projects[\\/]/.test(arg)?path.resolve(projects,arg.slice(9)):arg)]);
 }
}catch(e){console.error(e.message);process.exitCode=1;}
