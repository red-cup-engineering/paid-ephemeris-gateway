import { htmlFragment, htmlElement } from '@red-cup-engineering/web-tufte-gui-services-section/composition';
import { GLYPHS, FALLBACK_GLYPH } from './catalog-glyphs.mjs';
import summaries from '../content/catalog-summaries.json' with { type: 'json' };
export { GLYPHS, FALLBACK_GLYPH } from './catalog-glyphs.mjs';

export function gameBrowserUrl(entry) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(entry.subdomain) || !entry.entryPoints?.browser?.startsWith('/') || /[\\\u0000-\u0020]/u.test(entry.entryPoints.browser)) throw new TypeError('Invalid game browser entry point');
  return `https://${entry.subdomain}.561.group${entry.entryPoints.browser}`;
}

/** A manifest's browser entry point and an explicitly routed, safe deployment
 * are both necessary for a live play action. Catalog status alone is insufficient. */
export function gamePlayAvailability(entry, liveSubdomains = new Set()) {
  if (entry.status !== 'playable') return { kind: 'unavailable', reason: 'In development' };
  if (!entry.entryPoints?.browser) return { kind: 'unavailable', reason: entry.entryPoints?.headless ? 'Available through a terminal or API' : 'No browser entry point' };
  if (!liveSubdomains.has(entry.subdomain)) return { kind: 'unavailable', reason: 'Not yet deployed' };
  return { kind: 'browser', href: gameBrowserUrl(entry) };
}

/** A property chooses catalog membership through declared game keywords. */
export function gamesWithAnyKeyword(entries, keywords) {
  const wanted = new Set(keywords);
  return entries.filter(entry => (entry.keywords ?? []).some(keyword => wanted.has(keyword)));
}

/** Project game facts and real play capabilities into the shared display contract. */
export function gameStorefront(entries, { title = 'Games', description, liveSubdomains = new Set() } = {}) {
  return { title, description, facets: [
    { key: 'shelf', label: 'Shelves' },
    { key: 'availability', label: 'Availability', labels: { browser: 'Ready to play', terminal: 'Terminal / API', development: 'In development', preview: 'Preview' } },
  ], items: entries.map(entry => {
    const availability = gamePlayAvailability(entry, liveSubdomains);
    const publicAvailability = availability.kind === 'browser' ? 'browser' : entry.status !== 'playable' ? 'development' : entry.entryPoints?.headless ? 'terminal' : 'preview';
    const summary = summaries[entry.id] ?? entry.description;
    return { id: entry.id, title: entry.displayName, summary, eyebrow: entry.shelf,
      detail: entry.description && entry.description !== summary ? [htmlElement('details', {}, [htmlElement('summary', {}, ['Technical background']), htmlElement('p', {}, [entry.description])])] : [],
      illustration: [htmlFragment(GLYPHS[entry.id] ?? FALLBACK_GLYPH)],
      keywords: entry.keywords ?? [], facets: { shelf: entry.shelf ? [entry.shelf] : [], availability: [publicAvailability] },
      status: { label: availability.kind === 'browser' ? 'Ready to play' : availability.reason },
      facts: [
        ...Object.entries(entry.entryPoints ?? {}).map(([label, value]) => ({ label: `Entry point: ${label}`, value, detailOnly: true })),
        ...(entry.liveProbe ? [{ label: 'Last browser check', value: `${entry.liveProbe.checkedAt}: ${entry.liveProbe.ok ? 'reachable' : 'unreachable'}${entry.liveProbe.httpStatus ? ` (HTTP ${entry.liveProbe.httpStatus})` : ''}`, detailOnly: true }] : []),
      ],
      actions: availability.kind === 'browser' ? [{ kind: 'link', label: `Play ${entry.displayName}`, href: availability.href }]
        : [{ kind: 'unavailable', label: 'Browser play unavailable', reason: availability.reason }],
    };
  }) };
}
