const INTENTS = new Set([
  'demonstrate-interface', 'explain-mechanism', 'show-evidence',
  'establish-context', 'evoke-mood',
]);
const AUTHENTICITY = new Set(['required', 'illustrative']);
const MAX_BEATS = 100;
const MAX_FIELD_CHARS = 2000;
const MAX_TOTAL_CHARS = 80000;
const MAX_SEARCH_QUERIES = 5;
const SOURCE_KEYS = ['screenCapture', 'ownedFootage', 'sourceDocument'];

function boundedText(value, name, max = MAX_FIELD_CHARS) {
  if (typeof value !== 'string' || !value.trim()) throw Error(`${name} must be a non-empty string.`);
  if (value.length > max) throw Error(`${name} exceeds the ${max}-character limit.`);
  return value.trim();
}

function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Input must be an object.');
  if (input.schemaVersion !== 1) throw Error('schemaVersion must be 1.');
  if (!Array.isArray(input.beats) || input.beats.length < 1 || input.beats.length > MAX_BEATS) throw Error(`beats must be an array with 1 to ${MAX_BEATS} entries.`);
  const constraints = input.constraints ?? {};
  if (!constraints || typeof constraints !== 'object' || Array.isArray(constraints)) throw Error('constraints must be an object.');
  for (const key of Object.keys(constraints)) {
    if (!['allowOnlineStock', 'allowGenerated'].includes(key) || typeof constraints[key] !== 'boolean') throw Error(`constraints.${key} must be a supported boolean option.`);
  }
  const seen = new Set();
  let totalChars = 0;
  const beats = input.beats.map((beat, index) => {
    if (!beat || typeof beat !== 'object' || Array.isArray(beat)) throw Error(`beats[${index}] must be an object.`);
    const id = boundedText(beat.id, `beats[${index}].id`, 100);
    if (seen.has(id)) throw Error(`Beat id must be unique: ${id}`);
    seen.add(id);
    if (!Number.isFinite(beat.startSeconds) || beat.startSeconds < 0) throw Error(`Beat ${id} startSeconds must be a finite non-negative number.`);
    if (!Number.isFinite(beat.durationSeconds) || beat.durationSeconds <= 0 || !Number.isFinite(beat.startSeconds + beat.durationSeconds)) throw Error(`Beat ${id} durationSeconds must be a finite positive number with a finite end time.`);
    if (!INTENTS.has(beat.intent)) throw Error(`Beat ${id} has an unsupported intent.`);
    if (!AUTHENTICITY.has(beat.authenticity)) throw Error(`Beat ${id} authenticity must be required or illustrative.`);
    if (beat.intent === 'demonstrate-interface' && beat.authenticity !== 'required') throw Error(`Beat ${id} interface demonstrations require authenticity required; use a different intent for conceptual explanation.`);
    const takeaway = boundedText(beat.takeaway, `Beat ${id} takeaway`);
    const visualBrief = boundedText(beat.visualBrief, `Beat ${id} visualBrief`);
    totalChars += id.length + takeaway.length + visualBrief.length;
    let available;
    if (beat.available !== undefined) {
      if (!beat.available || typeof beat.available !== 'object' || Array.isArray(beat.available)) throw Error(`Beat ${id} available must be an object.`);
      for (const [key, value] of Object.entries(beat.available)) {
        if (!SOURCE_KEYS.includes(key) || typeof value !== 'boolean') throw Error(`Beat ${id} available.${key} must be a supported boolean.`);
      }
      available = Object.fromEntries(SOURCE_KEYS.filter(key => key in beat.available).map(key => [key, beat.available[key]]));
    } else available = {};
    let searchQueries;
    if (beat.searchQueries !== undefined) {
      if (!Array.isArray(beat.searchQueries) || beat.searchQueries.length > MAX_SEARCH_QUERIES) throw Error(`Beat ${id} searchQueries must contain at most ${MAX_SEARCH_QUERIES} entries.`);
      searchQueries = beat.searchQueries.map((query, queryIndex) => boundedText(query, `Beat ${id} searchQueries[${queryIndex}]`, 200));
      totalChars += searchQueries.reduce((sum, query) => sum + query.length, 0);
    } else searchQueries = [];
    if (totalChars > MAX_TOTAL_CHARS) throw Error(`Input text exceeds the ${MAX_TOTAL_CHARS}-character limit.`);
    return { id, startSeconds: beat.startSeconds, durationSeconds: beat.durationSeconds, intent: beat.intent, takeaway, visualBrief, authenticity: beat.authenticity, available, searchQueries };
  });
  return { beats, constraints: { allowOnlineStock: constraints.allowOnlineStock ?? false, allowGenerated: constraints.allowGenerated ?? false } };
}

function availability(beat, key) {
  if (!(key in beat.available)) return 'unknown';
  return beat.available[key] ? 'director-declared-available-unverified' : 'director-declared-unavailable-unverified';
}

function planBeat(beat, constraints) {
  const blocks = [];
  let route, owner, reason, job, fallback;
  if (beat.intent === 'demonstrate-interface') {
    route = 'screen-recording'; owner = 'editor';
    reason = 'This beat demonstrates a real interface, so capture the interface and interaction directly.';
    job = { type: 'capture-screen', sourceDescription: beat.visualBrief, captureTask: beat.takeaway, preserve: ['source URL or application and version', 'the exact visible state and interaction steps', 'a source capture record'] };
    if (beat.available.screenCapture === false) blocks.push('The Director marked screen-capture access unavailable; identify an accessible interface source before capture.');
    else if (beat.available.screenCapture !== true) blocks.push('Screen-capture access and the exact interface source are unverified.');
    fallback = { route: 'none', condition: 'If a real interface cannot be captured, the Director must revise the beat intent or provide an accessible source. Do not use a simulated interface as a substitute.' };
  } else if (beat.intent === 'explain-mechanism') {
    route = 'animation'; owner = 'animator';
    reason = 'A mechanism is best shown through an original visual explanation built around the stated takeaway.';
    job = { type: 'animate-mechanism', brief: beat.visualBrief, takeaway: beat.takeaway, authenticity: beat.authenticity };
    fallback = { route: 'source-document', condition: 'If the mechanism cannot be depicted accurately, use a source document only when it directly supports the takeaway; otherwise revise the explanation.' };
  } else if (beat.intent === 'show-evidence') {
    if (beat.available.sourceDocument === true) {
      route = 'source-document'; owner = 'director';
      reason = 'Use the declared source document as evidence, retaining provenance for review.';
      job = { type: 'review-source-document', sourceDescription: beat.visualBrief, takeaway: beat.takeaway, preserve: ['document title or source identity', 'relevant page, record, or passage', 'provenance and usage basis'] };
    } else if (beat.available.ownedFootage === true) {
      route = 'original-footage'; owner = 'director';
      reason = 'Use declared original footage for the evidence beat and preserve its source record.';
      job = { type: 'review-original-footage', sourceDescription: beat.visualBrief, takeaway: beat.takeaway, preserve: ['original file identity', 'capture context and date when known', 'provenance and usage basis'] };
    } else {
      route = 'source-document'; owner = 'director';
      reason = 'Evidence requires an identifiable source document or original footage; none is confirmed in the input.';
      job = { type: 'locate-evidence-source', sourceDescription: beat.visualBrief, takeaway: beat.takeaway, preserve: ['source identity', 'the exact record or footage supporting the takeaway', 'provenance and usage basis'] };
      blocks.push('No evidence source is declared available; locate and verify source material before editing this beat.');
    }
    fallback = { route: 'none', condition: 'Do not replace evidence with illustrative animation or stock. Locate supporting source material or revise the Director-approved takeaway.' };
  } else {
    const mood = beat.intent === 'evoke-mood';
    if (beat.available.ownedFootage === true) {
      route = 'original-footage'; owner = 'director';
      reason = 'Use declared owned footage for the context or mood described in the brief.';
      job = { type: 'select-owned-footage', sceneDescription: beat.visualBrief, takeaway: beat.takeaway, preserve: ['source file identity', 'provenance and usage basis'] };
    } else if (beat.authenticity === 'illustrative' && constraints.allowOnlineStock) {
      route = 'licensed-stock'; owner = 'director';
      reason = 'Online stock is allowed by the input constraint and can supply this illustrative context or mood.';
      job = { type: 'search-stock', searches: beat.searchQueries.length ? beat.searchQueries : [beat.visualBrief], sceneDescription: beat.visualBrief, usage: 'Use a free permitted download from the original provider; verify the item license and intended-use limits. Do not purchase, create accounts, bypass access controls or upload private material without applicable user authorization.' };
      blocks.push('Stock availability and license terms have not been checked; no asset is selected or cleared.');
    } else if (beat.authenticity === 'illustrative') {
      route = 'conceptual-animation'; owner = 'animator';
      reason = 'Original Animator-authored motion can express this context or mood as an illustration without external stock or a generative service.';
      job = { type: 'animate-concept', brief: beat.visualBrief, takeaway: beat.takeaway, labelAsIllustration: true, generation: 'original-animator-authored' };
      blocks.push('The conceptual animation has not been authored.');
    } else {
      route = 'original-footage'; owner = 'director';
      reason = 'The beat requires authentic context or mood footage; use an identified original source.';
      job = { type: 'request-original-footage', sceneDescription: beat.visualBrief, captureTask: beat.takeaway };
      blocks.push('No owned footage is declared available; identify an authentic source before editing this beat.');
    }
    fallback = beat.authenticity === 'illustrative'
      ? { route: route === 'licensed-stock' ? 'conceptual-animation' : 'original-footage', condition: 'Use only a visual that supports the stated takeaway and keep illustrative material distinguishable from documentary evidence.' }
      : { route: 'original-footage', condition: 'Preserve authentic context; do not substitute synthetic or stock imagery that could be mistaken for the described real event.' };
    if (mood && fallback.route === 'conceptual-animation') fallback.condition = 'Keep visual treatment consistent with the described mood and label synthetic or illustrative material where context could be mistaken for documentary footage.';
  }
  const routeRequirements = {
    'screen-recording': ['Verify the exact interface identity and access, screen-capture capability, and permitted capture and use basis.'],
    animation: beat.authenticity === 'required'
      ? ['Verify Animator authoring capability.', 'Locate and verify source material supporting each factual mechanism claim before animation.']
      : ['Verify Animator authoring capability.', 'Keep any unsourced mechanism depiction clearly illustrative.'],
    'source-document': ['Locate and verify the source document identity, the passage supporting the takeaway, and its provenance and usage basis.'],
    'original-footage': ['Verify footage source identity and relevance, provenance, ownership or permission, and the capability to capture or access the source.'],
    'licensed-stock': ['Verify candidate availability, asset identity, license terms, usage rights, and the capability to acquire the selected asset.'],
    'conceptual-animation': ['Verify Animator authoring capability; this plan calls for original motion and does not require a generative service.', 'Keep the result visibly illustrative and distinguishable from documentary footage.'],
  };
  job.requires = routeRequirements[route];
  return {
    id: beat.id, startSeconds: beat.startSeconds, durationSeconds: beat.durationSeconds,
    intent: beat.intent, takeaway: beat.takeaway, visualBrief: beat.visualBrief,
    authenticity: beat.authenticity, route, owner, reason, job, fallback,
    sourceAvailability: Object.fromEntries(SOURCE_KEYS.map(key => [key, availability(beat, key)])),
    capability: 'unverified-until-execution', executionStatus: 'not-executed', blockingConditions: blocks,
  };
}

/** Plan visual production jobs from Director-authored semantic intent. Never captures, searches, or generates media. */
export function planVisualProduction(input) {
  const { beats, constraints } = validateInput(input);
  return {
    schemaVersion: 1,
    mode: 'planning-only',
    noMediaExecuted: true,
    networkAccessed: false,
    rightsStatus: 'not-assessed',
    executionPolicy: 'Director completes each job requirement during production; requirements are work prerequisites, not approval requests.',
    constraints,
    beats: beats.map(beat => planBeat(beat, constraints)),
  };
}
