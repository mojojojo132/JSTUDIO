export type TextDiagnostic = { code: 'width' | 'safe-area' | 'glyph' | 'coverage-unavailable'; message: string };
const diagnostics = new Map<string, { code: TextDiagnostic['code']; message: string; text: string; count: number }>();
let dropped = 0;
/** Bounded per-page evidence. Getter returns copies; overflow never silently disappears. */
export function textDiagnosticSnapshot() {
  return { available: true, limit: 100, droppedOccurrences: dropped, diagnostics: [...diagnostics.values()].map(row => ({...row})), scope: 'Only calls to checkText/brandText; no raw Canvas interception or perceptual approval.' };
}
export function clearTextDiagnostics() { diagnostics.clear(); dropped = 0; }
function recordDiagnostic(text: string, warning: TextDiagnostic) {
  const displayText = text.slice(0, 500), message = warning.message.slice(0, 500);
  const key = JSON.stringify([warning.code, message, displayText]);
  const existing = diagnostics.get(key);
  if (existing) { existing.count++; return; }
  if (diagnostics.size >= 100) { dropped++; return; }
  diagnostics.set(key, {code: warning.code, message, text: displayText, count: 1});
}
export type TextCheckOptions = {
  maxWidth?: number;
  safeArea?: { x: number; y: number; width: number; height: number };
  /** Supply a font-specific cmap predicate; absence means coverage is unknown. */
  hasGlyph?: (character: string) => boolean;
  strict?: boolean;
  report?: (diagnostic: TextDiagnostic) => void;
};

/** Opt-in single-line Canvas2D diagnostics. Never changes copy, scales or wraps text.
 * Bounds use the current transform and measured ink, not shadows/strokes or clipping.
 * Cmap coverage cannot prove shaping or perceptual quality. */
export function checkText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, options: TextCheckOptions = {}): TextDiagnostic[] {
  const warnings: TextDiagnostic[] = [];
  const add = (code: TextDiagnostic['code'], message: string) => warnings.push({ code, message });
  const m = ctx.measureText(text);
  if (options.maxWidth !== undefined) {
    if (!Number.isFinite(options.maxWidth) || options.maxWidth <= 0) throw Error('maxWidth must be positive');
    if (m.width > options.maxWidth) add('width', `Text advance ${m.width.toFixed(2)} exceeds ${options.maxWidth} canvas units.`);
  }
  if (options.safeArea) {
    const a = options.safeArea;
    if (![a.x, a.y, a.width, a.height].every(Number.isFinite) || a.width <= 0 || a.height <= 0) throw Error('safeArea must be a finite positive rectangle');
    const tr = ctx.getTransform();
    const left = x - m.actualBoundingBoxLeft, right = x + m.actualBoundingBoxRight;
    const top = y - m.actualBoundingBoxAscent, bottom = y + m.actualBoundingBoxDescent;
    const corners = [[left, top], [right, top], [left, bottom], [right, bottom]].map(([px, py]) => ({ x: tr.a * px! + tr.c * py! + tr.e, y: tr.b * px! + tr.d * py! + tr.f }));
    if (corners.some(p => p.x < a.x || p.y < a.y || p.x > a.x + a.width || p.y > a.y + a.height)) add('safe-area', 'Transformed text ink exceeds the supplied canvas-coordinate safe area.');
  }
  if (options.hasGlyph) {
    const missing = [...new Set(Array.from(text).filter(ch => !/\s/u.test(ch) && !options.hasGlyph!(ch)))];
    if (missing.length) add('glyph', `Font coverage missing: ${missing.join(' ')}`);
  } else add('coverage-unavailable', 'Font glyph coverage was not supplied; Canvas font loading alone does not establish coverage.');
  for (const warning of warnings) { recordDiagnostic(text, warning); options.report?.(warning); }
  if (options.strict && warnings.length) throw Error(warnings.map(w => `${w.code}: ${w.message}`).join('\n'));
  return warnings;
}

/** Draw with the context's selected brand font and return optional diagnostics. */
export function brandText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, options: TextCheckOptions = {}): TextDiagnostic[] {
  const warnings = checkText(ctx, text, x, y, options);
  ctx.fillText(text, x, y);
  return warnings;
}
