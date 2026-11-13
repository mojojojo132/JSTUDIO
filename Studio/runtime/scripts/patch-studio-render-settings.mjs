/** Keep header export aligned with native Renders settings. Pinned upstream patch. */
import {readFileSync,writeFileSync,renameSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
export const renderSignatures = [
  [
    "dist/studio/index.js",
    [
      [
        "fps: [24, 30, 60].includes(parsed.fps) ? parsed.fps : 30",
        "fps: [24, 30, 60].includes(parsed.fps) ? parsed.fps : 30,\n        resolution: [\"auto\", \"1080p\", \"4k\"].includes(parsed.resolution) ? parsed.resolution : \"auto\""
      ],
      [
        "return { format: \"mp4\", quality: \"standard\", fps: 30 };",
        "return { format: \"mp4\", quality: \"standard\", fps: 30, resolution: \"auto\" };"
      ],
      [
        "function persistRenderSettings(format, quality, fps) {",
        "function persistRenderSettings(format, quality, fps, resolution = getPersistedRenderSettings().resolution) {"
      ],
      [
        "JSON.stringify({ format, quality, fps })",
        "JSON.stringify({ format, quality, fps, resolution })"
      ],
      [
        "const [resolution, setResolution] = useState145(\"auto\");",
        "const [resolution, setResolution] = useState145(scaleApplies(persisted.resolution, compositionDimensions) ? persisted.resolution : \"auto\");"
      ],
      [
        "onCommit: (next) => setResolution(next)",
        "onCommit: (next) => { setResolution(next); persistRenderSettings(format, quality, fps, next); }"
      ],
      [
        "await renderQueue.startRender(void 0);",
        "const settings = getPersistedRenderSettings();\n                await renderQueue.startRender({ ...settings, resolution: resolveResolution(scaleApplies(settings.resolution, compositionDimensions) ? settings.resolution : \"auto\", compositionDimensions), variables: usePreviewVariablesStore.getState().values ?? void 0 });"
      ]
    ]
  ],
  [
    "dist/studio/assets/index-2GgHjQq-.js",
    [
      [
        "fps:[24,30,60].includes(t.fps)?t.fps:30",
        "fps:[24,30,60].includes(t.fps)?t.fps:30,resolution:[\"auto\",\"1080p\",\"4k\"].includes(t.resolution)?t.resolution:\"auto\""
      ],
      [
        "return{format:\"mp4\",quality:\"standard\",fps:30}",
        "return{format:\"mp4\",quality:\"standard\",fps:30,resolution:\"auto\"}"
      ],
      [
        "function RL(e,t,n){",
        "function RL(e,t,n,r=T_e().resolution){"
      ],
      [
        "JSON.stringify({format:e,quality:t,fps:n})",
        "JSON.stringify({format:e,quality:t,fps:n,resolution:r})"
      ],
      [
        "[h,f]=m.useState(\"auto\"),[g,p]=m.useState(o.fps)",
        "[h,f]=m.useState(j5e(o.resolution,n)?o.resolution:\"auto\"),[g,p]=m.useState(o.fps)"
      ],
      [
        "disabled:t,onCommit:w=>f(w)",
        "disabled:t,onCommit:w=>{f(w),RL(l,u,g,w)}"
      ],
      [
        "await B.startRender(void 0)",
        "await B.startRender((()=>{const settings=T_e();return{...settings,resolution:QW(j5e(settings.resolution,gt)?settings.resolution:\"auto\",gt),variables:vS.getState().values??void 0}})())"
      ]
    ]
  ]
];
export function patchStudioRenderSettings(packageDir) {
 const version=JSON.parse(readFileSync(resolve(packageDir,'package.json'),'utf8')).version;
 if(version!=='0.8.77')throw Error(`Editor render-settings compatibility patch requires version 0.8.77; found ${version}.`);
 const updates=renderSignatures.map(([relative,pairs])=>{
  const target=resolve(packageDir,relative),original=readFileSync(target,'utf8');let source=original;
  for(const [before,after] of pairs){
   if(source.split(after).length-1===1)continue;
   if(source.split(before).length-1!==1)throw Error(`Unexpected render settings signature in ${relative}; no files changed.`);
   source=source.replace(before,after);
  }
  return {target,source,changed:source!==original};
 });
 for(const {target,source,changed} of updates)if(changed){const temp=target+'.torq-render-'+process.pid+'.tmp';writeFileSync(temp,source,{mode:statSync(target).mode});renameSync(temp,target);}
 return updates.map(({target,changed})=>({target,changed}));
}
