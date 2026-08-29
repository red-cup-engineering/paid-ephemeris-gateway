/**
 * `app` -- Equivo's browser face. Vanilla ES modules, no framework, no build step beyond
 * `npm run build:web` (which produces `data/equivo-world.json` and `js/vendor/**`, both of which
 * this file loads at runtime). House pattern vendored in SHAPE (not bytes) from
 * `lantern-service/web/js/app.js`: fetch the compiled world, hydrate it against the local save,
 * render a room list + a content pane, run exercise/review sessions through the REAL vendored
 * checkers -- never a client-side mock of the grading logic.
 *
 * Two disclosed, deliberate UX choices this file makes that the design docs do not themselves
 * specify a widget shape for (self-education-platform-design.md leaves exercise UI to the build):
 *
 *   1. First pass through a room (the "gate") is a LEARNING pass: a failed answer shows its real
 *      diagnosis and lets the player retry the same exercise immediately, with no cost and no
 *      SRS state written until they pass -- matching the platform's own no-list ("no energy/lives
 *      gate... no streak-loss shaming"). A later REVIEW pass is a single-shot honest recall check
 *      (a wrong answer records grade 1/Again and moves on) -- the standard Anki/FSRS distinction
 *      between learning a card and reviewing one, applied here because Equivo's checkers are the
 *      same real functions in both passes; only the retry policy differs.
 *   2. `measure`/`settle`/`observe` answers are structured widgets (toggles/selects), not free
 *      text, because their real checkers (`themes/equivo/registry.mts`) compare structured values
 *      (`[boolean,boolean]`, a boolean claim, an enum regime) -- a text box inviting typos would
 *      punish spelling, not understanding. `distinguish`/`relate` ARE free text, deliberately:
 *      their real checkers compare against `articulate`/`predicate`'s output, which is exactly
 *      the two phrases already sitting in the prompt's own sentence -- a close-reading exercise
 *      by construction (see `registry.mts`: `predicate` sets `entities=[left]`, `predicates=
 *      [right]` off the same `[token, claim]` split `articulate` names `potential`).
 */
import { renderMarkdown, stripExerciseFences } from './markdown.js';
import { hydrateExercises, gradeExercise, exercisesByRoom } from './vendor/src/checker.js';
import { equivoCheckers, nameOfCharge } from './vendor/themes/equivo/registry.js';
import { equivoRegisters } from './vendor/themes/equivo/registers/index.js';
import { renderTerm, isFullyAbsent } from './vendor/src/register.js';
import { reviewCard, recallProbability, STAGE_CUTS } from './vendor/src/srs.js';
import { buildGateSession, buildReviewSession } from './vendor/src/session.js';
import { recallMastery, roomMastery } from './vendor/src/mastery.js';
import * as playerStore from './state.js';

const SEED_DEFAULTS = { stability: 0, difficulty: 5 }; // pre-first-review placeholder, Lantern's own convention (persistence.mts §1 note)
const REGIME_OPTIONS = ['finite', 'scott', 'transfinite', 'aperiodic'];

const els = {
  loadStatus: document.getElementById('load-status'),
  roomList: document.getElementById('room-list'),
  content: document.getElementById('content-panel'),
  lensSelect: document.getElementById('lens-select'),
  lensBanner: document.getElementById('lens-absence-banner'),
  streak: document.getElementById('streak-display'),
  btnExport: document.getElementById('btn-export'),
  btnImport: document.getElementById('btn-import'),
  fileImport: document.getElementById('file-import'),
};

/** @type {{world: any, byRoom: Map<string, any[]>, exercises: any[]}} */
let world;
let playerState = playerStore.loadState();
let currentLens = playerStore.loadLens();
let currentRoomId = null;
/** Active exercise session, or null when the content pane is showing a reading pane. */
let session = null; // { roomId, mode: 'gate'|'review', queue, index, retryAnswerCallback }

function today() {
  return playerStore.today();
}

function save() {
  playerStore.saveState(playerState);
}

// ---------------------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------------------

async function boot() {
  try {
    const res = await fetch('data/equivo-world.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    const { exercises, unregisteredKinds } = hydrateExercises(raw.exercises, equivoCheckers);
    if (unregisteredKinds.length > 0) {
      // Loud, not silent -- matches hydrateExercises' own contract. Should never happen against
      // a corpus that passed `npm run verify`'s "every exercise kind resolved to a real checker"
      // suite; if it does, it means the served data/equivo-world.json is stale relative to the
      // registry, which is itself worth surfacing rather than quietly dropping exercises.
      console.warn('unregistered exercise kinds:', unregisteredKinds);
    }
    world = { raw, exercises, byRoom: exercisesByRoom(exercises) };
    els.loadStatus.textContent = '';
    renderLensOptions();
    renderRoomList();
    renderStreak();
    const first = pickInitialRoom();
    if (first) openRoom(first);
  } catch (err) {
    els.loadStatus.textContent = `Could not load the course: ${err instanceof Error ? err.message : String(err)}`;
  }
}

function pickInitialRoom() {
  if (currentRoomId && world.raw.rooms.some((r) => r.id === currentRoomId)) return currentRoomId;
  return world.raw.rooms[0]?.id ?? null;
}

// ---------------------------------------------------------------------------------------
// Gate / mastery predicates (mirrors self-education-platform-design.md §4/§5, over local state)
// ---------------------------------------------------------------------------------------

function roomExercises(roomId) {
  return world.byRoom.get(roomId) ?? [];
}

function effectiveState(exerciseId) {
  return playerStore.effectiveExerciseState(playerState, exerciseId, SEED_DEFAULTS);
}

/** A room with zero exercises (the overview room) counts as gated by definition -- there is
 * nothing to pass. */
function roomGatedOnce(roomId) {
  const exs = roomExercises(roomId);
  if (exs.length === 0) return true;
  return exs.every((ex) => effectiveState(ex.id).lastReviewedAt !== undefined);
}

function roomUnlocked(roomId) {
  const incoming = world.raw.doors.filter((d) => d.to === roomId && d.weight === 'hard');
  if (incoming.length === 0) return true;
  return incoming.every((d) => roomGatedOnce(d.from));
}

function roomRecall(roomId, now) {
  const exs = roomExercises(roomId);
  const inputs = exs.map((ex) => {
    const s = effectiveState(ex.id);
    return { stability: s.stability, lastReviewedAt: s.lastReviewedAt };
  });
  return recallMastery(inputs, now);
}

// ---------------------------------------------------------------------------------------
// Room list
// ---------------------------------------------------------------------------------------

function renderRoomList() {
  els.roomList.innerHTML = '';
  const now = today();
  for (const room of world.raw.rooms) {
    const unlocked = roomUnlocked(room.id);
    const gated = roomGatedOnce(room.id);
    const recall = roomRecall(room.id, now);
    const mastered = roomMastery(recall, gated) && roomExercises(room.id).length > 0;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'room-item' + (unlocked ? ' unlocked' : '') + (mastered ? ' mastered' : '');
    btn.disabled = !unlocked;
    btn.setAttribute('aria-current', String(room.id === currentRoomId));
    btn.title = unlocked ? room.title : 'Locked -- clear the previous room first';

    const dot = document.createElement('span');
    dot.className = 'room-dot';
    dot.setAttribute('aria-hidden', 'true');
    btn.appendChild(dot);

    const label = document.createElement('span');
    label.className = 'room-title';
    label.textContent = room.title;
    btn.appendChild(label);

    if (unlocked && roomExercises(room.id).length > 0) {
      const m = document.createElement('span');
      m.className = 'room-mastery';
      m.textContent = recall === undefined ? '' : `${Math.round(recall * 100)}%`;
      btn.appendChild(m);
    }

    btn.addEventListener('click', () => {
      if (!unlocked) return;
      openRoom(room.id);
    });
    els.roomList.appendChild(btn);
  }

  const reviewCount = dueReviewCandidates().length;
  const reviewBtn = document.createElement('button');
  reviewBtn.type = 'button';
  reviewBtn.className = 'room-item unlocked';
  reviewBtn.setAttribute('aria-current', String(currentRoomId === '__review__'));
  reviewBtn.innerHTML = `<span class="room-dot" aria-hidden="true"></span><span class="room-title">Review queue</span><span class="room-mastery">${reviewCount}</span>`;
  reviewBtn.addEventListener('click', () => openReview());
  els.roomList.appendChild(reviewBtn);
}

// ---------------------------------------------------------------------------------------
// Reading pane
// ---------------------------------------------------------------------------------------

function openRoom(roomId) {
  currentRoomId = roomId;
  session = null;
  renderRoomList();
  const room = world.raw.rooms.find((r) => r.id === roomId);
  const exs = roomExercises(roomId);
  const hall = world.raw.halls.find((h) => h.rooms.includes(roomId));

  els.content.innerHTML = '';
  const h2 = document.createElement('h2');
  h2.textContent = room.title;
  if (hall) {
    const badge = document.createElement('span');
    badge.className = 'hall-badge';
    badge.textContent = hall.stable ? 'hall: stable' : 'hall: not yet braced';
    h2.appendChild(badge);
  }
  els.content.appendChild(h2);

  const body = document.createElement('div');
  body.innerHTML = renderMarkdown(stripExerciseFences(room.body));
  els.content.appendChild(body);

  const gated = roomGatedOnce(roomId);
  if (exs.length === 0) {
    const next = world.raw.doors.find((d) => d.from === roomId)?.to;
    if (next) {
      const btn = document.createElement('button');
      btn.className = 'primary';
      btn.type = 'button';
      btn.textContent = 'Begin →';
      btn.addEventListener('click', () => openRoom(next));
      els.content.appendChild(btn);
    }
    return;
  }

  const kinds = new Set(exs.map((e) => e.kind)).size;
  const btn = document.createElement('button');
  btn.className = 'primary';
  btn.type = 'button';
  btn.textContent = gated ? `Practice again (${exs.length} exercises, ${kinds} kinds)` : `Begin exercises (${exs.length}, ${kinds} kinds)`;
  btn.addEventListener('click', () => startGate(roomId));
  els.content.appendChild(btn);
}

// ---------------------------------------------------------------------------------------
// Presentation register (lens)
// ---------------------------------------------------------------------------------------

function lensDisplayName(id) {
  return id.replace(/^equivo-/, '').replace(/^\w/, (c) => c.toUpperCase());
}

function renderLensOptions() {
  els.lensSelect.innerHTML = '';
  for (const id of Object.keys(equivoRegisters)) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = isFullyAbsent(equivoRegisters[id]) ? `${lensDisplayName(id)} (absent)` : lensDisplayName(id);
    if (id === currentLens) opt.selected = true;
    els.lensSelect.appendChild(opt);
  }
  updateLensBanner();
}

function updateLensBanner() {
  const register = equivoRegisters[currentLens];
  if (register && isFullyAbsent(register)) {
    els.lensBanner.hidden = false;
    els.lensBanner.textContent = `${lensDisplayName(currentLens)} lens: every term is a structural absence, not a placeholder -- ${register.terms.distinguish.reason}`;
  } else {
    els.lensBanner.hidden = true;
  }
}

els.lensSelect.addEventListener('change', () => {
  currentLens = els.lensSelect.value;
  playerStore.saveLens(currentLens);
  updateLensBanner();
  if (session) renderExerciseStep();
});

function exerciseCaption(kind) {
  const register = equivoRegisters[currentLens];
  if (!register) return null;
  const entry = register.terms[kind];
  const p = document.createElement('p');
  p.className = 'exercise-caption' + (entry && entry.state === 'absent' ? ' absent' : '');
  p.textContent = `In the ${lensDisplayName(currentLens)} lens, this stage (${kind}) is: ${renderTerm(register, kind)}`;
  return p;
}

// ---------------------------------------------------------------------------------------
// Streak
// ---------------------------------------------------------------------------------------

function renderStreak() {
  const s = playerState.streak;
  const atRisk = playerStore.streakAtRisk(s, today());
  els.streak.textContent = s.current > 0
    ? `🔥 ${s.current}-day streak${atRisk ? ' (review today to keep it)' : ''} · ${s.freezeTokens} freeze token${s.freezeTokens === 1 ? '' : 's'}`
    : 'No streak yet -- pass an exercise to start one.';
}

function markActivity() {
  playerState = { ...playerState, streak: playerStore.touchStreak(playerState.streak, today()) };
  save();
  renderStreak();
}

// ---------------------------------------------------------------------------------------
// Export / import (self-education-platform-design.md §7's documented seam)
// ---------------------------------------------------------------------------------------

els.btnExport.addEventListener('click', () => {
  const blob = new Blob([playerStore.exportStateJson(playerState)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'equivo-save.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

els.btnImport.addEventListener('click', () => els.fileImport.click());
els.fileImport.addEventListener('change', async () => {
  const file = els.fileImport.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    playerState = playerStore.importStateJson(text);
    save();
    renderStreak();
    renderRoomList();
    if (currentRoomId) openRoom(currentRoomId);
  } catch (err) {
    alert(`Could not import save: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    els.fileImport.value = '';
  }
});

// ---------------------------------------------------------------------------------------
// Sessions: gate (learning pass) + review (honest recall pass)
// ---------------------------------------------------------------------------------------

function dueReviewCandidates() {
  const now = today();
  const candidates = world.exercises
    .map((ex) => {
      const s = effectiveState(ex.id);
      if (s.lastReviewedAt === undefined) return null;
      return { exercise: ex, stability: s.stability, lastReviewedAt: s.lastReviewedAt };
    })
    .filter(Boolean);
  return buildReviewSession(candidates, now, seedFor('review'), undefined).filter((c) => c.R < STAGE_CUTS.full);
}

function seedFor(tag) {
  // App-level seed choice, not a kernel purity concern (buildGateSession/buildReviewSession are
  // pure given whatever seed they're handed) -- a fresh seed per session start, so repeat visits
  // to the same room don't present exercises in the same order every time.
  let h = 2166136261;
  const s = `${tag}:${Date.now()}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function startGate(roomId) {
  const exs = roomExercises(roomId);
  const queue = buildGateSession(roomId, exs, seedFor(roomId)).map((exercise) => ({ exercise, mode: 'gate' }));
  session = { roomId, mode: 'gate', queue, index: 0 };
  renderExerciseStep();
}

function openReview() {
  currentRoomId = '__review__';
  session = null;
  renderRoomList();
  const due = dueReviewCandidates();
  els.content.innerHTML = '';
  const h2 = document.createElement('h2');
  h2.textContent = 'Review queue';
  els.content.appendChild(h2);
  const p = document.createElement('p');
  p.textContent = due.length === 0
    ? 'Nothing is due for review right now -- everything reviewed so far is still comfortably above the 90% recall bar.'
    : `${due.length} exercise${due.length === 1 ? '' : 's'} due, weakest recall first (real FSRS-lite scheduling, not a fixed list).`;
  els.content.appendChild(p);
  if (due.length === 0) return;
  const btn = document.createElement('button');
  btn.className = 'primary';
  btn.type = 'button';
  btn.textContent = `Start review (${due.length})`;
  btn.addEventListener('click', () => {
    const queue = due.map((c) => ({ exercise: c.exercise, mode: 'review' }));
    session = { roomId: '__review__', mode: 'review', queue, index: 0 };
    renderExerciseStep();
  });
  els.content.appendChild(btn);
}

function renderExerciseStep() {
  const { queue, index } = session;
  const step = queue[index];
  els.content.innerHTML = '';

  const strip = document.createElement('div');
  strip.className = 'progress-strip';
  queue.forEach((_, i) => {
    const d = document.createElement('span');
    d.className = 'progress-dot' + (i < index ? ' done' : i === index ? ' current' : '');
    strip.appendChild(d);
  });
  els.content.appendChild(strip);

  const caption = exerciseCaption(step.exercise.kind);
  if (caption) els.content.appendChild(caption);

  const promptEl = document.createElement('p');
  promptEl.className = 'exercise-prompt';
  promptEl.textContent = step.exercise.prompt;
  els.content.appendChild(promptEl);

  const specList = renderSpecContext(step.exercise);
  if (specList) els.content.appendChild(specList);

  const { form, readAnswer } = buildAnswerForm(step.exercise);
  els.content.appendChild(form);

  const submitBtn = document.createElement('button');
  submitBtn.type = 'button';
  submitBtn.className = 'primary';
  submitBtn.textContent = 'Check';
  form.appendChild(submitBtn);

  submitBtn.addEventListener('click', () => {
    let answer;
    try {
      answer = readAnswer();
    } catch (err) {
      showVerdict({ pass: false, diagnosis: err instanceof Error ? err.message : String(err) }, step, () => {});
      return;
    }
    const verdict = gradeExercise(step.exercise, answer);
    handleVerdict(verdict, step);
  });
}

/** A small, honest readout of the exercise's own spec (never the answer) -- e.g. the relation
 * cells a `settle` exercise is asking about, or the stages an `observe` exercise describes.
 * Nothing here is graded; it's the same information the prompt already implies, laid out. */
function renderSpecContext(ex) {
  const spec = ex.spec;
  const ul = document.createElement('ul');
  ul.className = 'spec-list';
  if (ex.kind === 'settle' || ex.kind === 'repair') {
    for (const c of spec.cells) {
      const li = document.createElement('li');
      li.textContent = `${c.subject} —${c.predicate}→ ${c.object}`;
      ul.appendChild(li);
    }
  } else if (ex.kind === 'observe') {
    spec.stages.forEach((s, i) => {
      const li = document.createElement('li');
      li.textContent = `stage ${i}${s.limit ? ' (limit)' : ''}: designated {${s.designated.join(', ')}}`;
      ul.appendChild(li);
    });
    if (spec.opts?.cofinal) {
      const li = document.createElement('li');
      li.textContent = `cofinal: ${spec.opts.cofinal}`;
      ul.appendChild(li);
    }
  } else {
    return null;
  }
  return ul;
}

function buildAnswerForm(ex) {
  const form = document.createElement('div');
  form.className = 'answer-form';

  if (ex.kind === 'distinguish' || ex.kind === 'relate') {
    const isDistinguish = ex.kind === 'distinguish';
    const f1 = document.createElement('div');
    f1.className = 'answer-field';
    const l1 = document.createElement('label');
    l1.textContent = isDistinguish ? 'The token (mark)' : 'The entity';
    const i1 = document.createElement('input');
    i1.type = 'text';
    i1.autocomplete = 'off';
    l1.appendChild(i1);
    f1.appendChild(l1);

    const f2 = document.createElement('div');
    f2.className = 'answer-field';
    const l2 = document.createElement('label');
    l2.textContent = isDistinguish ? 'The claim (kind)' : 'The predicate';
    const i2 = document.createElement('input');
    i2.type = 'text';
    i2.autocomplete = 'off';
    l2.appendChild(i2);
    f2.appendChild(l2);

    form.appendChild(f1);
    form.appendChild(f2);
    form.readAnswer = () => {
      const a = i1.value.trim();
      const b = i2.value.trim();
      if (!a || !b) throw new Error('answer both fields');
      return isDistinguish ? { potential: [a, b] } : { entities: [a], predicates: [b] };
    };
    return { form, readAnswer: form.readAnswer };
  }

  if (ex.kind === 'measure') {
    const row = document.createElement('div');
    row.className = 'toggle-row';
    const kLabel = document.createElement('label');
    const kInput = document.createElement('input');
    kInput.type = 'checkbox';
    kLabel.appendChild(kInput);
    kLabel.appendChild(document.createTextNode('knowledge bit lit (asserted)'));
    const tLabel = document.createElement('label');
    const tInput = document.createElement('input');
    tInput.type = 'checkbox';
    tLabel.appendChild(tInput);
    tLabel.appendChild(document.createTextNode('truth bit lit (confirmed)'));
    row.appendChild(kLabel);
    row.appendChild(tLabel);
    form.appendChild(row);

    const preview = document.createElement('p');
    preview.className = 'charge-preview';
    const updatePreview = () => {
      preview.textContent = `= ${nameOfCharge([kInput.checked, tInput.checked])}`;
    };
    kInput.addEventListener('change', updatePreview);
    tInput.addEventListener('change', updatePreview);
    updatePreview();
    form.appendChild(preview);

    const readAnswer = () => ({ value: [kInput.checked, tInput.checked] });
    form.readAnswer = readAnswer;
    return { form, readAnswer };
  }

  if (ex.kind === 'settle') {
    const row = document.createElement('div');
    row.className = 'radio-row';
    for (const [value, label] of [['true', 'Equivalent (one class)'], ['false', 'Not equivalent']]) {
      const l = document.createElement('label');
      const inp = document.createElement('input');
      inp.type = 'radio';
      inp.name = 'settle-claim';
      inp.value = value;
      l.appendChild(inp);
      l.appendChild(document.createTextNode(label));
      row.appendChild(l);
    }
    form.appendChild(row);
    const readAnswer = () => {
      const checked = form.querySelector('input[name="settle-claim"]:checked');
      if (!checked) throw new Error('choose equivalent or not');
      return { claim: checked.value === 'true' };
    };
    form.readAnswer = readAnswer;
    return { form, readAnswer };
  }

  if (ex.kind === 'observe') {
    const f1 = document.createElement('div');
    f1.className = 'answer-field';
    const l1 = document.createElement('label');
    l1.textContent = 'Regime';
    const sel = document.createElement('select');
    for (const r of REGIME_OPTIONS) {
      const o = document.createElement('option');
      o.value = r;
      o.textContent = r;
      sel.appendChild(o);
    }
    l1.appendChild(sel);
    f1.appendChild(l1);
    form.appendChild(f1);

    const row = document.createElement('div');
    row.className = 'radio-row';
    for (const [value, label] of [['true', 'H1 vanishes'], ['false', 'H1 does not vanish']]) {
      const l = document.createElement('label');
      const inp = document.createElement('input');
      inp.type = 'radio';
      inp.name = 'h1-vanishes';
      inp.value = value;
      l.appendChild(inp);
      l.appendChild(document.createTextNode(label));
      row.appendChild(l);
    }
    form.appendChild(row);

    const readAnswer = () => {
      const checked = form.querySelector('input[name="h1-vanishes"]:checked');
      if (!checked) throw new Error('choose whether H1 vanishes');
      return { regime: sel.value, h1Vanishes: checked.value === 'true' };
    };
    form.readAnswer = readAnswer;
    return { form, readAnswer };
  }

  throw new Error(`app.js: no answer widget for exercise kind "${ex.kind}"`);
}

function handleVerdict(verdict, step) {
  showVerdict(verdict, step, (grade) => applyReview(step.exercise, grade));
}

function showVerdict(verdict, step, onGraded) {
  // Remove a prior verdict block if the player is retrying.
  els.content.querySelectorAll('.verdict, .grade-row').forEach((n) => n.remove());
  const box = document.createElement('div');
  box.className = 'verdict ' + (verdict.pass ? 'pass' : 'fail');
  const strong = document.createElement('strong');
  strong.textContent = verdict.pass ? 'Correct.' : 'Not quite.';
  const p = document.createElement('p');
  p.textContent = verdict.diagnosis;
  box.appendChild(strong);
  box.appendChild(p);
  els.content.appendChild(box);

  if (verdict.pass) {
    const grades = document.createElement('div');
    grades.className = 'grade-row';
    for (const [grade, cls, label] of [[2, 'grade-hard', 'Hard'], [3, 'grade-good', 'Good'], [4, 'grade-easy', 'Easy']]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `grade ${cls}`;
      b.textContent = label;
      b.addEventListener('click', () => onGraded(grade));
      grades.appendChild(b);
    }
    els.content.appendChild(grades);
  } else if (step.mode === 'gate') {
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = 'Try again';
    retry.addEventListener('click', () => renderExerciseStep());
    els.content.appendChild(retry);
  } else {
    // Review mode, wrong answer: honest recall check, no retry -- record Again and move on.
    const cont = document.createElement('button');
    cont.type = 'button';
    cont.className = 'primary';
    cont.textContent = 'Continue';
    cont.addEventListener('click', () => applyReview(step.exercise, 1));
    els.content.appendChild(cont);
  }
}

function applyReview(exercise, grade) {
  const prior = effectiveState(exercise.id);
  const next = reviewCard(prior, grade, today());
  playerState = playerStore.recordExerciseReview(playerState, exercise.id, next);
  save();
  markActivity();

  session.index += 1;
  if (session.index >= session.queue.length) {
    finishSession();
  } else {
    renderExerciseStep();
  }
}

function finishSession() {
  const { roomId, mode } = session;
  session = null;
  renderRoomList();
  els.content.innerHTML = '';
  const h2 = document.createElement('h2');
  h2.textContent = mode === 'gate' ? 'Room cleared' : 'Review complete';
  els.content.appendChild(h2);
  const p = document.createElement('p');
  const recall = roomId === '__review__' ? undefined : roomRecall(roomId, today());
  p.textContent = recall === undefined
    ? 'Nice work.'
    : `Recall mastery for this room: ${Math.round(recall * 100)}%${recall >= STAGE_CUTS.full ? ' (mastered)' : ''}.`;
  els.content.appendChild(p);

  const backBtn = document.createElement('button');
  backBtn.className = 'primary';
  backBtn.type = 'button';
  backBtn.textContent = 'Back to unit';
  backBtn.addEventListener('click', () => {
    const next = roomId !== '__review__' ? world.raw.doors.find((d) => d.from === roomId)?.to : null;
    openRoom(next && roomUnlocked(next) ? next : (roomId !== '__review__' ? roomId : world.raw.rooms[0].id));
  });
  els.content.appendChild(backBtn);
}

boot();
