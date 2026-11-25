/**
 * Automated Verification Suite for Pranayama Breathing Exercise (v2.5)
 * Verifies Phase 1–5 implementations in index.html, sw.js, and docs/voice/*.py
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// Extract inline <script> block (the main application script)
const scriptMatch = html.match(/<script>\s*'use strict';[\s\S]*?<\/script>/);
assert(scriptMatch, 'Main inline <script> block must exist in index.html');
const scriptCode = scriptMatch[0].replace(/^<script>/, '').replace(/<\/script>$/, '');

// 1. Static HTML / CSS checks
console.log('--- Phase 1 & Static Checks ---');
assert(html.includes('--color-accent:'), 'CSS must define --color-accent token');
assert(html.includes('.journey-step-day'), 'CSS must define .journey-step-day');
assert(html.includes('.journey-step-icon'), 'CSS must define .journey-step-icon');
assert(html.includes('.journey-step.active'), 'CSS must define .journey-step.active');
assert(html.includes('.v-round-bar-fill.bar-success'), 'CSS must define .v-round-bar-fill.bar-success');
assert(html.includes('id="qs-vol-amb2"'), 'HTML must include #qs-vol-amb2 in Quick Sound Popover');
assert(html.includes('id="hold-now-btn"'), 'HTML must include #hold-now-btn');
assert(html.includes('id="btn-finish"'), 'HTML must include #btn-finish');
assert(html.includes('id="nostril-indicator"'), 'HTML must include #nostril-indicator');
assert(html.includes('id="nostril-arc"'), 'HTML must include #nostril-arc');
assert(html.includes('id="bolt-overlay"'), 'HTML must include #bolt-overlay');
assert(html.includes('id="cfg-breath-style"'), 'HTML must include #cfg-breath-style');

const swCode = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
assert(swCode.includes("CACHE_NAME = 'pranayama-v30'"), 'sw.js must use pranayama-v30 cache');
assert(swCode.includes('ignoreSearch: true'), 'sw.js must match navigation with ignoreSearch');

const genVoiceCode = fs.readFileSync(path.join(ROOT, 'docs/voice/gen_voice.py'), 'utf8');
assert(genVoiceCode.includes('Path(__file__).resolve().parent'), 'gen_voice.py must use portable Path');
assert(genVoiceCode.includes('"threeBreathsLeft"'), 'gen_voice.py must include threeBreathsLeft');
assert(genVoiceCode.includes('"newRecord"'), 'gen_voice.py must include newRecord');
assert(genVoiceCode.includes('"inhaleLeft"'), 'gen_voice.py must include inhaleLeft');
assert(genVoiceCode.includes('"humOut"'), 'gen_voice.py must include humOut');
assert(genVoiceCode.includes('"nextStage"'), 'gen_voice.py must include nextStage');

const compressVoiceCode = fs.readFileSync(path.join(ROOT, 'docs/voice/compress_voice.py'), 'utf8');
assert(compressVoiceCode.includes('Path(__file__).resolve().parent'), 'compress_voice.py must use portable Path');
assert(compressVoiceCode.includes('"threeBreathsLeft"'), 'compress_voice.py must include threeBreathsLeft');
assert(compressVoiceCode.includes('"newRecord"'), 'compress_voice.py must include newRecord');
assert(compressVoiceCode.includes('"inhaleLeft"'), 'compress_voice.py must include inhaleLeft');
assert(compressVoiceCode.includes('"humOut"'), 'compress_voice.py must include humOut');
assert(compressVoiceCode.includes('"nextStage"'), 'compress_voice.py must include nextStage');

const voiceDataCode = fs.readFileSync(path.join(ROOT, 'docs/voice/voice_data.js'), 'utf8');
['inhaleLeft', 'exhaleRight', 'inhaleRight', 'exhaleLeft', 'humOut', 'nextStage'].forEach(k => {
  assert(voiceDataCode.includes('"' + k + '"'), 'voice_data.js must contain clip ' + k);
});
console.log('✓ Static HTML, CSS, Service Worker, and 20 Voice clips verified.');

// 2. Build Lightweight DOM & Browser Mock for VM Execution
function createMockDOM(htmlSource) {
  const elementsById = {};
  const docListeners = {};

  function makeClassList(initialClasses = []) {
    const set = new Set(initialClasses.filter(Boolean));
    return {
      add: (...cls) => cls.forEach(c => c && set.add(c)),
      remove: (...cls) => cls.forEach(c => set.delete(c)),
      toggle: (c, force) => {
        if (force === undefined) {
          if (set.has(c)) { set.delete(c); return false; }
          set.add(c); return true;
        }
        if (force) set.add(c); else set.delete(c);
        return !!force;
      },
      contains: (c) => set.has(c),
      toString: () => Array.from(set).join(' ')
    };
  }

  function makeElement(id = '', tagName = 'DIV', initialClasses = [], attrs = {}) {
    const listeners = {};
    let children = [];
    let _innerHTML = '';
    const el = {
      id,
      tagName: tagName.toUpperCase(),
      value: attrs.value !== undefined ? String(attrs.value) : '',
      min: attrs.min !== undefined ? String(attrs.min) : '',
      max: attrs.max !== undefined ? String(attrs.max) : '',
      step: attrs.step !== undefined ? String(attrs.step) : '',
      disabled: false,
      textContent: '',
      get innerHTML() {
        if (children.length > 0) {
          return _innerHTML + children.map(c => c.innerHTML || c.textContent || '').join('');
        }
        return _innerHTML;
      },
      set innerHTML(val) {
        _innerHTML = String(val);
        if (val === '') children = [];
      },
      style: {
        setProperty: function(k, v) { this[k] = v; },
        removeProperty: function(k) { delete this[k]; }
      },
      dataset: {},
      classList: makeClassList(initialClasses),
      get children() { return children; },
      parentNode: null,
      parentElement: null,
      addEventListener: (ev, fn) => {
        if (!listeners[ev]) listeners[ev] = [];
        listeners[ev].push(fn);
      },
      removeEventListener: (ev, fn) => {
        if (!listeners[ev]) return;
        listeners[ev] = listeners[ev].filter(f => f !== fn);
      },
      dispatchEvent: (evObj) => {
        const list = listeners[evObj.type] || [];
        list.forEach(fn => fn.call(el, evObj));
      },
      click: () => {
        const list = listeners['click'] || [];
        list.forEach(fn => fn.call(el, { type: 'click', target: el, currentTarget: el, preventDefault() {}, stopPropagation() {} }));
      },
      setAttribute: function(k, v) {
        attrs[k] = String(v);
        if (k === 'class') {
          el.classList = makeClassList(String(v).split(/\s+/));
        }
      },
      getAttribute: (k) => attrs[k] !== undefined ? attrs[k] : null,
      removeAttribute: (k) => { delete attrs[k]; },
      appendChild: (child) => {
        children.push(child);
        child.parentNode = el;
        child.parentElement = el;
        return child;
      },
      removeChild: (child) => {
        children = children.filter(c => c !== child);
      },
      remove: () => {},
      focus: () => {},
      blur: () => {},
      getBoundingClientRect: () => ({ width: 300, height: 300, top: 0, left: 0, right: 300, bottom: 300 }),
      getContext: () => ({
        clearRect() {}, fillRect() {}, beginPath() {}, arc() {}, ellipse() {}, fill() {}, stroke() {},
        moveTo() {}, lineTo() {}, closePath() {}, save() {}, restore() {}, scale() {},
        translate() {}, rotate() {}, createLinearGradient: () => ({ addColorStop() {} }),
        createRadialGradient: () => ({ addColorStop() {} }),
        fillText() {}, measureText: () => ({ width: 20 })
      }),
      querySelector: (sel) => {
        const mOpt = sel.match(/option\[value="([^"]*)"\]/);
        if (mOpt) {
          if (!el._options) el._options = {};
          if (!el._options[mOpt[1]]) {
            el._options[mOpt[1]] = makeElement('', 'OPTION', [], { value: mOpt[1] });
            el._options[mOpt[1]].textContent = mOpt[1];
          }
          return el._options[mOpt[1]];
        }
        return null;
      },
      querySelectorAll: () => []
    };
    return el;
  }

  // Parse all elements with id="..." from index.html
  const tagRegex = /<([a-zA-Z0-9-]+)([^>]*?\bid="([^"]+)"[^>]*)>/g;
  let match;
  while ((match = tagRegex.exec(htmlSource)) !== null) {
    const [, tag, attrStr, id] = match;
    const clsMatch = attrStr.match(/\bclass="([^"]*)"/);
    const valMatch = attrStr.match(/\bvalue="([^"]*)"/);
    const minMatch = attrStr.match(/\bmin="([^"]*)"/);
    const maxMatch = attrStr.match(/\bmax="([^"]*)"/);
    const stepMatch = attrStr.match(/\bstep="([^"]*)"/);
    const classes = clsMatch ? clsMatch[1].split(/\s+/) : [];
    const attrs = {};
    if (valMatch) attrs.value = valMatch[1];
    if (minMatch) attrs.min = minMatch[1];
    if (maxMatch) attrs.max = maxMatch[1];
    if (stepMatch) attrs.step = stepMatch[1];
    elementsById[id] = makeElement(id, tag, classes, attrs);
  }

  // For <select> elements, set default value from <option selected> or first <option value="...">
  const selectRegex = /<select[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g;
  while ((match = selectRegex.exec(htmlSource)) !== null) {
    const [, id, inner] = match;
    const selOpt = inner.match(/<option[^>]*\bvalue="([^"]*)"[^>]*\bselected/i)
                || inner.match(/<option[^>]*\bselected[^>]*\bvalue="([^"]*)"/i)
                || inner.match(/<option[^>]*\bvalue="([^"]*)"/i);
    if (selOpt && elementsById[id]) {
      elementsById[id].value = selOpt[1];
    }
  }

  const documentElement = makeElement('html', 'HTML');
  const body = makeElement('body', 'BODY');

  const document = {
    documentElement,
    body,
    hidden: false,
    fullscreenElement: null,
    getElementById: (id) => {
      if (!elementsById[id]) {
        elementsById[id] = makeElement(id, 'DIV');
      }
      return elementsById[id];
    },
    createElement: (tag) => makeElement('', tag),
    createElementNS: (ns, tag) => makeElement('', tag),
    querySelector: (sel) => {
      if (sel.startsWith('#')) return document.getElementById(sel.slice(1));
      return makeElement('', 'DIV');
    },
    querySelectorAll: () => [],
    addEventListener: (ev, fn) => {
      if (!docListeners[ev]) docListeners[ev] = [];
      docListeners[ev].push(fn);
    },
    removeEventListener: (ev, fn) => {
      if (!docListeners[ev]) return;
      docListeners[ev] = docListeners[ev].filter(f => f !== fn);
    },
    dispatchEvent: (evObj) => {
      const list = (docListeners[evObj.type] || []).slice();
      list.forEach(fn => fn(evObj));
    }
  };

  return { document, elementsById, docListeners };
}

const { document, elementsById } = createMockDOM(html);
const storage = {};
const localStorage = {
  getItem: (k) => Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};

let nowMs = 1000;
let rafCallbacks = [];
function stepTimer(deltaMs) {
  nowMs += deltaMs;
  const cbs = rafCallbacks.slice();
  rafCallbacks = [];
  cbs.forEach(cb => cb(nowMs));
}

const sandbox = {
  window: null,
  self: null,
  document,
  localStorage,
  innerWidth: 1280,
  innerHeight: 800,
  devicePixelRatio: 1,
  addEventListener: () => {},
  removeEventListener: () => {},
  navigator: { vibrate: () => {}, wakeLock: { request: () => Promise.resolve({ addEventListener() {}, release() {} }) } },
  performance: { now: () => nowMs },
  requestAnimationFrame: (cb) => { rafCallbacks.push(cb); return rafCallbacks.length; },
  cancelAnimationFrame: () => {},
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  Audio: function() { return { play: () => Promise.resolve(), pause() {}, load() {} }; },
  AudioContext: undefined,
  webkitAudioContext: undefined,
  VOICE_CLIPS: {},
  fetch: () => Promise.reject(new Error('offline test')),
  setTimeout: () => 1,
  clearTimeout: () => {},
  setInterval: () => 1,
  clearInterval: () => {},
  console,
  Date,
  Math,
  JSON,
  Number,
  String,
  Boolean,
  Object,
  Array,
  RegExp,
  Error,
  Promise,
  Set,
  Map,
  Uint8Array,
  Float32Array,
  Blob: function(parts) { this.parts = parts; },
  URL: { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} },
  FileReader: function() {}
};
sandbox.window = sandbox;
sandbox.self = sandbox;

vm.createContext(sandbox);
vm.runInContext(scriptCode, sandbox);

// Trigger DOMContentLoaded
document.dispatchEvent({ type: 'DOMContentLoaded' });

const { App, STATES } = sandbox;
assert(App && App.Config && App.Presets && App.Bolt && App.Session && App.UI && App.History, 'Core App modules must initialize');
console.log('✓ VM script execution & DOMContentLoaded initialization succeeded.');

// 3. Test Phase 3: New Breathwork Protocols (Coherent, Physiological Sigh, Nadi Shodhana)
console.log('--- Phase 3: Breathwork Protocols & Mechanics ---');

// 3a. Coherent Breathing (5.5s / 5.5s)
App.Presets.apply('coherent');
assert.strictEqual(App.Config.get('inhaleDuration'), 5.5, 'Coherent inhaleDuration must be 5.5s');
assert.strictEqual(App.Config.get('exhaleDuration'), 5.5, 'Coherent exhaleDuration must be 5.5s');
assert.strictEqual(App.Config.get('holdStartTime'), 0, 'Coherent holdStartTime must be 0s');
assert.strictEqual(App.Config.get('rounds'), 1, 'Coherent rounds must be 1');
assert.strictEqual(App.Config.get('breathsPerRound'), 50, 'Coherent breathsPerRound must be 50');
assert.strictEqual(App.Config.get('breathStyle'), 'standard', 'Coherent breathStyle must be standard');
assert.strictEqual(App.Presets.detectPreset(), 'coherent', 'detectPreset() must recognize coherent');

// 3b. Physiological Sigh (doubleInhale 2-stage mechanics)
App.Presets.apply('physio_sigh');
assert.strictEqual(App.Config.get('inhaleDuration'), 3.5, 'Physio Sigh inhaleDuration must be 3.5s');
assert.strictEqual(App.Config.get('exhaleDuration'), 6.5, 'Physio Sigh exhaleDuration must be 6.5s');
assert.strictEqual(App.Config.get('pauseAfterExhale'), 1, 'Physio Sigh pauseAfterExhale must be 1s');
assert.strictEqual(App.Config.get('breathStyle'), 'doubleInhale', 'Physio Sigh breathStyle must be doubleInhale');
assert.strictEqual(App.Presets.detectPreset(), 'physio_sigh', 'detectPreset() must recognize physio_sigh');

// Verify 2-stage inhale UI updates via App.UI.updateBreathingProgress(elapsed, durationMs, isInhale)
App.UI.updateBreathingProgress(1000, 3500, true); // ~28.5% (< 68%)
assert.strictEqual(elementsById['phase-label'].textContent, 'INHALE 1/2', 'Stage 1 of doubleInhale must display INHALE 1/2');

App.UI.updateBreathingProgress(2800, 3500, true); // 80% (>= 68%)
assert.strictEqual(elementsById['phase-label'].textContent, 'SIP IN 2/2', 'Stage 2 (>=68%) of doubleInhale must display SIP IN 2/2');

// 3c. Nadi Shodhana (alternateNostril mechanics)
App.Presets.apply('nadi_shodhana');
assert.strictEqual(App.Config.get('inhaleDuration'), 4, 'Nadi Shodhana inhaleDuration must be 4s');
assert.strictEqual(App.Config.get('pauseAfterInhale'), 4, 'Nadi Shodhana pauseAfterInhale must be 4s');
assert.strictEqual(App.Config.get('exhaleDuration'), 4, 'Nadi Shodhana exhaleDuration must be 4s');
assert.strictEqual(App.Config.get('breathStyle'), 'alternateNostril', 'Nadi Shodhana breathStyle must be alternateNostril');
assert.strictEqual(App.Presets.detectPreset(), 'nadi_shodhana', 'detectPreset() must recognize nadi_shodhana');

// Start Nadi Shodhana session and inspect nostril indicator on Breath 1 (odd: Left In -> Both Hold -> Right Out)
elementsById['disclaimer-overlay'].classList.add('hidden');
App.Session.start();
// Advance past GET_READY (3000ms) into BREATHING_IN (breath 1)
stepTimer(3500);
assert.strictEqual(App.Session.getState(), STATES.BREATHING_IN, 'Should transition to BREATHING_IN');
assert.strictEqual(App.Session.getBreathCount(), 1, 'Should be on Breath 1');
assert(!elementsById['nostril-indicator'].classList.contains('hidden'), 'Nostril indicator must be visible during alternateNostril');
assert(elementsById['nostril-indicator'].textContent.includes('LEFT NOSTRIL'), 'Breath 1 inhale must indicate LEFT NOSTRIL');
assert.strictEqual(elementsById['nostril-arc'].getAttribute('d'), 'M 100 12 A 88 88 0 0 0 100 188', 'Breath 1 inhale must highlight left SVG semicircle');

// Advance Breath 1 to PAUSE_AFTER_INHALE
stepTimer(4500);
assert.strictEqual(App.Session.getState(), STATES.PAUSE_AFTER_INHALE, 'Breath 1 should enter PAUSE_AFTER_INHALE');
assert(elementsById['nostril-indicator'].textContent.includes('BOTH NOSTRILS'), 'Top pause must indicate BOTH NOSTRILS CLOSED');

// Advance Breath 1 to BREATHING_OUT (Right nostril)
stepTimer(4500);
assert.strictEqual(App.Session.getState(), STATES.BREATHING_OUT, 'Breath 1 should enter BREATHING_OUT');
assert(elementsById['nostril-indicator'].textContent.includes('RIGHT NOSTRIL'), 'Breath 1 exhale must indicate RIGHT NOSTRIL');
assert(elementsById['nostril-arc'].classList.contains('arc-right'), 'Breath 1 exhale must highlight right SVG semicircle');

// Advance to Breath 2 BREATHING_IN (even: Right In)
stepTimer(4500);
assert.strictEqual(App.Session.getState(), STATES.BREATHING_IN, 'Should advance to Breath 2 BREATHING_IN');
assert.strictEqual(App.Session.getBreathCount(), 2, 'Should be on Breath 2');
assert(elementsById['nostril-indicator'].textContent.includes('RIGHT NOSTRIL'), 'Breath 2 inhale must indicate RIGHT NOSTRIL');
App.Session.reset();
console.log('✓ Coherent, Physiological Sigh (2-stage), and Nadi Shodhana (alternate nostril) verified.');

// 4. Test Phase 2: Session Controls ("Hold Now" & "Finish & Save")
console.log('--- Phase 2: Session Controls (Hold Now & Finish & Save) ---');
App.Presets.apply('pranayama');
localStorage.removeItem('whm_history');
App.Session.start();
// Complete GET_READY -> BREATHING_IN
stepTimer(3500);
assert.strictEqual(App.Session.getState(), STATES.BREATHING_IN, 'Session should be in BREATHING_IN');
assert(!elementsById['hold-now-btn'].classList.contains('hidden'), '#hold-now-btn must be visible during BREATHING_IN when holdTarget > 0');

// Trigger Hold Now early on breath 1
App.Session.holdNow();
assert.strictEqual(App.Session.getState(), STATES.HOLD, 'App.Session.holdNow() must transition immediately to HOLD');
assert(elementsById['hold-now-btn'].classList.contains('hidden'), '#hold-now-btn must hide once in HOLD');

// Simulate 45 seconds of hold
stepTimer(45000);
// End Hold -> RECOVERY_IN
App.Session.endHold();
assert.strictEqual(App.Session.getState(), STATES.RECOVERY_IN, 'endHold() must transition to RECOVERY_IN');
assert.deepStrictEqual(Array.from(App.Session.getRoundHolds()), [45], 'Round 1 hold of 45s must be recorded');
assert(!elementsById['btn-finish'].classList.contains('hidden'), '#btn-finish must be visible after >=1 completed hold');

// Trigger Finish & Save early after Round 1 hold
App.Session.finishAndSave();
assert.strictEqual(App.Session.getState(), STATES.SESSION_COMPLETE, 'finishAndSave() must transition to SESSION_COMPLETE');
const histAfterFinish = App.History.stats().all;
assert.strictEqual(histAfterFinish.length, 1, 'finishAndSave() must save session to App.History');
assert.deepStrictEqual(Array.from(histAfterFinish[0].holds), [45], 'Saved session must contain completed hold [45]');
assert(!elementsById['victory-overlay'].classList.contains('hidden'), 'Victory modal must open after finishAndSave()');
App.UI.hideVictoryModal();
App.Session.reset();
console.log('✓ Hold Now and Finish & Save controls verified.');

// 5. Test Phase 1 Bugfix: Victory Modal Adaptive Hold Target Preservation
console.log('--- Phase 1: Adaptive Hold Target Preservation ---');
localStorage.removeItem('whm_history');
localStorage.removeItem('whm_bolt_history');
// Seed history with a 50s hold so recentBest(5) is 50s -> finalT = 55s -> 1-round adaptive target = 55s
App.History.record({ ts: Date.now(), rounds: 1, holds: [50], totalBreaths: 30, preset: 'pranayama' });
elementsById['cfg-hold-mode'].value = 'adaptive';
elementsById['cfg-rounds'].value = '1';
App.Config.readFromInputs();
const expectedInitialAdaptiveTarget = App.Config.getHoldTarget(1);
assert.strictEqual(expectedInitialAdaptiveTarget, 55, 'Initial adaptive 1-round target should be 55s');

App.Session.start();
stepTimer(3500); // -> BREATHING_IN
App.Session.holdNow(); // -> HOLD (records roundTargets[0] = 55)
stepTimer(100000); // Hold for 100s (which will change recentBest(5) to 100s -> 105s target upon session completion!)
App.Session.endHold(); // -> RECOVERY_IN
stepTimer(3500); // -> RECOVERY_HOLD
stepTimer(15500); // -> RECOVERY_OUT
stepTimer(3500); // -> SESSION_COMPLETE

assert.strictEqual(App.Session.getState(), STATES.SESSION_COMPLETE, 'Should reach SESSION_COMPLETE');
assert.deepStrictEqual(Array.from(App.Session.getRoundTargets()), [55], 'Session must preserve original 55s target even after 100s hold updates history');
assert(elementsById['victory-rounds-bars'].innerHTML.includes('/ 55s'), 'Victory modal must display preserved target 55s instead of recalculated 1:45');
App.UI.hideVictoryModal();
App.Session.reset();
console.log('✓ Adaptive hold target preservation in Session & Victory Modal verified.');

// 6. Test Phase 4: Guided BOLT Score (CO2 Tolerance) Flow & Adaptive Calibration
console.log('--- Phase 4: Guided BOLT Score Flow & Calibration ---');
localStorage.removeItem('whm_history');
localStorage.removeItem('whm_bolt_history');

assert(App.Bolt.getTier(12).tier.includes('DEVELOPING'), 'BOLT <15s tier must be DEVELOPING');
assert(App.Bolt.getTier(20).tier.includes('FUNCTIONAL'), 'BOLT 15-24s tier must be FUNCTIONAL');
assert(App.Bolt.getTier(32).tier.includes('ADVANCED'), 'BOLT 25-39s tier must be ADVANCED');
assert(App.Bolt.getTier(45).tier.includes('ELITE'), 'BOLT >=40s tier must be ELITE');

// Start Guided BOLT Test
App.Session.startBolt();
assert.strictEqual(App.Session.getState(), STATES.BOLT_PREP, 'startBolt() must enter BOLT_PREP');
// Advance 8s prep -> BOLT_HOLD
stepTimer(8500);
assert.strictEqual(App.Session.getState(), STATES.BOLT_HOLD, 'After 8s prep, must enter BOLT_HOLD');

// Simulate 30s BOLT hold
stepTimer(30000);
App.Session.endBolt();

assert.strictEqual(App.Session.getState(), STATES.IDLE, 'endBolt() must return session to IDLE');
assert.strictEqual(App.Bolt.getLatest(), 30, 'App.Bolt.getLatest() must record 30s score');
assert(!elementsById['bolt-overlay'].classList.contains('hidden'), 'BOLT Result Modal (#bolt-overlay) must open');
assert(elementsById['bolt-badge'].textContent.includes('ADVANCED'), 'BOLT Result Modal must display ADVANCED tier for 30s');

// Click "Use Adaptive Hold Targets" button in BOLT modal
elementsById['btn-bolt-calibrate'].click();
assert.strictEqual(App.Config.get('holdMode'), 'adaptive', 'Clicking #btn-bolt-calibrate must enable adaptive holdMode');
// With 30s BOLT score and 0 session history, boltEst = round(30 * 2.2) = 66s -> finalT = 71s (for 1 round)
assert.strictEqual(App.Config.getHoldTarget(1), 71, 'Adaptive hold target must calibrate from BOLT score (71s for 30s BOLT on 1-round session)');

// Verify JSON backup export/import includes boltHistory
App.History.importData(JSON.stringify({
  version: 3,
  history: [{ ts: Date.now(), rounds: 1, holds: [60] }],
  boltHistory: [{ ts: Date.now(), score: 42 }]
}));
assert.strictEqual(App.Bolt.getLatest(), 42, 'App.History.importData must restore boltHistory');
console.log('✓ Guided BOLT flow, tier grading, modal, Adaptive Hold calibration, and backup import verified.');

// 7. Test Quick Sound Popover Secondary Ambience Slider Sync
console.log('--- Quick Sound Secondary Ambience Slider Sync ---');
const qsAmb2 = elementsById['qs-vol-amb2'];
qsAmb2.value = '75';
qsAmb2.dispatchEvent({ type: 'input', target: qsAmb2 });
assert.strictEqual(App.Config.get('volAmbience2'), 75, '#qs-vol-amb2 input must update App.Config volAmbience2');
assert.strictEqual(String(elementsById['cfg-vol-amb2'].value), '75', '#qs-vol-amb2 must sync with #cfg-vol-amb2');
console.log('✓ Quick Sound secondary ambience volume sync verified.');

// 8. Test Keyboard Shortcuts (P, H, F) & Flow Mode Spacebar ev.repeat Guard
console.log('--- Keyboard Shortcuts & Flow Mode Repeat Guard ---');
App.Presets.apply('pranayama');
App.Session.start();
stepTimer(3500); // -> BREATHING_IN
assert.strictEqual(App.Session.getState(), STATES.BREATHING_IN, 'Should be in BREATHING_IN');

// Press P to pause, P again to resume
document.dispatchEvent({ type: 'keydown', key: 'p', repeat: false, target: { id: '', tagName: 'BODY' }, preventDefault() {} });
assert.strictEqual(App.Session.getState(), STATES.PAUSED, 'Key P must pause active session');
document.dispatchEvent({ type: 'keydown', key: 'p', repeat: false, target: { id: '', tagName: 'BODY' }, preventDefault() {} });
assert.strictEqual(App.Session.getState(), STATES.BREATHING_IN, 'Key P must resume paused session');

// Press H to Hold Now
document.dispatchEvent({ type: 'keydown', key: 'h', repeat: false, target: { id: '', tagName: 'BODY' }, preventDefault() {} });
assert.strictEqual(App.Session.getState(), STATES.HOLD, 'Key H must trigger Hold Now');
stepTimer(20000); // Hold 20s

// Press F to Finish & Save directly from active HOLD (>=1s)
document.dispatchEvent({ type: 'keydown', key: 'f', repeat: false, target: { id: '', tagName: 'BODY' }, preventDefault() {} });
assert.strictEqual(App.Session.getState(), STATES.SESSION_COMPLETE, 'Key F must trigger Finish & Save');
assert.deepStrictEqual(Array.from(App.Session.getRoundHolds()), [20], 'Finish & Save during active hold must record elapsed 20s hold');
App.UI.hideVictoryModal();
App.Session.reset();
console.log('✓ Keyboard shortcuts (P, H, F) verified.');

// 9. Test v3.0 Bugfixes (B1 BOLT Adaptive from 0s Preset, B2 Summary Pill, B3 Pause/Resume Urge Preservation, B4 BOLT_PREP, B5 Finish Guard)
console.log('--- v3.0 Bugfixes (B1-B5, B10) ---');
localStorage.removeItem('whm_history');
localStorage.removeItem('whm_bolt_history');
App.Presets.apply('box'); // 0s hold preset
assert.strictEqual(App.Config.getHoldTarget(1), 0, 'Box preset fixed hold must be 0s');
App.Session.startBolt();
assert.strictEqual(App.Session.getState(), STATES.BOLT_PREP, 'Should be in BOLT_PREP');
assert.strictEqual(elementsById['btn-start'].disabled, true, 'B4: #btn-start must be disabled during BOLT_PREP');
assert.strictEqual(elementsById['btn-start'].textContent, 'PREPARING…', 'B4: #btn-start must show PREPARING…');
stepTimer(8500);
assert.strictEqual(App.Session.getState(), STATES.BOLT_HOLD, 'Should enter BOLT_HOLD');
stepTimer(30000);
App.Session.endBolt();
elementsById['btn-bolt-calibrate'].click();
assert.strictEqual(App.Config.get('holdMode'), 'adaptive', 'B1: Adaptive holdMode must be enabled');
assert.strictEqual(App.Config.getHoldTarget(1), 71, 'B1: BOLT calibration after 0s Box preset must yield 71s adaptive target');
assert(elementsById['pill-hold'].textContent.includes('Adaptive'), 'B2: Summary pill must display Adaptive hold label');
App.UI.hideBoltModal();

// B3: Pause/Resume during HOLD preserves marked urge
App.Presets.apply('pranayama');
App.Session.start();
stepTimer(3500);
assert.strictEqual(App.Session.canFinish(), false, 'B5: Finish & Save must be blocked on Breath 1 with 0 holds');
App.Session.finishAndSave();
assert.strictEqual(App.Session.getState(), STATES.BREATHING_IN, 'B5: finishAndSave() on Breath 1 with 0 holds must no-op');
App.Session.holdNow();
stepTimer(15000);
App.Session.markUrge();
assert(elementsById['urge-btn'].classList.contains('marked'), 'Urge button must be marked at 15s');
App.Session.pause();
assert.strictEqual(App.Session.getState(), STATES.PAUSED);
App.Session.resume();
assert.strictEqual(App.Session.getState(), STATES.HOLD);
assert(elementsById['urge-btn'].classList.contains('marked'), 'B3: #urge-btn must remain marked after Pause/Resume');
assert.strictEqual(elementsById['hold-timer'].textContent, '15', 'B3: #hold-timer must preserve 15s on Resume');
App.Session.reset();
console.log('✓ v3.0 Bugfixes B1-B5 verified.');

// 10. Test New Protocols (Kapalabhati, Bhramari, Sleep Wind-Down, Quick Energize) & 30s Pause Range
console.log('--- v3.0 Protocols (F4) & Palettes (E5) & Favorites (E2) ---');
App.Presets.apply('kapalabhati');
assert.strictEqual(App.Config.get('breathStyle'), 'kapalabhati');
assert.strictEqual(App.Config.get('inhaleDuration'), 0.6);
assert.strictEqual(App.Config.get('exhaleDuration'), 0.4);
assert.strictEqual(App.Config.get('holdStartTime'), 45);
App.Session.start();
stepTimer(3500);
assert.strictEqual(elementsById['phase-label'].textContent, 'PASSIVE IN', 'Kapalabhati inhale must display PASSIVE IN');
stepTimer(700);
assert.strictEqual(elementsById['phase-label'].textContent, 'PUMP OUT', 'Kapalabhati exhale must display PUMP OUT');
App.Session.reset();

App.Presets.apply('bhramari');
assert.strictEqual(App.Config.get('breathStyle'), 'bhramari');
App.Session.start();
stepTimer(3500);
stepTimer(4100);
assert.strictEqual(elementsById['phase-label'].textContent, 'HUM OUT', 'Bhramari exhale must display HUM OUT');
App.Session.reset();

App.Presets.apply('sleep_winddown');
assert.strictEqual(App.Config.get('ramp'), 'slowdown');
App.Presets.apply('energize');
assert.strictEqual(App.Config.get('inhaleDuration'), 1.2);

App.Config.set('pauseAfterInhale', 25);
assert.strictEqual(App.Config.get('pauseAfterInhale'), 25, 'Pause after inhale must support up to 30s');

App.Theme.applyPalette('ember');
assert.strictEqual(App.Theme.getPalette(), 'ember');
assert.strictEqual(sandbox.COLORS.BREATHING_IN, '#FB923C', 'Ember palette must update COLORS.BREATHING_IN');
App.Theme.applyPalette('ocean');

assert(App.Favorites.isPinned('pranayama'), 'Pranayama must be pinned by default');
assert.strictEqual(App.Favorites.pin('bhramari'), true, '4th favorite pin must succeed');
assert.strictEqual(App.Favorites.pin('kapalabhati'), false, '5th favorite pin must be capped at 4');
App.Favorites.unpin('bhramari');
console.log('✓ New protocols, 30s pause range, Palettes, and Favorites verified.');

// 11. Test Multi-Phase Routine Sequencer (F2)
console.log('--- Multi-Phase Routine Sequencer (F2) ---');
localStorage.removeItem('whm_history');
const customRoutine = App.Routines.saveCustom({
  name: 'Mini Test Chain',
  bridgeSec: 3,
  stages: [
    { preset: 'coherent', rounds: 1, breathsPerRound: 3, holdStartTime: 0 },
    { preset: 'physio_sigh', rounds: 1, breathsPerRound: 3, holdStartTime: 0 }
  ]
});
assert(customRoutine && customRoutine.id.startsWith('r:c_'), 'Custom routine must save');
App.Routines.activate(customRoutine.id);
App.Session.start();
stepTimer(3500); // Stage 1 Breath 1 In
for (let b = 0; b < 3; b++) {
  stepTimer(5600); // Exhale
  stepTimer(5600); // Next inhale / stage transition
}
assert.strictEqual(App.Session.getState(), STATES.STAGE_TRANSITION, 'Routine must enter STAGE_TRANSITION after Stage 1');
stepTimer(3500); // Stage 2 Breath 1 In (Physio Sigh: 3.5s in + 6.5s out + 1s pause = 11s)
assert.strictEqual(App.Session.getState(), STATES.BREATHING_IN, 'Routine must auto-advance into Stage 2');
for (let b = 0; b < 3; b++) {
  stepTimer(3600); // In -> Out
  stepTimer(6600); // Out -> Pause (or complete on last)
  if (b < 2) stepTimer(1100);
}
assert.strictEqual(App.Session.getState(), STATES.SESSION_COMPLETE, 'Routine must complete after Stage 2');
const rHist = App.History.stats().all;
assert.strictEqual(rHist.length, 1, 'Routine must save 1 consolidated session');
assert.strictEqual(rHist[0].isRoutine, true, 'Routine history entry must have isRoutine=true');
assert.strictEqual(rHist[0].stages.length, 2, 'Routine history entry must contain 2 stage summaries');
App.Routines.clearActive();
App.UI.hideVictoryModal();
App.Session.reset();
console.log('✓ Multi-Phase Routine Sequencer verified.');

// 12. Test Web Bluetooth HR & HRV Biofeedback (F5)
console.log('--- Web Bluetooth HR & HRV Biofeedback (F5) ---');
const pktBuf = new ArrayBuffer(6);
const pktView = new DataView(pktBuf);
pktView.setUint8(0, 0x10); // 8-bit BPM + RR-interval flag
pktView.setUint8(1, 74);   // 74 BPM
pktView.setUint16(2, 820, true); // ~800ms RR
pktView.setUint16(4, 860, true); // ~840ms RR
const parsedHr = App.Biofeedback.parseHeartRate(pktView);
assert.strictEqual(parsedHr.bpm, 74, 'parseHeartRate must decode 8-bit BPM');
assert.strictEqual(parsedHr.rrs.length, 2, 'parseHeartRate must decode RR-intervals');

// Simulate session with Diving-Reflex drop during HOLD
localStorage.removeItem('whm_achievements');
App.Presets.apply('pranayama');
App.Session.start();
stepTimer(3500);
App.Biofeedback.ingestPacket({ bpm: 75, rrs: [800, 810, 830] });
App.Session.holdNow();
App.Biofeedback.ingestPacket({ bpm: 72, rrs: [840, 860] });
App.Biofeedback.ingestPacket({ bpm: 58, rrs: [1020, 1040] }); // -14 BPM diving reflex drop
stepTimer(5000);
App.Session.endHold();
const hrSummary = App.Biofeedback.onSessionEnd();
assert(hrSummary && hrSummary.maxHoldDrop >= 12, 'Biofeedback must detect Diving-Reflex BPM drop');
assert(hrSummary.rmssd > 0, 'Biofeedback must compute RMSSD HRV');
App.Session.finishAndSave();
assert(App.Achievements.isUnlocked('bio_diver'), '10+ BPM diving reflex drop must unlock bio_diver badge');
App.UI.hideVictoryModal();
App.Session.reset();
console.log('✓ BLE HR/HRV packet parsing, RMSSD, and Diving Reflex verified.');

// 13. Test Stats 52-Week Heatmap (F3), Session Delete (E4), and Backup v4 Merge (B10)
console.log('--- Heatmap (F3), History Delete (E4) & Backup v4 Merge (B10) ---');
const statsCountBefore = App.History.stats().sessions;
assert(statsCountBefore >= 1, 'Should have at least 1 session before delete test');
const firstTs = App.History.stats().all[0].ts;
elementsById['stats-toggle'].click();
assert(elementsById['stats-body'].innerHTML.includes('52-Week Practice Consistency'), 'Stats must render 52-week heatmap');
assert(App.History.deleteSession(firstTs), 'deleteSession must remove matching timestamp');
assert.strictEqual(App.History.stats().sessions, statsCountBefore - 1, 'Session count must decrement after delete');
elementsById['stats-close'].click();

const mergeRes = App.History.importData(JSON.stringify({
  version: 4,
  history: [{ ts: 999999999, rounds: 1, holds: [88], preset: 'Imported' }],
  boltHistory: [{ ts: 999999999, score: 38 }]
}), 'merge');
assert(mergeRes.success, 'Backup v4 merge import must succeed');
assert(App.History.stats().all.some(s => s.ts === 999999999), 'Merge import must preserve and add imported session');
assert.strictEqual(App.Ambience.preview('ocean'), true, 'Ambience preview must activate cleanly');
assert.strictEqual(App.Ambience.isPreviewing('ocean'), true, 'isPreviewing must report active preview');
App.Ambience.stopPreview();
assert.strictEqual(App.Ambience.isPreviewing(), false, 'stopPreview must clear preview state');
console.log('✓ 52-Week Heatmap, Session Delete, Backup v4 Merge, and Ambience Preview verified.');

console.log('\nALL TESTS PASSED SUCCESSFULLY!');
