/**
 * `render-distribution` — the "one honest twist" chart: a bar per turn, height the exact
 * probability of finishing on that turn, computed live by `odds.mts#finishTurnDistribution` and
 * redrawn after every roll. Draws only from that function's output — no chart-shape logic here
 * that isn't already in the data, matching `render-paths.mjs`'s separation.
 */
const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

/** Render `distribution` (a `finishTurnDistribution` result) as a bar chart into `svgRoot`,
 *  showing only the first `maxBarsShown` turns (the distribution's mass is heavily front-loaded
 *  for any board short enough to finish in a human-plausible number of turns — the omitted tail,
 *  plus `distribution.truncatedTail`, is reported in the caption text this function returns, not
 *  silently dropped). */
export function renderDistributionChart(svgRoot, distribution, { width = 380, height = 160, padding = 24, maxBarsShown = 30 } = {}) {
  while (svgRoot.firstChild) svgRoot.removeChild(svgRoot.firstChild);
  svgRoot.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svgRoot.setAttribute('role', 'img');

  const shown = distribution.turns.slice(0, maxBarsShown).filter((t) => t.turn > 0);
  const maxP = Math.max(0.001, ...shown.map((t) => t.probability));
  const barWidth = (width - 2 * padding) / Math.max(1, shown.length);
  const style = getComputedStyle(document.documentElement);
  const color = style.getPropertyValue('--accent').trim() || 'currentColor';

  svgRoot.appendChild(el('line', { x1: padding, y1: height - padding, x2: width - padding, y2: height - padding, stroke: 'currentColor', 'stroke-opacity': 0.3 }));

  shown.forEach((t, i) => {
    const barHeight = ((height - 2 * padding) * t.probability) / maxP;
    const x = padding + i * barWidth;
    const y = height - padding - barHeight;
    const bar = el('rect', { x: x + 1, y, width: Math.max(1, barWidth - 2), height: barHeight, fill: color });
    const title = el('title', {});
    title.textContent = `Turn ${t.turn}: ${(100 * t.probability).toFixed(2)}%`;
    bar.appendChild(title);
    svgRoot.appendChild(bar);
  });

  const omittedTurns = distribution.turns.slice(maxBarsShown).reduce((sum, t) => sum + t.probability, 0);
  const title = el('title', {});
  title.textContent = `Probability of finishing on exactly turn N, for the next ${shown.length} turns.`;
  svgRoot.appendChild(title);

  const shownMass = shown.reduce((sum, t) => sum + t.probability, 0);
  return { shownMass, omittedTurns: omittedTurns + distribution.truncatedTail };
}
