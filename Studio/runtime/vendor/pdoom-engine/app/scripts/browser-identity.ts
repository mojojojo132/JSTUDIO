/** Effective identity from each launched browser, not the guessed default installation. */
import { appendFileSync, readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { Browser } from 'playwright-core';
import type { Page } from 'playwright-core';
export async function recordTextDiagnostics(page: Page) {
  const target = process.env.STUDIO_BROWSER_TELEMETRY;
  if (!target) return;
  let value;
  try { value = await page.evaluate(() => (window as any).__pdoom?.textDiagnostics?.() ?? {available:false, unavailableReason:'Workspace engine does not expose text diagnostics.'}); }
  catch(error) { value = {available:false, unavailableReason:String(error)}; }
  appendFileSync(target, JSON.stringify({kind:'text-diagnostics', recordedAt:new Date().toISOString(), ...value})+'\n');
}
export async function recordBrowserIdentity(browser: Browser) {
  const target = process.env.STUDIO_BROWSER_TELEMETRY;
  if (!target) return;
  const entry: any = {recordedAt:new Date().toISOString(),version:browser.version(),executablePath:null,executableSha256:null,identitySource:'Playwright browser.version and Chromium CDP',unavailableReason:null};
  let session;
  try {
    session = await browser.newBrowserCDPSession();
    const command = await session.send('Browser.getBrowserCommandLine');
    const executable = command.arguments?.[0];
    if (!executable) throw Error('CDP did not return an executable');
    entry.executablePath=realpathSync(executable);
    entry.executableSha256=createHash('sha256').update(readFileSync(entry.executablePath)).digest('hex');
  } catch(error) {entry.unavailableReason=String(error);}
  finally {await session?.detach().catch(()=>{});}
  appendFileSync(target,JSON.stringify(entry)+'\n');
}
