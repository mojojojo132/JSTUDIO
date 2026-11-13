/** Prevent known crash-prone macOS application launches in Codex Seatbelt. */
export function assertBrowserLaunchAllowed({platform=process.platform,env=process.env}={}) {
 if(platform==='darwin' && env.CODEX_SANDBOX==='seatbelt') {
  const error=new Error('STUDIO_BROWSER_EXECUTION_REQUIRED: Browser rendering is blocked inside the restricted macOS execution environment to prevent Chrome startup crashes. Ask the host for approved execution of this same render command outside that restriction, or run it from your normal Terminal. Do not retry here, unset the sandbox marker, or disable browser/macOS security.');
  error.code='STUDIO_BROWSER_EXECUTION_REQUIRED';throw error;
 }
}
