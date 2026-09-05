/**
 * `render-board` — the 10x10 boustrophedon (snake) board, drawn as inline SVG, plus the
 * jump lines and player tokens on top of it. Draws only from `board.mts`'s own data
 * (`LADDERS`/`CHUTES`) and the engine's player positions — owns no board-layout *rule* beyond
 * "square 1 is bottom-left, rows alternate direction," the universal visual convention for this
 * game, matching `render-paths.mjs`'s "shape/style only" separation of concerns.
 */
const SVG_NS = 'http://www.w3.org/2000/svg';
const COLS = 10;
const ROWS = 10;

function el(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

/** Center point of board square `n` (1-100) in a `cell`-sized grid, `pad` from the SVG edge.
 *  Row 0 (squares 1-10) is the BOTTOM row, reading left-to-right; row 1 (11-20) reads
 *  right-to-left; and so on — the standard boustrophedon a physical board uses. */
function squareCenter(n, cell, pad) {
  const row = Math.floor((n - 1) / COLS);
  const colInRow = (n - 1) % COLS;
  const col = row % 2 === 0 ? colInRow : COLS - 1 - colInRow;
  const x = pad + col * cell + cell / 2;
  const y = pad + (ROWS - 1 - row) * cell + cell / 2;
  return { x, y };
}

const TOKEN_VARS = ['--token-1', '--token-2', '--token-3', '--token-4'];

/** Render the board grid, every jump edge, and every player's token, into `svgRoot`.
 *  `players` is `state.players` (each `{ position, label, kind }`) — tokens sharing a square
 *  are fanned out in a small ring so they never fully overlap. */
export function renderBoard(svgRoot, board, players, { cell = 42, pad = 10 } = {}) {
  while (svgRoot.firstChild) svgRoot.removeChild(svgRoot.firstChild);
  const size = COLS * cell + pad * 2;
  svgRoot.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svgRoot.setAttribute('role', 'img');

  const style = getComputedStyle(document.documentElement);
  const borderColor = style.getPropertyValue('--border').trim() || '#ccc';
  const ladderColor = style.getPropertyValue('--positive').trim() || 'green';
  const chuteColor = style.getPropertyValue('--negative').trim() || 'red';

  // Grid cells + numbers.
  for (let n = 1; n <= COLS * ROWS; n++) {
    const { x, y } = squareCenter(n, cell, pad);
    svgRoot.appendChild(el('rect', {
      x: x - cell / 2, y: y - cell / 2, width: cell, height: cell,
      fill: 'none', stroke: borderColor, 'stroke-width': 1,
    }));
    const label = el('text', { x: x - cell / 2 + 3, y: y - cell / 2 + 11, 'font-size': 8, fill: borderColor });
    label.textContent = String(n);
    svgRoot.appendChild(label);
  }

  // Jump lines (ladders and chutes), read straight from board.jumps.
  for (const jump of board.jumps.values()) {
    const from = squareCenter(jump.from, cell, pad);
    const to = squareCenter(jump.to, cell, pad);
    svgRoot.appendChild(el('line', {
      x1: from.x, y1: from.y, x2: to.x, y2: to.y,
      stroke: jump.kind === 'ladder' ? ladderColor : chuteColor,
      'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.7,
    }));
  }

  // Player tokens, fanned out around their square's center when more than one shares it.
  const bySquare = new Map();
  players.forEach((p, i) => {
    const square = Math.max(1, p.position); // position 0 (start) renders at square 1's edge
    if (!bySquare.has(square)) bySquare.set(square, []);
    bySquare.get(square).push(i);
  });
  for (const [square, indices] of bySquare) {
    const { x, y } = squareCenter(square, cell, pad);
    indices.forEach((playerIndex, slot) => {
      const angle = (2 * Math.PI * slot) / Math.max(1, indices.length);
      const r = indices.length > 1 ? 8 : 0;
      const cx = x + r * Math.cos(angle);
      const cy = y + r * Math.sin(angle);
      const player = players[playerIndex];
      const color = style.getPropertyValue(TOKEN_VARS[playerIndex % TOKEN_VARS.length]).trim() || 'currentColor';
      const token = el('circle', { cx, cy, r: 7, fill: color, stroke: 'var(--panel-bg, #fff)', 'stroke-width': 1.5 });
      const title = el('title', {});
      title.textContent = `${player.label}${player.position === 0 ? ' (start)' : ` (square ${player.position})`}`;
      token.appendChild(title);
      svgRoot.appendChild(token);
    });
  }
}
