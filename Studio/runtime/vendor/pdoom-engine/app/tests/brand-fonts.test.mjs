import test from 'node:test';import assert from 'node:assert/strict';
import {selectBrandFonts,brandAssetURL} from '../src/engine/brand-fonts.ts';
const good={fonts:[{path:'assets/regular.ttf',weight:400},{path:'assets/bold.ttf',weight:700}]};
test('brand aliases select only complete pinned regular/bold fonts',()=>assert.deepEqual(selectBrandFonts(good),good.fonts));
test('missing and incomplete packs fail instead of falling back',()=>{for(const value of [null,{}, {fonts:[]},{fonts:[good.fonts[0]]}])assert.throws(()=>selectBrandFonts(value));});
test('font paths cannot escape the pinned snapshot or load remote assets',()=>{for(const path of ['../bold.ttf','assets/../bold.ttf','https://example.com/font.ttf','/font.ttf','assets//font.ttf','C:/font.ttf','fonts/..\\regular.ttf'])assert.throws(()=>selectBrandFonts({fonts:[{path,weight:400},good.fonts[1]]}));});

test('explicit system-font pack needs no bundled fallback',()=>assert.deepEqual(selectBrandFonts({fonts:[],tokens:{fontFamily:'sans-serif'}}),[]));

test('font locations follow safe pack-relative paths, not a fixed assets folder',()=>{for(const path of ['fonts/regular.ttf','assets/fonts/regular.ttf','fonts/Regular Font.ttf','fonts/Regular%20Font.ttf']){assert.equal(selectBrandFonts({fonts:[{path,weight:400},good.fonts[1]]})[0].path,path);}});
test('font fetch URLs encode filename syntax without decoding traversal',()=>{assert.equal(brandAssetURL('fonts/Regular Font.ttf'),'/brand/fonts/Regular%20Font.ttf');assert.equal(brandAssetURL('fonts/Regular%20Font.ttf'),'/brand/fonts/Regular%2520Font.ttf');assert.equal(brandAssetURL('fonts/%2e%2e/regular.ttf'),'/brand/fonts/%252e%252e/regular.ttf');assert.equal(brandAssetURL('fonts/regular#1?.ttf'),'/brand/fonts/regular%231%3F.ttf');});

test('duplicate weights select the first declared file deterministically',()=>assert.deepEqual(selectBrandFonts({fonts:[...good.fonts,{path:'fonts/alternate.ttf',weight:400}]}),good.fonts));
