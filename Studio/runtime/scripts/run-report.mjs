import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const METRICS = ['input', 'cachedInput', 'output', 'reasoningOutput', 'total'];
function required(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw Error(`${name} must be a nonempty string`);
  return value;
}
function time(value, name) {
  if (value == null) return null;
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw Error(`${name} must be an ISO timestamp`);
  return new Date(value).toISOString();
}
function elapsed(start, end) {
  if (!start || !end) return null;
  const milliseconds = Date.parse(end) - Date.parse(start);
  if (milliseconds < 0) throw Error('End time precedes start time');
  return milliseconds;
}
function aggregate(entries, scopeComplete) {
  return Object.fromEntries(METRICS.map(metric => {
    const measured = entries.filter(entry => entry.tokens[metric] !== null);
    const knownSubtotal = measured.reduce((sum, entry) => sum + entry.tokens[metric], 0);
    if (!Number.isSafeInteger(knownSubtotal)) throw Error(`Aggregate ${metric} exceeds safe integer range`);
    const complete = scopeComplete && entries.length > 0 && measured.length === entries.length;
    return [metric, { total: complete ? knownSubtotal : null, knownSubtotal: measured.length ? knownSubtotal : null,
      measuredEntries: measured.length, expectedEntries: entries.length, complete }];
  }));
}
function aggregateCost(entries,scopeComplete) {
  const measured=entries.filter(entry=>entry.cost.amountMicros!==null);
  const currencies=[...new Set(measured.map(entry=>entry.cost.currency))].sort();
  const complete=scopeComplete&&entries.length>0&&measured.length===entries.length&&currencies.length===1;
  const byCurrency=currencies.map(currency=>{
    const matching=measured.filter(entry=>entry.cost.currency===currency),subtotal=matching.reduce((sum,entry)=>sum+entry.cost.amountMicros,0);
    if(!Number.isSafeInteger(subtotal))throw Error(`Aggregate ${currency} cost exceeds safe integer range`);
    return {currency,totalMicros:complete?subtotal:null,knownSubtotalMicros:subtotal,measuredEntries:matching.length,expectedEntries:entries.length,complete:complete&&matching.length===entries.length};
  });
  return {complete,totalMicros:complete?byCurrency[0].knownSubtotalMicros:null,currency:currencies.length===1?currencies[0]:null,
    knownSubtotalMicros:currencies.length===1?(byCurrency[0]?.knownSubtotalMicros??null):null,measuredEntries:measured.length,expectedEntries:entries.length,currencies,byCurrency,
    limitation:complete?null:currencies.length>1?'Multiple currencies cannot be combined into one total.':`Cost coverage is incomplete (${measured.length}/${entries.length} measured entries) or the full run scope is unverified.`};
}

/** Explicit incremental telemetry only. No session discovery, inference, pricing, or network access. */
export function buildRunReport(input) {
  if (input?.schemaVersion !== 1) throw Error('Expected schemaVersion 1');
  const runId = required(input.runId, 'runId');
  const startedAt = time(input.startedAt, 'startedAt'), endedAt = time(input.endedAt, 'endedAt');
  const elapsedMs = elapsed(startedAt, endedAt);
  if (!Array.isArray(input.participants) || !input.participants.length) throw Error('Declare at least one participant');
  if (!Array.isArray(input.entries)) throw Error('entries must be an array');
  const participantIds = new Set();
  const participants = input.participants.map(item => {
    const id = required(item.id, 'participant.id');
    if (participantIds.has(id)) throw Error(`Duplicate participant ${id}`);
    participantIds.add(id);
    return { id, role: required(item.role, 'participant.role') };
  });
  const ids = new Set(), sourceRecords = new Set(),costRecords=new Set();
  const entries = input.entries.map(item => {
    const id = required(item.id, 'entry.id');
    if (ids.has(id)) throw Error(`Duplicate entry ${id}`);
    ids.add(id);
    if (!participantIds.has(item.participantId)) throw Error(`Undeclared participant ${item.participantId}`);
    if (item.measurementKind && item.measurementKind !== 'incremental') throw Error('Only non-overlapping incremental measurements are accepted');
    const source = { kind: required(item.source?.kind, 'source.kind'), reference: required(item.source?.reference, 'source.reference'), recordId: required(item.source?.recordId, 'source.recordId') };
    const sourceKey = JSON.stringify([source.kind, source.reference, source.recordId]);
    if (sourceRecords.has(sourceKey)) throw Error(`Duplicate source record ${source.recordId}`);
    sourceRecords.add(sourceKey);
    const tokens = {}, unavailableReasons = {};
    for (const metric of METRICS) {
      const value = item.tokens?.[metric] ?? null;
      if (value !== null && (!Number.isSafeInteger(value) || value < 0)) throw Error(`Invalid ${metric} token count for ${id}`);
      tokens[metric] = value;
      if (value === null) unavailableReasons[metric] = item.unavailableReasons?.[metric] || 'Not exposed by the supplied telemetry';
    }
    if (tokens.cachedInput !== null && tokens.input !== null && tokens.cachedInput > tokens.input) throw Error('cachedInput is a subset of input');
    if (tokens.reasoningOutput !== null && tokens.output !== null && tokens.reasoningOutput > tokens.output) throw Error('reasoningOutput is a subset of output');
    if (tokens.total !== null && tokens.input !== null && tokens.output !== null && tokens.total !== tokens.input + tokens.output) throw Error('total must equal input + output (do not add subsets again)');
    if (tokens.total !== null && ['input','output','cachedInput','reasoningOutput'].some(key => tokens[key] !== null && tokens[key] > tokens.total)) throw Error('Token component exceeds total');
    const costValue=item.cost?.amountMicros??null,currency=item.cost?.currency??null;
    if(costValue!==null&&(!Number.isSafeInteger(costValue)||costValue<0))throw Error(`Invalid cost amount for ${id}`);
    if(costValue!==null&&!/^[A-Z]{3}$/.test(currency??''))throw Error(`Invalid cost currency for ${id}; use an ISO 4217 code`);
    let costSource=null;
    if(costValue!==null){
      costSource={kind:required(item.cost?.source?.kind,'cost.source.kind'),reference:required(item.cost?.source?.reference,'cost.source.reference'),recordId:required(item.cost?.source?.recordId,'cost.source.recordId')};
      if(!['provider-billing','provider-invoice','billing-export','host-billing'].includes(costSource.kind))throw Error(`Cost for ${id} must cite actual provider/host billing evidence; estimates are not accepted`);
      const costKey=JSON.stringify([costSource.kind,costSource.reference,costSource.recordId]);
      if(costRecords.has(costKey))throw Error(`Duplicate billed-cost record ${costSource.recordId}`);
      costRecords.add(costKey);
    }else if(currency!==null||item.cost?.source)throw Error(`Unavailable cost for ${id} cannot include a currency or source`);
    const unavailableCostReason=costValue===null?(item.cost?.unavailableReason||'Actual provider cost was not supplied'):null;
    if(unavailableCostReason!==null&&(typeof unavailableCostReason!=='string'||!unavailableCostReason.trim()))throw Error(`Invalid cost unavailable reason for ${id}`);
    const cost={amountMicros:costValue,currency:costValue===null?null:currency,source:costSource,unavailableReason:unavailableCostReason};
    const entryStartedAt = time(item.startedAt, 'entry.startedAt'), entryEndedAt = time(item.endedAt, 'entry.endedAt');
    for (const stamp of [entryStartedAt, entryEndedAt].filter(Boolean)) {
      if ((startedAt && Date.parse(stamp) < Date.parse(startedAt)) || (endedAt && Date.parse(stamp) > Date.parse(endedAt))) throw Error(`Entry ${id} timestamp is outside the declared run window`);
    }
    if (!Number.isSafeInteger(item.attempt) || item.attempt < 1) throw Error('attempt must be a positive integer');
    return { id, participantId: item.participantId, model: required(item.model, 'model'), stage: required(item.stage, 'stage'), attempt: item.attempt,
      startedAt: entryStartedAt, endedAt: entryEndedAt, elapsedMs: elapsed(entryStartedAt, entryEndedAt), measurementKind: 'incremental', source, tokens, unavailableReasons,cost };
  });
  const missingParticipants = participants.filter(p => !entries.some(entry => entry.participantId === p.id)).map(p => p.id);
  const inventoryComplete = input.participantInventoryComplete === true;
  // This declaration covers all calls and attempts, not only the participant names.
  const scopeComplete = inventoryComplete && input.measurementScopeComplete === true && missingParticipants.length === 0;
  const tokenCoverageComplete=scopeComplete&&entries.length>0&&entries.every(entry=>METRICS.every(metric=>entry.tokens[metric]!==null));
  const groups = key => [...new Set(entries.map(entry => entry[key]))].map(value => ({ [key]: value, tokens: aggregate(entries.filter(entry => entry[key] === value), scopeComplete),cost:aggregateCost(entries.filter(entry=>entry[key]===value),scopeComplete) }));
  const cost=aggregateCost(entries,scopeComplete);
  return { schemaVersion: 1, runId, startedAt, endedAt, elapsedMs,
    semantics: 'input includes cachedInput; output includes reasoningOutput; total = input + output. Subset counts are never added again. All measurements must be non-overlapping increments.',
    coverage: { participantInventoryComplete: inventoryComplete, measurementScopeComplete: input.measurementScopeComplete === true, missingParticipants,
      complete: tokenCoverageComplete,costComplete:cost.complete,
      limitation: tokenCoverageComplete ? null : 'Full run scope or token fields are incomplete; known subtotals are not complete run totals.' },
    participants, entries, tokens: aggregate(entries, scopeComplete),cost, byParticipant: groups('participantId'), byModel: groups('model'), byStage: groups('stage'),
    attempts: [...new Set(entries.map(entry => JSON.stringify([entry.participantId, entry.stage, entry.attempt])))].length };
}

export function renderRunReportMarkdown(report) {
  const safe = value => String(value ?? 'Unavailable').replace(/[|\r\n]/g, ' ');
  const lines = [`# Run report: ${safe(report.runId)}`, '', `Coverage: ${report.coverage.complete ? 'complete' : 'partial or unavailable'}. Elapsed milliseconds: ${safe(report.elapsedMs)}. Recorded participant/stage attempts: ${report.attempts}.`, '', report.semantics, '', '| Metric | Complete scope total | Known subtotal | Measured entries |', '| --- | ---: | ---: | ---: |'];
  for (const metric of METRICS) { const item = report.tokens[metric]; lines.push(`| ${metric} | ${safe(item.total)} | ${safe(item.knownSubtotal)} | ${item.measuredEntries}/${item.expectedEntries} |`); }
  if (report.coverage.limitation) lines.push('', report.coverage.limitation);
  if (report.coverage.missingParticipants.length) lines.push('', `Participants without entries: ${report.coverage.missingParticipants.map(safe).join(', ')}.`);
  lines.push('', '## Measurements', '');
  lines.push('',`Actual billed cost: ${safe(report.cost.totalMicros)} ${safe(report.cost.currency)} micro-units (1 micro-unit = 0.000001 currency units); coverage ${report.cost.complete?'complete':'partial/unavailable'}. No pricing estimates are used.`);
  for (const entry of report.entries) {
    lines.push(`- ${safe(entry.id)}: ${safe(entry.participantId)} / ${safe(entry.model)} / ${safe(entry.stage)} / attempt ${entry.attempt}; elapsed ms ${safe(entry.elapsedMs)}.`, `  Tokens: ${METRICS.map(metric => `${metric}=${safe(entry.tokens[metric])}`).join(', ')}.`, `  Cost: ${safe(entry.cost.amountMicros)} ${safe(entry.cost.currency)} micro-units; ${safe(entry.cost.unavailableReason)}.`, `  Source: ${safe(entry.source.kind)}; ${safe(entry.source.reference)}; record ${safe(entry.source.recordId)}.`);
    for (const [metric, reason] of Object.entries(entry.unavailableReasons)) lines.push(`  ${metric} unavailable: ${safe(reason)}.`);
  }
  return lines.join('\n') + '\n';
}

export function unavailableRunInput({ runId, stage, startedAt = null, endedAt = null, participantId = 'coordinator', model = 'unavailable', attempt = 1, reason = 'Host token telemetry was not supplied to this command', costReason = 'Actual provider billing telemetry was not supplied', sourceReference = 'local-command' }) {
  return { schemaVersion: 1, runId, startedAt, endedAt, participantInventoryComplete: false, measurementScopeComplete: false,
    participants: [{ id: participantId, role: 'coordinator' }], entries: [{ id: `${runId}:${stage}:${attempt}`, participantId, model, stage, attempt, startedAt, endedAt,
      source: { kind: 'unavailable', reference: sourceReference, recordId: `${runId}:${stage}:${attempt}` }, tokens: {},
      unavailableReasons: Object.fromEntries(METRICS.map(metric => [metric, reason])),cost:{amountMicros:null,currency:null,source:null,unavailableReason:costReason} }] };
}

export function writeRunReport(inputPath, outputPath) {
  const input = typeof inputPath === 'string' ? JSON.parse(fs.readFileSync(inputPath, 'utf8')) : inputPath;
  const report = buildRunReport(input), absolute = path.resolve(outputPath);
  if (!absolute.endsWith('.json')) throw Error('Output must end in .json');
  const markdown = absolute.slice(0, -5) + '.md';
  if (fs.existsSync(absolute) || fs.existsSync(markdown)) throw Error('Run reports are immutable; choose a new output name');
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  fs.writeFileSync(markdown, renderRunReportMarkdown(report), { flag: 'wx' });
  return { json: absolute, markdown };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 4 || args[0] !== '--input' || args[2] !== '--output') throw Error('Usage: run-report.mjs --input telemetry.json --output new-report.json');
    console.log(JSON.stringify(writeRunReport(args[1], args[3])));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
