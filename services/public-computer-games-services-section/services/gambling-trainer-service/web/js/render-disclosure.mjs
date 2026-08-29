/**
 * `render-disclosure` — the reversible/priced/terminal badge and disclosure-text renderer.
 *
 * Reads `disclosure.mts`'s output directly (via `kernel.mjs`'s re-export) and nothing else —
 * this module owns no typing rule of its own, only presentation, so the UI's badges can never say
 * something `disclosure.mts`/`engine.mts` didn't actually compute. See `web/css/style.css`'s
 * `.spend-badge--*` rules for the three visually distinct treatments (calm solid / dashed amber /
 * thick uppercase red) this function's `class` output selects between.
 */
import { classify, disclosureText, ruinDisclosure } from './kernel.mjs';

const LABELS = {
  reversible: 'Freely reversible',
  priced: 'Priced',
  terminal: 'Terminal',
};

/** Render a `<span class="spend-badge spend-badge--TYPE">` for one intent kind. */
export function renderSpendBadge(kind) {
  const type = classify(kind);
  const span = document.createElement('span');
  span.className = `spend-badge spend-badge--${type}`;
  span.textContent = LABELS[type];
  span.setAttribute('data-spend-type', type);
  return span;
}

/** Render the panel body for the currently pending decision: the reroll disclosure and the
 * commit/ruin disclosure, if an offer is on the table. Called on every stake-slider change, so
 * the ruin disclosure is always current *before* the commit button could ever be pressed — the
 * UI-ordering guarantee is structural here: this function runs on every render pass, not behind
 * a separate "check the math" click. */
export function renderDisclosurePanel(container, { state, offer, stakeFraction }) {
  container.innerHTML = '';

  const rerollRow = document.createElement('div');
  rerollRow.appendChild(renderSpendBadge('reroll-offer'));
  const rerollText = document.createElement('p');
  rerollText.className = 'disclosure-text';
  rerollText.textContent = disclosureText({ kind: 'reroll-offer' }, state);
  rerollRow.appendChild(rerollText);
  container.appendChild(rerollRow);

  if (offer !== undefined) {
    const commitRow = document.createElement('div');
    commitRow.appendChild(renderSpendBadge('commit-stake'));
    const commitText = document.createElement('p');
    commitText.className = 'disclosure-text disclosure-text--terminal';
    // ruinDisclosure accepts stakeFraction === 0 as a legal input (correctly reports zero ruin
    // probability for a stake that is not yet sized) — no special-casing needed here.
    const disclosure = ruinDisclosure(state, offer, stakeFraction);
    commitText.textContent = stakeFraction > 0
      ? disclosure.text
      : `${disclosure.text} (No stake is sized yet — this reflects a hypothetical fraction of 0.)`;
    commitRow.appendChild(commitText);
    container.appendChild(commitRow);
  }
}
