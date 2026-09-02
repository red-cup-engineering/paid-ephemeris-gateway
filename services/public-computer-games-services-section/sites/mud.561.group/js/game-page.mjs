// mud.561.group's own per-game detail page shaping: one static /games/<id>/ page per
// catalog.json entry, carrying that entry's full declared entryPoints (browser, headless,
// web, terminal, agent, telnet -- generic over entry.entryPoints's own keys, never a
// hardcoded subset), a dated liveness readout off that entry's own liveProbe (with the
// site's documented GCP-retirement cause stated honestly when the probe failed -- matching
// build.mjs's own offlineNote), and how to join. Pure: no disk, no network -- build.mjs
// calls gamePageHtml per catalog entry and owns the writeFile side effect.

import {
  esc, playUrl, canPlayLive, catalogCardBodyHtml,
} from '@red-cup-engineering/games-catalog-storefront';

const FAVICON = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='5' fill='%232a4a70'/%3E%3Ctext x='12' y='17' font-family='monospace' font-size='11' fill='%23f4f8fc' text-anchor='middle'%3EM%3C/text%3E%3C/svg%3E`;

/** `games/<entry.id>/` -- the one relative path convention every caller (build.mjs's
 *  writer, the index page's per-game nav, this module's own back-link) shares. */
export function gamePagePath(entry) {
  return `games/${entry.id}/`;
}

/** Definition list of every entry point this catalog entry declares, verbatim -- browser,
 *  headless, web, terminal, agent, telnet, or any future kind. Generic over the object's own
 *  keys so a new entry-point kind shows up the moment an upstream manifest declares it. */
export function entryPointsHtml(entry) {
  const points = Object.entries(entry.entryPoints || {});
  if (points.length === 0) {
    return '<p class="status-note">No entry points declared.</p>';
  }
  const rows = points
    .map(([kind, detail]) => `<div class="entry-point"><dt>${esc(kind)}</dt><dd>${esc(detail)}</dd></div>`)
    .join('');
  return `<dl class="entry-points">${rows}</dl>`;
}

/** The dated liveness readout: this entry's own liveProbe, honestly reporting reachable vs.
 *  unreachable with the exact checked-at timestamp, and (when down) the same GCP-billing-
 *  retirement cause build.mjs's index-page offlineNote already states for offline entries --
 *  never inventing a per-entry diagnosis the probe itself does not support. */
export function livenessHtml(entry) {
  const probe = entry.liveProbe;
  if (!probe) {
    return '<p class="status-note">No live probe result recorded yet -- run <code>npm run generate-catalog</code>.</p>';
  }
  if (probe.ok) {
    return `<p class="status-note">Last checked ${esc(probe.checkedAt)} -- reachable (HTTP ${probe.httpStatus}).</p>`;
  }
  const cause = probe.error ? `network error: ${esc(probe.error)}` : `HTTP ${probe.httpStatus ?? 'no response'}`;
  return `<p class="status-note offline-detail">Last checked ${esc(probe.checkedAt)} -- unreachable (${cause}).
    The 561 Group's GCP project has billing permanently off (founder-ruled 2026-08-31), so this
    entry's Cloud Run origin is permanently retired; routing is correct, and this resolves as the
    free-lane migration lands. This is not a bug in the listing.</p>`;
}

/** How to join, in one line: the primary browser link when it is honestly reachable right
 *  now (same canPlayLive gate the catalog card uses), otherwise a plain pointer at the
 *  entry-points list and liveness section below -- never a link straight to a dead origin. */
export function howToJoinHtml(entry, liveSubdomains = new Set()) {
  if (canPlayLive(entry, liveSubdomains)) {
    const url = playUrl(entry);
    return `<p class="how-to-join">Open <a href="${esc(url)}">${esc(url)}</a> in a browser to join now.</p>`;
  }
  return '<p class="how-to-join">Not reachable in a browser right now -- see Entry points and Liveness below.</p>';
}

/** Pure: entry -> the full detail-page HTML document. `liveSubdomains` is the same
 *  probe-derived set js/catalog.mjs's liveSubdomainsFromProbes computes for the index page,
 *  so the primary play link is gated identically on both pages. */
export function gamePageHtml(entry, liveSubdomains = new Set()) {
  const cardBody = catalogCardBodyHtml(entry, liveSubdomains);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(entry.displayName)} -- mud.561.group</title>
  <meta name="description" content="${esc(entry.description)}" />
  <link rel="stylesheet" href="../../css/style.css" />
  <link rel="icon" href="${FAVICON}" />
</head>
<body>
  <a class="skip-link" href="#game-detail">Skip to detail</a>
  <header class="site-header">
    <div class="header-inner">
      <div class="title-block">
        <p class="brand-wordmark">561 Group</p>
        <h1>${esc(entry.displayName)}</h1>
        <p class="tagline"><a href="../../">&larr; Back to mud.561.group</a></p>
      </div>
    </div>
  </header>
  <main id="game-detail">
    ${cardBody}
    ${howToJoinHtml(entry, liveSubdomains)}
    <section aria-labelledby="entry-points-heading">
      <h2 id="entry-points-heading">Entry points</h2>
      ${entryPointsHtml(entry)}
    </section>
    <section aria-labelledby="liveness-heading">
      <h2 id="liveness-heading">Liveness</h2>
      ${livenessHtml(entry)}
    </section>
  </main>
  <footer class="site-footer">
    <div class="footer-inner">
      <p>Part of <a href="https://mud.561.group/">mud.561.group</a>, itself a keyword-filtered
        view of <a href="https://play.561.group/">play.561.group</a>'s catalog.</p>
    </div>
  </footer>
</body>
</html>
`;
}
