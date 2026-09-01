/**
 * `render-badges` — the three-way spend-typing badge, per `gambling-trainer-service/web/js/
 * render-disclosure.mjs`'s precedent (same visual system, same CSS class names
 * `.spend-badge--reversible/--priced/--terminal` — see `web/css/style.css`'s badge rules,
 * appended in the same shape gambling-trainer's `style.css` already established). Reads
 * `classify(kind)` and nothing else — this module owns no typing rule of its own, so a badge
 * can never say something the game's own `disclosure`-classified intent map didn't compute.
 */
const LABELS = { reversible: 'Freely reversible', priced: 'Priced', terminal: 'Terminal' };

export function renderSpendBadge(classify, kind) {
  const type = classify(kind);
  const span = document.createElement('span');
  span.className = `spend-badge spend-badge--${type}`;
  span.textContent = LABELS[type];
  span.setAttribute('data-spend-type', type);
  return span;
}
