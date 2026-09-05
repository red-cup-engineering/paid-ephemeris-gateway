/**
 * `render-paths` — the four-path bankroll chart (yours / Kelly / flat / all-in), drawn as inline
 * SVG. Draws only from `paths.mts#computePaths`'s output (via `kernel.mjs`) — owns no simulation
 * logic of its own, only shape/style, matching crucible's `render-svg.mjs` separation of concerns.
 */
const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

const SERIES = [
  { key: 'flat', cssVar: '--path-flat', label: 'Flat (5% each time)' },
  { key: 'allIn', cssVar: '--path-allin', label: 'All-in (100% each time)' },
  { key: 'kelly', cssVar: '--path-kelly', label: 'Kelly optimum' },
  { key: 'yours', cssVar: '--path-yours', label: 'Yours' },
];

function pointsToPath(points, xScale, yScale) {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.offerIndex).toFixed(2)} ${yScale(p.balance).toFixed(2)}`).join(' ');
}

/** Render the four-path chart into `svgRoot`. `paths` is `computePaths(state)`'s output;
 * `offerCount` is `state.offers.length` (the fixed x-axis domain every path shares, even when
 * `yours` is shorter). */
export function renderPathsChart(svgRoot, paths, offerCount, { width = 420, height = 220, padding = 28 } = {}) {
  while (svgRoot.firstChild) svgRoot.removeChild(svgRoot.firstChild);
  svgRoot.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svgRoot.setAttribute('role', 'img');

  const allBalances = SERIES.flatMap(({ key }) => paths[key].map((p) => p.balance));
  const maxBalance = Math.max(1, ...allBalances);
  const minBalance = 0;

  // Empty state: before the first offer resolves, every series has at most one point (nothing
  // to draw a line between yet) — say so plainly rather than leaving a bare pair of axes, matching
  // the shelf's other "not loaded yet" panels (index.html's own `.offer-empty`, this game's own
  // sibling state).
  if (!SERIES.some(({ key }) => paths[key].length >= 2)) {
    svgRoot.appendChild(el('line', { x1: padding, y1: height - padding, x2: width - padding, y2: height - padding, stroke: 'currentColor', 'stroke-opacity': 0.3 }));
    svgRoot.appendChild(el('line', { x1: padding, y1: padding, x2: padding, y2: height - padding, stroke: 'currentColor', 'stroke-opacity': 0.3 }));
    const empty = el('text', { x: width / 2, y: height / 2, 'text-anchor': 'middle', class: 'paths-empty-label' });
    empty.textContent = 'No wagers yet — your path appears after your first offer.';
    svgRoot.appendChild(empty);
    return;
  }

  const xScale = (offerIndex) => padding + (offerIndex / Math.max(1, offerCount)) * (width - 2 * padding);
  const yScale = (balance) => height - padding - ((balance - minBalance) / (maxBalance - minBalance || 1)) * (height - 2 * padding);

  // Axes.
  svgRoot.appendChild(el('line', { x1: padding, y1: height - padding, x2: width - padding, y2: height - padding, stroke: 'currentColor', 'stroke-opacity': 0.3 }));
  svgRoot.appendChild(el('line', { x1: padding, y1: padding, x2: padding, y2: height - padding, stroke: 'currentColor', 'stroke-opacity': 0.3 }));

  // Starting-balance reference line.
  const start = paths.yours[0]?.balance ?? paths.kelly[0]?.balance ?? 0;
  svgRoot.appendChild(el('line', {
    x1: padding, x2: width - padding, y1: yScale(start), y2: yScale(start),
    stroke: 'currentColor', 'stroke-opacity': 0.15, 'stroke-dasharray': '3 3',
  }));

  const style = getComputedStyle(document.documentElement);
  for (const { key, cssVar } of SERIES) {
    const points = paths[key];
    if (points.length < 2) continue;
    const color = style.getPropertyValue(cssVar).trim() || 'currentColor';
    const path = el('path', {
      d: pointsToPath(points, xScale, yScale),
      fill: 'none',
      stroke: color,
      'stroke-width': key === 'yours' ? 2.5 : 1.75,
      'data-series': key,
    });
    svgRoot.appendChild(path);
    const last = points[points.length - 1];
    svgRoot.appendChild(el('circle', { cx: xScale(last.offerIndex), cy: yScale(last.balance), r: 3, fill: color }));
  }

  const title = el('title', {});
  title.textContent = `Bankroll paths over ${offerCount} wagers: yours vs Kelly vs flat vs all-in.`;
  svgRoot.appendChild(title);
}

/** Render the `<ul>` legend matching the chart's series, with a swatch colored from the same CSS
 * custom properties the chart itself reads — one source of truth for the color mapping. */
export function renderPathsLegend(container) {
  container.innerHTML = '';
  for (const { cssVar, label } of SERIES) {
    const li = document.createElement('li');
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = `var(${cssVar})`;
    li.appendChild(swatch);
    li.appendChild(document.createTextNode(label));
    container.appendChild(li);
  }
}
