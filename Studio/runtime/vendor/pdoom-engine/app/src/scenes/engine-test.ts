// Neutral geometry-only technical fixture. No brand assets or creative approval.
import type * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { Layer2D } from '../engine/gl';
export default class EngineTest extends Scene {
  private layer = new Layer2D();
  override async init() {
    // Explicit missing-asset negative fixture remains supported without any default logo.
    if (this.ctx.params.logo) { const image = new Image(); image.src = String(this.ctx.params.logo); await image.decode(); }
  }
  render(f: Frame, out: THREE.WebGLRenderTarget) {
    if (this.ctx.params.failAt !== undefined && f.lt >= Number(this.ctx.params.failAt)) throw new Error('intentional QA render failure');
    this.layer.clear('#EEEEEE'); const c = this.layer.ctx;
    const x=240+1440*Number(this.ctx.params.travelScale ?? 1)*(0.5-0.5*Math.cos(Math.PI*Math.min(1,f.p)));
    c.fillStyle='#888888'; c.fillRect(180,610,1560,12);
    c.fillStyle='#222222'; c.beginPath(); c.arc(x,616,55,0,Math.PI*2); c.fill();
    this.ctx.comp.draw(this.ctx.renderer,this.layer.upload(),out,{mode:'replace'});
    return {bloom:0,halation:0,grain:0,ca:0,vignette:0,hud:0};
  }
}
