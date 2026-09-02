/** Equivo's policy and dependencies for the shared education browser runtime. */
import { equivoCheckers, nameOfCharge } from './vendor/themes/equivo/registry.js';
import { equivoRegisters } from './vendor/themes/equivo/registers/index.js';
import { renderTerm, isFullyAbsent } from './vendor/src/register.js';

const REGIME_OPTIONS = ['finite', 'scott', 'transfinite', 'aperiodic'];
const LENS_KEY = 'education-platform:equivo:lens';
const DEFAULT_LENS = 'equivo-obsmetrologia';

function lensDisplayName(id) {
  return id.replace(/^equivo-/, '').replace(/^\w/, (character) => character.toUpperCase());
}

function loadLens() {
  try { return window.localStorage.getItem(LENS_KEY) ?? DEFAULT_LENS; } catch { return DEFAULT_LENS; }
}

function saveLens(lensId) {
  try { window.localStorage.setItem(LENS_KEY, lensId); } catch { /* presentation falls back to its default */ }
}

function renderSpecContext(document, exercise) {
  const { spec } = exercise;
  const list = document.createElement('ul');
  list.className = 'spec-list';
  if (exercise.kind === 'settle' || exercise.kind === 'repair') {
    for (const cell of spec.cells) {
      const item = document.createElement('li');
      item.textContent = `${cell.subject} —${cell.predicate}→ ${cell.object}`;
      list.appendChild(item);
    }
  } else if (exercise.kind === 'observe') {
    spec.stages.forEach((stage, index) => {
      const item = document.createElement('li');
      item.textContent = `stage ${index}${stage.limit ? ' (limit)' : ''}: designated {${stage.designated.join(', ')}}`;
      list.appendChild(item);
    });
    if (spec.opts?.cofinal) {
      const item = document.createElement('li');
      item.textContent = `cofinal: ${spec.opts.cofinal}`;
      list.appendChild(item);
    }
  } else return null;
  return list;
}

function createAnswerForm(document, exercise) {
  const form = document.createElement('div');
  form.className = 'answer-form';
  if (exercise.kind === 'distinguish' || exercise.kind === 'relate') {
    const distinction = exercise.kind === 'distinguish';
    const inputs = [[distinction ? 'The token (mark)' : 'The entity'], [distinction ? 'The claim (kind)' : 'The predicate']].map(([label]) => {
      const field = document.createElement('input'); field.type = 'text'; field.autocomplete = 'off'; field.required = true;
      const wrapper = document.createElement('label'); wrapper.className = 'answer-field'; wrapper.append(label, field); form.appendChild(wrapper); return field;
    });
    return { form, readAnswer: () => {
      const [left, right] = inputs.map((input) => input.value.trim());
      if (!left || !right) throw new Error('answer both fields');
      return distinction ? { potential: [left, right] } : { entities: [left], predicates: [right] };
    } };
  }
  if (exercise.kind === 'measure') {
    const row = document.createElement('div'); row.className = 'toggle-row';
    const inputs = ['knowledge bit lit (asserted)', 'truth bit lit (confirmed)'].map((label) => {
      const input = document.createElement('input'); input.type = 'checkbox'; const wrapper = document.createElement('label'); wrapper.append(input, document.createTextNode(label)); row.appendChild(wrapper); return input;
    });
    const preview = document.createElement('p'); preview.className = 'charge-preview';
    const update = () => { preview.textContent = `= ${nameOfCharge(inputs.map((input) => input.checked))}`; };
    inputs.forEach((input) => input.addEventListener('change', update)); update(); form.append(row, preview);
    return { form, readAnswer: () => ({ value: inputs.map((input) => input.checked) }) };
  }
  if (exercise.kind === 'settle') return radioForm(document, form, 'settle-claim', [['true', 'Equivalent (one class)'], ['false', 'Not equivalent']], (value) => ({ claim: value === 'true' }), 'choose equivalent or not');
  if (exercise.kind === 'observe') {
    const select = document.createElement('select');
    for (const regime of REGIME_OPTIONS) { const option = document.createElement('option'); option.value = regime; option.textContent = regime; select.appendChild(option); }
    const label = document.createElement('label'); label.className = 'answer-field'; label.append('Regime', select); form.appendChild(label);
    return radioForm(document, form, 'h1-vanishes', [['true', 'H1 vanishes'], ['false', 'H1 does not vanish']], (value) => ({ regime: select.value, h1Vanishes: value === 'true' }), 'choose whether H1 vanishes');
  }
  throw new Error(`no answer widget for exercise kind "${exercise.kind}"`);
}

function radioForm(document, form, name, choices, map, message) {
  const row = document.createElement('div'); row.className = 'radio-row';
  for (const [index, [value, label]] of choices.entries()) { const input = document.createElement('input'); input.type = 'radio'; input.name = name; input.value = value; input.required = index === 0; const wrapper = document.createElement('label'); wrapper.append(input, document.createTextNode(label)); row.appendChild(wrapper); }
  form.appendChild(row);
  return { form, readAnswer: () => { const checked = form.querySelector(`input[name="${name}"]:checked`); if (!checked) throw new Error(message); return map(checked.value); } };
}

function mountPresentation({ root, onChange }) {
  const select = root.querySelector('#lens-select');
  const banner = root.querySelector('#lens-absence-banner');
  if (!select || !banner) return;
  let lens = loadLens();
  const render = () => {
    select.innerHTML = '';
    for (const id of Object.keys(equivoRegisters)) { const option = select.ownerDocument.createElement('option'); option.value = id; option.textContent = isFullyAbsent(equivoRegisters[id]) ? `${lensDisplayName(id)} (absent)` : lensDisplayName(id); option.selected = id === lens; select.appendChild(option); }
    const register = equivoRegisters[lens]; banner.hidden = !(register && isFullyAbsent(register)); if (!banner.hidden) banner.textContent = `${lensDisplayName(lens)} lens: every term is a structural absence, not a placeholder -- ${register.terms.distinguish.reason}`;
  };
  select.addEventListener('change', () => { lens = select.value; saveLens(lens); render(); onChange(); });
  render();
  return () => select.replaceWith(select.cloneNode(true));
}

function renderExerciseCaption(document, exercise) {
  const lens = loadLens(); const register = equivoRegisters[lens]; if (!register) return null;
  const entry = register.terms[exercise.kind]; const caption = document.createElement('p');
  caption.className = 'exercise-caption' + (entry?.state === 'absent' ? ' absent' : '');
  caption.textContent = `In the ${lensDisplayName(lens)} lens, this stage (${exercise.kind}) is: ${renderTerm(register, exercise.kind)}`;
  return caption;
}

export const equivoAdapter = {
  themeId: 'equivo',
  worldUrl: 'data/equivo-world.json',
  checkers: equivoCheckers,
  exerciseFenceLabels: ['equivo-exercise'],
  registers: equivoRegisters,
  renderTerm,
  isFullyAbsent,
  nameOfCharge,
  createAnswerForm,
  renderSpecContext,
  mountPresentation,
  renderExerciseCaption,
  presentation: { lenses: true, streak: true, halls: true, recallPercent: true },
};
