// Optional free-form 2D example: identical choreography, project-pinned identity.
import type * as THREE from 'three';
import {Scene,type Frame} from '../engine/scene';
import {brandAssetURL} from '../engine/brand-fonts';
import {Layer2D,W,H} from '../engine/gl';
export default class BrandShowcase extends Scene {
 private layer=new Layer2D(); private logo=new Image(); private brand:any;
 override async init(){const r=await fetch('/brand/brand.json');if(!r.ok)throw Error('Pinned brand required');this.brand=await r.json();this.logo.src=brandAssetURL(this.brand.assets.logo);await this.logo.decode();}
 render(f:Frame,out:THREE.WebGLRenderTarget){
  const b=this.brand.tokens,c=this.layer.ctx,t=f.lt;
  this.layer.clear(b.background);
  // This optional demo contains its landscape artwork; custom scenes compose directly in W/H.
  const fit=Math.min(W/1920,H/1080);c.save();c.translate((W-1920*fit)/2,(H-1080*fit)/2);c.scale(fit,fit);
  const ease=(x:number)=>1-Math.pow(1-Math.max(0,Math.min(1,x)),3);
  const intro=ease(t/1.2),settle=ease((t-2.1)/1.4),reveal=ease((t-4.5)/1.1);
  c.save();c.globalAlpha=intro;c.drawImage(this.logo,150,95,140,140*this.logo.naturalHeight/this.logo.naturalWidth);c.restore();
  // Offset cards gather into a measured editorial frame; all movement derives from time.
  for(let i=0;i<5;i++){const e=ease((t-.25-i*.12)/1.4),x=210+i*285,y=650+(1-e)*380;c.save();c.translate(x,y);c.rotate((1-settle)*(i-2)*.035);c.fillStyle=i%2?b.secondary:b.primary;c.fillRect(0,0,240,120);c.fillStyle=b.background;c.globalAlpha=.8;c.fillRect(28,28,100+20*i,5);c.fillRect(28,52,140,5);c.restore();}
  c.save();c.globalAlpha=intro;c.fillStyle=b.foreground;c.font=`${this.brand.fonts.length?'78px BrandBold':`bold 78px "${b.fontFamily}"`}`;c.fillText(String(this.ctx.params.title??'One idea. Beautifully told.'),150,390+(1-intro)*45);c.font=this.brand.fonts.length?'32px Brand':`32px "${b.fontFamily}"`;c.fillStyle=b.secondary;c.fillText(String(this.ctx.params.subtitle??'Motion with purpose. Editing with precision.'),155,460);c.restore();
  c.fillStyle=b.accent;c.fillRect(150,525,1480*settle,6);
  c.save();c.globalAlpha=reveal;c.fillStyle=b.foreground;c.font=this.brand.fonts.length?'24px Brand':`24px "${b.fontFamily}"`;c.fillText('ENGINEERING PREVIEW · EDITABLE SOURCE · PROJECT-PINNED BRAND',150,960);c.restore();
  c.restore();
  this.ctx.comp.draw(this.ctx.renderer,this.layer.upload(),out,{mode:'replace'});return {bloom:0,halation:0,grain:0,ca:0,vignette:0,hud:0};
 }
}
