#!/usr/bin/env node
// Local, read-only preview/session discovery. No browser tab is opened or closed.
import fs from 'node:fs/promises';
import path from 'node:path';

const LOCAL = new Set(['127.0.0.1', 'localhost']);
const timeout = 2500;
function localUrl(raw) {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol) || !LOCAL.has(url.hostname)) throw Error('Preview must be a local HTTP URL');
  return url;
}
async function fetchJson(url) {
  const response = await fetch(url, {signal: AbortSignal.timeout(timeout)});
  if (!response.ok) throw Error(`HTTP ${response.status}`);
  return response.json();
}
async function observe(receipt) {
  const project = path.resolve(receipt.project);
  if (!(await fs.stat(project)).isDirectory()) throw Error('Project directory is missing');
  const preview = localUrl(receipt.previewUrl);
  let previewHealth = {ok: false};
  try {
    const response = await fetch(preview, {signal: AbortSignal.timeout(timeout)});
    previewHealth = {ok: response.ok, status: response.status};
  } catch (error) { previewHealth.error = error.message; }
  let tab = {status: 'not checked', matches: []};
  if (receipt.browserSession) {
    try {
      const session = JSON.parse(await fs.readFile(receipt.browserSession, 'utf8'));
      if (!Number.isInteger(session.port) || session.port < 1 || session.port > 65535) throw Error('Invalid browser-session port');
      if (session.status !== 'ready') throw Error(`Browser session is ${session.status}`);
      const tabs = await fetchJson(`http://127.0.0.1:${session.port}/json`);
      if (!Array.isArray(tabs)) throw Error('Browser tab list is invalid');
      // Studio selects projects in the URL fragment; another project is not a match.
      const normalize = value => new URL(value).href;
      const expected = normalize(preview.href);
      const matches = tabs.filter(item => {
        if (item.type !== 'page' || typeof item.url !== 'string') return false;
        try { return normalize(item.url) === expected; } catch { return false; }
      })
        .map(item => ({id: item.id, title: item.title, url: item.url}));
      tab = {status: matches.length === 1 ? 'one matching tab' : matches.length === 0 ? 'no matching tab' : 'duplicate matching tabs', matches};
    } catch (error) { tab = {status: 'unavailable', error: error.message, matches: []}; }
  }
  return {...receipt, project, previewUrl: preview.href, checkedAt: new Date().toISOString(), previewHealth, tab};
}
async function main() {
  const [mode, first, second, third, fourth, fifth] = process.argv.slice(2);
  let receiptPath, receipt;
  if (mode === 'record') {
    if (!first || !second || !third || !fourth) throw Error('Usage: preview-handoff.mjs record <project> <local-preview-url> <receipt.json> <checkpoint> [browser-session.json]');
    receiptPath = path.resolve(third);
    receipt = {version: 1, project: path.resolve(first), previewUrl: second, checkpoint: fourth, browserSession: fifth ? path.resolve(fifth) : null};
  } else if (mode === 'check') {
    if (!first) throw Error('Usage: preview-handoff.mjs check <receipt.json>');
    receiptPath = path.resolve(first);
    receipt = JSON.parse(await fs.readFile(receiptPath, 'utf8'));
    if (receipt.version !== 1) throw Error('Unsupported receipt version');
  } else throw Error('Use record or check');
  const result = await observe(receipt);
  await fs.mkdir(path.dirname(receiptPath), {recursive: true});
  const temp = `${receiptPath}.tmp-${process.pid}`;
  await fs.writeFile(temp, JSON.stringify(result, null, 2) + '\n');
  await fs.rename(temp, receiptPath);
  console.log(JSON.stringify({receipt: receiptPath, project: result.project, previewHealth: result.previewHealth, tab: result.tab.status, checkpoint: result.checkpoint}));
  if (!result.previewHealth.ok) process.exitCode = 2;
}
main().catch(error => { console.error(`preview handoff: ${error.message}`); process.exitCode = 1; });
