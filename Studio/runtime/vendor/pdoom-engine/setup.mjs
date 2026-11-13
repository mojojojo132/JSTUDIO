// Installs only the exact app/package-lock.json dependencies into this directory.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const [major,minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 12)) throw new Error('Node.js 22.12+ or 24+ is required');
const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['ci', '--no-audit', '--no-fund'], {cwd:fileURLToPath(new URL('./app/',import.meta.url)),stdio:'inherit',shell:process.platform==='win32'});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
