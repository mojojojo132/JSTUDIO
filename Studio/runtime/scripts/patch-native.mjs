/** Apply reviewed native compatibility patches after installation. */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { patchStudioExport } from './patch-studio-export.mjs';
import { patchStudioBrand } from './patch-studio-brand.mjs';
import { patchStudioDiscovery } from './patch-studio-discovery.mjs';
import { patchStudioAssetCache } from './patch-studio-asset-cache.mjs';
import { patchStudioSelectLayer } from './patch-studio-select-layer.mjs';
import { patchStudioRenderSettings } from './patch-studio-render-settings.mjs';
import { patchStudioTemplateEntry } from './patch-studio-template-entry.mjs';
import { patchStudioMediaReadiness } from './patch-studio-media-readiness.mjs';
export function patchNative(packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '../node_modules/hyperframes')) {
  return { editorExport: patchStudioExport(packageDir), mediaReadiness: patchStudioMediaReadiness(packageDir), templateEntry: patchStudioTemplateEntry(packageDir), discovery: patchStudioDiscovery(packageDir), selectLayer: patchStudioSelectLayer(packageDir), brand: patchStudioBrand(packageDir), renderSettings: patchStudioRenderSettings(packageDir), assetCache: patchStudioAssetCache(packageDir) };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(patchNative(process.argv[2])));
