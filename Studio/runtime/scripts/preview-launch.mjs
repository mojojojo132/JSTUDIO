import {assertBrowserLaunchAllowed} from './browser-launch.mjs';
/** Keep the editor server available without implicitly launching an OS browser in a restricted host. */
export function previewLaunchArguments(args,{platform=process.platform,env=process.env}={}) {
 if(args[0]!=='preview'||platform!=='darwin'||env.CODEX_SANDBOX!=='seatbelt')return args;
 if(args.some(a=>['--help','-h','--status','--stop','--list','--selection','--context','--kill-all'].includes(a)))return args;
 const noOpen=args.includes('--no-open')||args.includes('--open=false');
 if(noOpen&&args.some(a=>a==='--open'||a==='--open=true'))throw Error('Conflicting preview browser-open options');
 const explicitOpen=args.some(a=>a==='--open'||a==='--open=true'||a==='--browser-path'||a.startsWith('--browser-path='));
 if(explicitOpen&&!noOpen)assertBrowserLaunchAllowed({platform,env});
 return noOpen?args:[...args,'--no-open'];
}
