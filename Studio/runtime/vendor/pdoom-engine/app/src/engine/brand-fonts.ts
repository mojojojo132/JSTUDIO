/** Validate the project snapshot contract before requesting any font bytes. */
export function selectBrandFonts(brand: unknown): {path:string;weight:number}[] {
  if (!brand || typeof brand !== 'object' || !Array.isArray((brand as {fonts?:unknown}).fonts)) throw Error('Pinned brand fonts are missing.');
  const fonts = (brand as {fonts:{path:string;weight:number}[]}).fonts;
  if (fonts.length === 0) {
    const family = (brand as {tokens?:{fontFamily?:unknown}}).tokens?.fontFamily;
    if (typeof family !== 'string' || !family.trim()) throw Error('An explicit system font family is required when the pinned pack has no font files.');
    return [];
  }
  return [400,700].map(weight => {
    const matches = fonts.filter(font => font && font.weight === weight);
    if (!matches.length) throw Error(`Pinned brand requires a font at weight ${weight}.`);
    const font = matches[0]!;
    if (typeof font.path !== 'string' || !font.path || font.path.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(font.path) || /[\\\x00-\x1f'"<>]/.test(font.path) || font.path.split('/').some(part=>part==='.'||part==='..'||part==='')) throw Error('Unsafe pinned font path.');
    return {path:font.path,weight};
  });
}

/** Encode each filesystem segment once; literal percent, spaces, # and ? cannot become URL syntax. */
export const brandAssetURL = (path: string): string => '/brand/' + path.split('/').map(encodeURIComponent).join('/');
