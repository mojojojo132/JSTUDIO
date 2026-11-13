/** Advisory geometry from declared typography; no OCR or perceptual certification. */
export function assessReadability(input, measured) {
 if (!input || !Array.isArray(input.text) || !input.text.length) throw Error('readability.text requires at least one text sample');
 const positive=(value,name)=>{if(typeof value!=='number'||!Number.isFinite(value)||value<=0)throw Error(`readability.${name} must be finite and positive`);return value;};
 const masterWidth=positive(input.masterWidth,'masterWidth');
 const viewingWidth=positive(input.viewingWidth,'viewingWidth');
 const captureScale=positive(input.captureScale,'captureScale');
 const placementScale=positive(input.placementScale,'placementScale');
 const minimumCameraScale=positive(input.minimumCameraScale??1,'minimumCameraScale');
 const video=measured.streams.find(s=>s.type==='video');
 if(!video)throw Error('Readability requires a measured video stream');
 if(input.captureCssWidth!==undefined&&Math.abs(positive(input.captureCssWidth,'captureCssWidth')*captureScale-video.width)>1)throw Error('Declared capture scale/width disagrees with encoded video width');
 const text=input.text.map((sample,index)=>{
  if(!sample||typeof sample.label!=='string'||!sample.label.trim()||typeof sample.required!=='boolean')throw Error(`readability.text[${index}] needs label and required boolean`);
  const cssPx=positive(sample.cssPx,`text[${index}].cssPx`);
  const threshold=sample.minimumDisplayPx===undefined?null:positive(sample.minimumDisplayPx,`text[${index}].minimumDisplayPx`);
  const masterPx=cssPx*captureScale*placementScale*minimumCameraScale;
  const displayPx=masterPx*viewingWidth/masterWidth;
  return {label:sample.label,required:sample.required,cssPx,masterPx,displayPx,minimumDisplayPx:threshold,status:!sample.required?'incidental':threshold===null?'needs-review':displayPx<threshold?'below-target':'meets-declared-target'};
 });
 return {kind:'declared-text-geometry',masterWidth,viewingWidth,captureScale,placementScale,minimumCameraScale,text,approval:false,limitations:['Font sizes and placement are supplied declarations, not measured from video pixels.','Display pixels at the chosen viewing width are not typographic points or an accessibility guarantee.','Use the smallest camera scale while required text must be read; inspect contrast, actual glyphs, motion and reading time separately.']};
}
