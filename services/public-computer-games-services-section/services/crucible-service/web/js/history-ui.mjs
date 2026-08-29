/**
 * `history-ui` — the end-of-daily energy-vs-distribution histogram. v1 reads only local history
 * (a thin `localStorage` wrapper around `history.mts`'s pure `HistoryStore`/`buildHistogram`
 * shapes — the Node-only atomic file store in `src/history-store.mts` is deliberately NOT used
 * here, since it imports `node:fs`); `buildHistogram` itself does not know or care whether its
 * input costs came from here or a future `/leaderboard` fetch (ANATOMY digest).
 */
import { emptyStore, addRecord, recordsForSeed, buildHistogram, bucketIndexFor, HISTORY_KIND } from './kernel.mjs';

const STORAGE_KEY = 'crucible-history-v1';

export function loadLocalStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw);
    if (parsed && parsed.kind === HISTORY_KIND && Array.isArray(parsed.records)) return parsed;
  } catch {
    // corrupt localStorage payload -- start fresh, same doctrine as history-store.mts
  }
  return emptyStore();
}

export function saveLocalStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function recordLocalRun(record) {
  const store = addRecord(loadLocalStore(), record);
  saveLocalStore(store);
  return store;
}

/** Render the end-of-daily summary into `container`: today's cost, and a bar-per-bucket
 * histogram of every locally-recorded finish for this seed, with today's bucket highlighted
 * (theme digest's end-of-day framing: "the distribution is not a leaderboard yet"). */
export function renderHistorySummary(container, { seed, totalCost }) {
  const store = loadLocalStore();
  const records = recordsForSeed(store, seed);
  const costs = records.map((r) => r.totalCost);
  const histogram = buildHistogram(costs, 5);
  const myBucket = bucketIndexFor(histogram, totalCost);

  container.innerHTML = '';
  const heading = document.createElement('p');
  heading.className = 'history-summary-line';
  heading.textContent = `Your firing spent ${totalCost} wits to reach H¹ = 0.`;
  container.appendChild(heading);

  const note = document.createElement('p');
  note.className = 'history-summary-note';
  note.textContent = records.length <= 1
    ? 'The distribution is not a leaderboard yet — it is a record of your own past firings of this crucible.'
    : `${records.length} local firings of this crucible recorded on this device.`;
  container.appendChild(note);

  const chart = document.createElement('div');
  chart.className = 'histogram';
  chart.setAttribute('role', 'img');
  chart.setAttribute('aria-label', `Histogram of ${records.length} past runs; your run cost ${totalCost}.`);
  const maxCount = Math.max(1, ...histogram.buckets.map((b) => b.count));
  histogram.buckets.forEach((b, i) => {
    const bar = document.createElement('div');
    bar.className = 'histogram-bar' + (i === myBucket ? ' histogram-bar--mine' : '');
    bar.style.setProperty('--bar-fraction', String(b.count / maxCount));
    bar.title = `${b.rangeStart}–${b.rangeEnd}: ${b.count}`;
    chart.appendChild(bar);
  });
  container.appendChild(chart);

  return { store, histogram, myBucket };
}
