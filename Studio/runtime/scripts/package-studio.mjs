import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const inside = (root, target) => target === root || target.startsWith(root + path.sep);
const blocked = name => /^(node_modules|\.git|\.runtime|\.cache|cache|caches|backups?|projects|coverage|dist|\.DS_Store|__pycache__|\.venv)$/i.test(name)
  || /^(\.env(?:\.|$)|.*\.(?:pem|key|p12|pfx|ses|log)$)|(?:secret|credential|token)[-_]?s?\./i.test(name);
const rootFiles = /^(?:AGENTS|AI-AUTHORING|CLAUDE|README|ROUTES|SETUP-PROMPT|START-HERE|PACKAGING|PRODUCTION|RESEARCH-REVIEW)\.md$|^package(?:-lock)?\.json$|^(?:Setup|Check|Launch) [\w -]+\.(?:command|cmd)$/;
const runtimeFiles = /^(?:[A-Z][A-Z0-9-]*\.md|FILES\.sha256|package(?:-lock)?\.json|runtime-manifest\.json|requirements-[\w-]+\.txt|(?:Setup|Check|Launch) [\w -]+\.(?:command|cmd))$/;
const profiles = ['DEFAULTS.md', 'WORKFLOW.md', 'CREATIVE-DIRECTION.md', 'PLATFORM-EXPORTS.md'];

/** Build an explicit distribution inventory. User projects and media are never selected. */
export async function packageStudio({ source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), output, zip = false } = {}) {
  source = await fs.realpath(source);
  if (!output) throw new Error('Provide --output outside the studio workspace.');
  output = path.resolve(output);
  // Resolve existing ancestors before writing, including output directories reached through symlinks.
  let ancestor = output;
  while (true) {
    try { const real = await fs.realpath(ancestor); output = path.join(real, path.relative(ancestor, output)); break; }
    catch (error) { if (error.code !== 'ENOENT') throw error; const parent = path.dirname(ancestor); if (parent === ancestor) throw error; ancestor = parent; }
  }
  if (inside(path.dirname(source), output)) throw new Error('Output must be outside the source workspace and its content/brand siblings.');
  const config = JSON.parse(await fs.readFile(path.join(source, 'STUDIO.json'), 'utf8'));
  const files = new Map();
  const excluded = [];
  files.set('AGENTS.md', {bytes: Buffer.from('# JStudio\n\nFor video requests, read Studio/AGENTS.md and Studio/.agents/skills/director/SKILL.md. Resolve Studio/STUDIO.json. Director owns the complete film; Animator authors original motion; Editor handles picture, captions, sound and export. Make routine choices and present one complete candidate for approval. Keep projects and client assets outside runtime.\n'), mode: 0o644});
  files.set('README.md', {bytes: Buffer.from('# JStudio\n\nOpen this folder in your AI host and describe the video. Begin with Studio/START-HERE.md for installation and Studio/PRODUCTION.md for the workflow. Keep Studio, Studio Content and Studio Brand Packs together. This alpha source distribution downloads pinned dependencies during setup; it contains no AI account, user films or machine-specific runtime.\n'), mode: 0o644});
  async function collect(from, destination) {
    const stat = await fs.lstat(from);
    if (stat.isSymbolicLink()) { excluded.push({ path: destination, reason: 'symlink' }); return; }
    if (blocked(path.basename(from))) { excluded.push({ path: destination, reason: 'excluded name' }); return; }
    if (stat.isDirectory()) {
      for (const name of (await fs.readdir(from)).sort()) await collect(path.join(from, name), `${destination}/${name}`);
    } else if (stat.isFile()) {
      const bytes = await fs.readFile(from);
      files.set(destination, { bytes, mode: stat.mode & 0o777 });
    }
  }
  async function safeRoot(from, destination) {
    // Reject a symlink in any source ancestor, not just the selected leaf.
    let current = path.resolve(from);
    while (current !== path.dirname(current)) {
      if ((await fs.lstat(current)).isSymbolicLink()) throw new Error(`Selected source traverses a symlink: ${from}`);
      current = path.dirname(current);
    }
    await collect(from, destination);
  }
  for (const name of (await fs.readdir(source)).sort()) if (rootFiles.test(name)) await collect(path.join(source, name), `Studio/${name}`);
  await safeRoot(path.join(source, '.agents/skills'), 'Studio/.agents/skills');
  const runtime = path.resolve(source, config.runtime || 'runtime');
  for (const name of (await fs.readdir(runtime)).sort()) {
    if (runtimeFiles.test(name) || ['scripts', 'tests', 'licenses', 'vendor', 'project-templates', 'starter'].includes(name)) await safeRoot(path.join(runtime, name), `Studio/runtime/${name}`);
  }
  // Vendored payload inventories are exact dependency contracts. Restore only
  // their pinned files beneath otherwise-excluded projects/ directories.
  for (const [manifestPath, manifestFile] of [...files]) {
    if (!manifestPath.startsWith('Studio/runtime/vendor/') || !manifestPath.endsWith('/SOURCE-SHA256.json')) continue;
    const inventory = JSON.parse(manifestFile.bytes.toString('utf8'));
    if (!inventory || Array.isArray(inventory) || typeof inventory !== 'object') throw new Error(`Invalid vendor inventory: ${manifestPath}`);
    const destinationRoot = path.posix.dirname(manifestPath);
    const sourceRoot = path.resolve(runtime, destinationRoot.slice('Studio/runtime/'.length));
    for (const [relative, expected] of Object.entries(inventory)) {
      const parts = relative.split('/');
      if (!relative || relative.includes('\\') || path.posix.isAbsolute(relative) || parts.some(part => !part || part === '.' || part === '..' || (part !== 'projects' && blocked(part))) || !/^[a-f0-9]{64}$/.test(expected)) throw new Error(`Unsafe vendor inventory entry: ${relative}`);
      const destination = `${destinationRoot}/${relative}`;
      await safeRoot(path.join(sourceRoot, ...parts), destination);
      const selected = files.get(destination);
      if (!selected || hash(selected.bytes) !== expected) throw new Error(`Vendor inventory checksum mismatch: ${destination}`);
    }
    // Do not distribute untracked files accidentally added to an engine payload.
    const expectedPaths = new Set([...Object.keys(inventory).map(name => `${destinationRoot}/${name}`), manifestPath]);
    for (const name of [...files.keys()]) if (name.startsWith(destinationRoot + '/') && !expectedPaths.has(name)) {
      files.delete(name);
      excluded.push({ path: name, reason: 'not in pinned vendor inventory' });
    }
  }
  const profile = path.resolve(source, config.operations);
  for (const name of profiles) await safeRoot(path.join(profile, name), `Studio Content/default/profile/${name}`);
  const templates = path.resolve(source, config.library, 'templates');
  for (const name of (await fs.readdir(templates)).sort()) if (/^[A-Z][A-Z0-9-]*\.md$/.test(name)) await safeRoot(path.join(templates, name), `Studio Content/default/library/templates/${name}`);
  const brand = config.defaultBrand;
  if (!brand || !/^[a-z0-9][a-z0-9-]*$/.test(brand.id) || !/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/.test(brand.version)) throw new Error('A valid defaultBrand id and pinned version are required.');
  await safeRoot(path.resolve(source, config.brands, brand.id, brand.version), `Studio Brand Packs/${brand.id}/${brand.version}`);
  const portableConfig = { ...config, releaseAcceptance: 'pending', runtime: 'runtime', skills: '.agents/skills', projects: '../Studio Content/default/projects', library: '../Studio Content/default/library', operations: '../Studio Content/default/profile', brands: '../Studio Brand Packs' };
  files.set('Studio/STUDIO.json', { bytes: Buffer.from(JSON.stringify(portableConfig, null, 2) + '\n'), mode: 0o644 });
  const runtimeChecksums = [...files].filter(([name]) => name.startsWith('Studio/runtime/') && name !== 'Studio/runtime/FILES.sha256').sort(([a], [b]) => a.localeCompare(b)).map(([name, item]) => `${hash(item.bytes)}  ${name.slice('Studio/runtime/'.length)}`).join('\n') + '\n';
  files.set('Studio/runtime/FILES.sha256', { bytes: Buffer.from(runtimeChecksums), mode: 0o644 });
  const manifest = {
    schemaVersion: 1, name: 'JStudio', verification: 'Inventory and checksums only; fresh-machine execution not verified.',
    emptyDirectories: ['Studio Content/default/projects', 'Studio Content/default/library/media'],
    files: [...files].sort(([a], [b]) => a.localeCompare(b)).map(([name, item]) => ({ path: name, bytes: item.bytes.length, sha256: hash(item.bytes), mode: item.mode })), excluded,
  };
  await fs.mkdir(output, { recursive: true });
  const manifestText = JSON.stringify(manifest, null, 2) + '\n';
  const checksumText = manifest.files.map(file => `${file.sha256}  ${file.path}`).join('\n') + '\n';
  await fs.writeFile(path.join(output, 'package-manifest.json'), manifestText);
  await fs.writeFile(path.join(output, 'SHA256SUMS'), checksumText);
  if (zip) {
    const archive = path.join(output, 'JStudio.zip');
    try { await fs.access(archive); throw new Error(`Refusing to overwrite ${archive}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const staging = await fs.mkdtemp(path.join(os.tmpdir(), 'jstudio-package-'));
    try {
      for (const [name, item] of files) { const target = path.join(staging, name); await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, item.bytes, { mode: item.mode }); }
      for (const dir of manifest.emptyDirectories) await fs.mkdir(path.join(staging, dir), { recursive: true });
      await fs.writeFile(path.join(staging, 'package-manifest.json'), manifestText);
      await fs.writeFile(path.join(staging, 'SHA256SUMS'), checksumText);
      // No shell interpolation, source traversal, or dependency install during packaging.
      execFileSync('zip', ['-q', '-r', archive, '.'], { cwd: staging, stdio: 'pipe' });
      await fs.writeFile(path.join(output, 'JStudio.zip.sha256'), `${hash(await fs.readFile(archive))}  JStudio.zip\n`);
    } catch (error) { await fs.rm(archive, { force: true }); throw error; }
    finally { await fs.rm(staging, { recursive: true, force: true }); }
  }
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes('--help')) console.log('node runtime/scripts/package-studio.mjs --output /outside/workspace/release [--zip]\nDefault: write inventory and checksums only. --zip requires the zip executable.');
  else {
    try {
      let output; let zip = false;
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--output' && args[i + 1] && !args[i + 1].startsWith('--')) output = args[++i];
        else if (args[i] === '--zip') zip = true;
        else if (args[i] !== '--dry-run') throw new Error(`Unknown or incomplete argument: ${args[i]}`);
      }
      const manifest = await packageStudio({ output, zip });
      console.log(`${zip ? 'Packaged' : 'Inventoried'} ${manifest.files.length} files. Output: ${output}`);
    } catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
