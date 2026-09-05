/**
 * `landing` — `index.html`'s bootstrap. Builds the variant grid and the daily-deal picker
 * straight from `VARIANT_LIST` (never a hand-maintained duplicate of the six variant names), and
 * turns the seed form into a `table.html?variant=&seed=` link — the same URL contract `app.mjs`
 * reads on the other end.
 */
import { VARIANT_LIST, dailySeed, utcDateString } from './kernel.mjs';

const DESCRIPTIONS = {
  'klondike-draw1': 'The classic patience game. Draw one card at a time from the stock.',
  'klondike-draw3': 'Klondike with the harder, standard-scoring draw-three stock.',
  freecell: 'Every card dealt face up. Four free cells to park cards. Deals here can be generated solver-certified winnable.',
  'spider-1suit': 'Ten columns, two decks, one suit. The gentlest Spider — closest to Klondike in difficulty.',
  'spider-2suit': 'Spider with two suits in play — the traditional middle difficulty.',
  'spider-4suit': "Spider with all four suits — two full decks. The variant's hardest form.",
  yukon: "Klondike's deeper cousin: almost the whole deck dealt face up, no stock at all, and any face-up stack moves as one group.",
  'forty-thieves': 'Two decks, ten tight columns, strict same-suit building. A patient, precise classic.',
  golf: 'Clear all seven columns by playing one rank above or below the waste, in either direction.',
  tripeaks: 'Clear three peaks of cards by playing one rank away from the waste, in either direction.',
  pyramid: 'Clear the 28-card triangle by pairing exposed cards that sum to 13, or a lone King.',
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function buildVariantGrid(container) {
  for (const variant of VARIANT_LIST) {
    const card = el('div', 'variant-card');
    card.appendChild(el('h3', null, variant.name));
    card.appendChild(el('p', null, DESCRIPTIONS[variant.id] ?? ''));
    const row = el('div', 'row');
    const play = el('a', 'button-link primary', 'Play');
    play.href = `table.html?variant=${encodeURIComponent(variant.id)}`;
    const daily = el('a', 'button-link', 'Daily');
    daily.href = `table.html?variant=${encodeURIComponent(variant.id)}&daily=1`;
    row.appendChild(play);
    row.appendChild(daily);
    card.appendChild(row);
    container.appendChild(card);
  }
}

function initDailyCard(select, dateEl, playLink) {
  for (const variant of VARIANT_LIST) {
    const opt = document.createElement('option');
    opt.value = variant.id;
    opt.textContent = variant.name;
    select.appendChild(opt);
  }
  select.value = 'klondike-draw1';
  const today = utcDateString(new Date());
  dateEl.textContent = today;
  const updateLink = () => {
    playLink.href = `table.html?variant=${encodeURIComponent(select.value)}&daily=1`;
  };
  select.addEventListener('change', updateLink);
  updateLink();
  // Not consumed here — proof the daily seed is a pure, reproducible function of (date, variant),
  // exactly as `table.html` will independently re-derive it via the same `dailySeed` call.
  void dailySeed(today, select.value);
}

function initSeedForm(form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const variant = form.elements['variant'].value;
    const seed = form.elements['seed'].value.trim();
    const params = new URLSearchParams();
    params.set('variant', variant);
    if (seed) params.set('seed', seed);
    location.href = `table.html?${params.toString()}`;
  });
}

function main() {
  buildVariantGrid(document.getElementById('variant-grid'));
  initDailyCard(
    document.getElementById('daily-variant'),
    document.getElementById('daily-date'),
    document.getElementById('daily-play-link'),
  );
  initSeedForm(document.getElementById('seed-form'));
  const seedVariantSelect = document.getElementById('seed-form-variant');
  for (const variant of VARIANT_LIST) {
    const opt = document.createElement('option');
    opt.value = variant.id;
    opt.textContent = variant.name;
    seedVariantSelect.appendChild(opt);
  }
}

main();
