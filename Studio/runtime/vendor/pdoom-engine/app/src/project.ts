// Torq adapter: optional, explicit-duration project; upstream demo remains available.
export interface Project { version: 1; id: string; canvas?: { width: number; height: number }; colorMode?: 'flat' | 'cinematic'; shots: { id: string; scene: string; duration: number; params?: Record<string, unknown> }[]; audioAnalysis?: string; lyrics?: string; audio?: string }
export function validateProject(p: any): asserts p is Project {
  if (p?.version !== 1 || typeof p.id !== 'string' || !p.id.trim() || !Array.isArray(p.shots) || !p.shots.length) throw new Error('invalid project header');
  if (p.canvas !== undefined && (!p.canvas || typeof p.canvas !== 'object' || ['width','height'].some(k => !Number.isInteger(p.canvas[k]) || p.canvas[k] < 64 || p.canvas[k] > 4096 || p.canvas[k] % 2))) throw new Error('canvas width and height must be even integers from 64 to 4096');
  if (p.colorMode !== undefined && !['flat','cinematic'].includes(p.colorMode)) throw new Error('colorMode must be flat or cinematic');
  const ids = new Set<string>();
  for (const s of p.shots) {
    if (!s || typeof s.id !== 'string' || !/^[\w-]+$/.test(s.id) || ids.has(s.id) || typeof s.scene !== 'string' || !/^[\w-]+$/.test(s.scene) || !Number.isFinite(s.duration) || s.duration <= 0) throw new Error('invalid or duplicate shot');
    ids.add(s.id);
  }
  for (const k of ['audioAnalysis', 'lyrics', 'audio']) if (p[k] !== undefined) {
    if (typeof p[k] !== 'string' || !p[k]) throw new Error('asset URL must be a nonempty string');
    let value = p[k];
    for (let i=0;i<5 && value.includes('%');i++) { try { value=decodeURIComponent(value); } catch { throw new Error('invalid asset URL encoding'); } }
    if (value.includes('%') || value.includes('\\') || /[\x00-\x20]/.test(value) || value.split(/[/?#]/).includes('..')) throw new Error('asset URL traversal or invalid separator');
    const base = new URL('http://pdoom.local/'); const url = new URL(value, base);
    if (url.origin !== base.origin || /^(?:[a-z]+:|\/\/)/i.test(value)) throw new Error('project assets must use local application URLs');
  }
}
export let project: Project | null = null;
export async function loadProject() {
  const url = new URLSearchParams(location.search).get('project');
  if (!url) return;
  const res = await fetch(url); if (!res.ok) throw new Error('project unavailable: ' + url);
  const p = await res.json(); validateProject(p); project = p;
}
export const projectDuration = () => project!.shots.reduce((n,s) => n + s.duration, 0);
