import {hf} from './common.mjs';
const [command,...args]=process.argv.slice(2);
try { if(!['preview','check','render'].includes(command)) throw Error('Expected preview, check or render.'); await hf([command,process.cwd(),...args],{cwd:process.cwd()}); } catch(error) {console.error(error.message);process.exitCode=1;}
