/**
 * `render-reels` — Fair Spin's presentation layer: the three landed symbols, the permanent
 * disclosure panel (`slotDisclosure`'s output, verbatim — never a separate copy), and the
 * session-summary comparison table (`sessionSummary`'s output). Draws only from what those two
 * pure functions in `disclosure.mts` already computed — no odds arithmetic happens in this file.
 */
const SYMBOL_GLYPHS = { cherry: '🍒', lemon: '🍋', bell: '🔔', star: '⭐', seven: '7️⃣' };

export function symbolGlyph(symbol) {
  return SYMBOL_GLYPHS[symbol] ?? symbol;
}

/** The three reel windows, showing the last spin's landed symbols (or a blank dash before the
 *  first spin). */
export function renderReelWindow(container, symbols) {
  container.innerHTML = '';
  const shown = symbols ?? [undefined, undefined, undefined];
  for (const s of shown) {
    const span = document.createElement('span');
    span.className = 'reel-window';
    span.textContent = s ? symbolGlyph(s) : '—';
    container.appendChild(span);
  }
}

/** The permanent disclosure panel — computed RTP, expected loss per 100 spins, and a per-symbol,
 *  per-reel hit-odds table. Every number here is `disclosure.published` field values, formatted,
 *  never recomputed or restated by hand. */
export function renderDisclosurePanel(container, disclosure) {
  container.innerHTML = '';
  const rtpRow = document.createElement('p');
  rtpRow.innerHTML = `Computed RTP: <strong>${(100 * disclosure.rtp).toFixed(2)}%</strong> — expected loss per 100 spins at your current bet: <strong>${disclosure.expectedLossPer100Spins.toFixed(2)} credits</strong>.`;
  container.appendChild(rtpRow);

  const table = document.createElement('table');
  table.className = 'odds-table';
  const symbols = disclosure.symbols;
  table.innerHTML = `<thead><tr><th>Symbol</th>${disclosure.hitOddsByReel.map((_, i) => `<th class="num">Reel ${i + 1}</th>`).join('')}</tr></thead>`;
  const tbody = document.createElement('tbody');
  for (const symbol of symbols) {
    const tr = document.createElement('tr');
    const cells = disclosure.hitOddsByReel.map((odds) => `<td class="num">${(100 * (odds.get(symbol) ?? 0)).toFixed(1)}%</td>`).join('');
    tr.innerHTML = `<td>${symbolGlyph(symbol)} ${symbol}</td>${cells}`;
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  container.appendChild(table);

  const paytable = document.createElement('details');
  paytable.className = 'paytable-details';
  const summary = document.createElement('summary');
  summary.textContent = 'Full paytable';
  paytable.appendChild(summary);
  const list = document.createElement('ul');
  for (const row of disclosure.paytable) {
    const li = document.createElement('li');
    li.textContent = `${row.rule}: pays ${row.multiplier}x bet`;
    list.appendChild(li);
  }
  paytable.appendChild(list);
  container.appendChild(paytable);
}

/** The session summary: real recorded counts compared against the published figures. */
export function renderSessionSummary(container, summary) {
  container.innerHTML = '';
  if (summary.spins === 0) {
    container.innerHTML = '<p>No spins yet this session.</p>';
    return;
  }
  const overview = document.createElement('p');
  const sign = summary.netResult >= 0 ? '+' : '';
  overview.innerHTML =
    `${summary.spins} spins — staked ${summary.totalStaked}, returned ${summary.totalPayout} ` +
    `(net ${sign}${summary.netResult.toFixed(2)}). Your actual RTP so far: <strong>${(100 * summary.actualRtp).toFixed(2)}%</strong> ` +
    `vs. the published <strong>${(100 * summary.published.rtp).toFixed(2)}%</strong>.`;
  container.appendChild(overview);

  const table = document.createElement('table');
  table.className = 'odds-table';
  table.innerHTML = '<thead><tr><th>Symbol</th><th class="num">Actual hits (R1/R2/R3)</th><th class="num">Actual freq.</th><th class="num">Published odds</th></tr></thead>';
  const tbody = document.createElement('tbody');
  for (const row of summary.symbolComparison) {
    const tr = document.createElement('tr');
    const actualFreq = row.actualFrequency.map((f) => `${(100 * f).toFixed(0)}%`).join(' / ');
    const published = row.publishedOdds.map((f) => `${(100 * f).toFixed(0)}%`).join(' / ');
    tr.innerHTML = `<td>${symbolGlyph(row.symbol)} ${row.symbol}</td><td class="num">${row.actualHits.join(' / ')}</td><td class="num">${actualFreq}</td><td class="num">${published}</td>`;
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  container.appendChild(table);
}
