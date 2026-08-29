/**
 * `render-svg` — the lattice-in-crucible SVG renderer. Draws from the plain view model
 * `project.mjs` produces; owns no game rules, only shape/style. Visual language taken directly
 * from the THEME digest §3:
 *
 *   - claim fill-fraction (phi) reads as a frost/crystal creeping across the cell (floppy =
 *     translucent low-saturation, ossified = opaque faceted).
 *   - bond geometry: `panel` = straight thick strut (angle-locked); `hinge` = thin arc with
 *     visible play.
 *   - bond state stroke: `compliant-permanent` = thin solid (a MERGE lock — no clean take-backs,
 *     but still forced-SPLIT-able), `exchangeable` = dashed/pulsing (REBOND-able, cleanly
 *     SPLIT-able), `catalyzed` = dotted solid (a CATALYZE lock — same forced-SPLIT-only recovery
 *     as `compliant-permanent`, but distinct from true backbone), `pinned` = heavy/dark locked
 *     stroke (the generator's backbone — never selectable by any move, at any cost).
 *
 * Every claim and selectable bond is a real DOM element with `role="button"`, `tabindex`, and a
 * keyboard handler wired by `app.mjs` — nothing here decides what a click *means* (that is
 * `app.mjs`'s job, dispatching into the kernel); this module only builds the picture and reports
 * which element was activated.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

function bondClass(bond) {
  const parts = ['bond', `bond--${bond.geometry}`, `bond--${bond.state}`];
  if (bond.selected) parts.push('bond--selected');
  if (bond.hovered) parts.push('bond--hovered');
  return parts.join(' ');
}

function claimClass(claim) {
  const parts = ['claim'];
  if (claim.selected) parts.push('claim--selected');
  if (claim.hovered) parts.push('claim--hovered');
  return parts.join(' ');
}

/** Render one bond as either a straight strut (`panel`) or a gently-arced hinge (`hinge`). */
function renderBond(bond) {
  if (bond.geometry === 'panel') {
    return el('line', {
      x1: bond.x1, y1: bond.y1, x2: bond.x2, y2: bond.y2,
      class: bondClass(bond), 'data-bond-id': bond.id,
    });
  }
  const mx = (bond.x1 + bond.x2) / 2;
  const my = (bond.y1 + bond.y2) / 2;
  const dx = bond.x2 - bond.x1;
  const dy = bond.y2 - bond.y1;
  const len = Math.hypot(dx, dy) || 1;
  const bow = Math.min(24, len * 0.18);
  const nx = -dy / len;
  const ny = dx / len;
  const cxp = mx + nx * bow;
  const cyp = my + ny * bow;
  return el('path', {
    d: `M ${bond.x1} ${bond.y1} Q ${cxp} ${cyp} ${bond.x2} ${bond.y2}`,
    class: bondClass(bond), fill: 'none', 'data-bond-id': bond.id,
  });
}

/** Render one claim as a phi-filled circle: an outer ring (the full cell outline) and an inner
 * disc whose radius encodes phi (0 = a pinprick, 1 = fully filling the cell) — "frost creeping
 * across a cell" rendered as a literal fill-fraction, not a bolted-on progress bar. */
function renderClaim(claim, radius) {
  const g = el('g', { class: claimClass(claim), 'data-claim-id': claim.id, role: 'button', tabindex: '0', 'aria-label': `claim ${claim.id}, ossification ${Math.round(claim.phi * 100)} percent` });
  g.appendChild(el('circle', { cx: claim.x, cy: claim.y, r: radius, class: 'claim-outline' }));
  g.appendChild(el('circle', { cx: claim.x, cy: claim.y, r: Math.max(2, radius * claim.phi), class: 'claim-fill' }));
  g.appendChild(el('title', {})).textContent = claim.id;
  return g;
}

/** Render a full crucible frame: the vessel, the lattice, and a heat gauge whose fill reflects
 * cumulative spend against the daily's energy budget (theme digest §3's "heat gauge, not just a
 * board frame"). */
export function renderFrame(svgRoot, view, { width, height, claimRadius = 16, spentFraction = 0 } = {}) {
  while (svgRoot.firstChild) svgRoot.removeChild(svgRoot.firstChild);
  svgRoot.setAttribute('viewBox', `0 0 ${width} ${height}`);

  const vessel = el('rect', { x: 4, y: 4, width: width - 8, height: height - 8, class: 'crucible-vessel', rx: 12 });
  svgRoot.appendChild(vessel);

  const gauge = el('g', { class: 'heat-gauge', 'aria-hidden': 'true' });
  const gaugeHeight = Math.max(0, Math.min(1, spentFraction)) * (height - 24);
  gauge.appendChild(el('rect', { x: 8, y: 8, width: 6, height: height - 16, class: 'heat-gauge-track' }));
  gauge.appendChild(el('rect', { x: 8, y: 8 + (height - 16 - gaugeHeight), width: 6, height: gaugeHeight, class: 'heat-gauge-fill' }));
  svgRoot.appendChild(gauge);

  const bondLayer = el('g', { class: 'bond-layer' });
  for (const bond of view.bonds) bondLayer.appendChild(renderBond(bond));
  svgRoot.appendChild(bondLayer);

  const claimLayer = el('g', { class: 'claim-layer' });
  for (const claim of view.claims) claimLayer.appendChild(renderClaim(claim, claimRadius));
  svgRoot.appendChild(claimLayer);

  return svgRoot;
}
