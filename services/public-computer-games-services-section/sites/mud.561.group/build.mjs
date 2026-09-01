#!/usr/bin/env node
/**
 * build.mjs -- mud.561.group's build step. Server-renders index.html as a static TUFTE
 * document, matching play.561.group's own build.mjs shape. catalog.json is read, never
 * edited, by this script -- npm run generate-catalog produces it (see scripts/).
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderTufteFragment } from '@red-cup-engineering/web-tufte-gui-services-section';
import { catalogModel } from './js/catalog.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

const FAVICON = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='5' fill='%232a4a70'/%3E%3Ctext x='12' y='17' font-family='monospace' font-size='11' fill='%23f4f8fc' text-anchor='middle'%3EM%3C/text%3E%3C/svg%3E`;

function offlineNote(entries) {
  const offline = entries.filter((e) => e.liveProbe && !e.liveProbe.ok);
  if (offline.length === 0) return '';
  const names = offline.map((e) => e.displayName).join(', ');
  return `<p class="offline-banner">Offline right now: ${names} — the 561 Group's GCP project
    has billing permanently off (founder-ruled 2026-08-31), so their Cloud Run origins are
    permanently retired. Routing is correct; each entry returns as its free-lane migration
    lands. This is not a bug in the listing.</p>`;
}

function indexHtml(gridFragment, entries) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>mud.561.group -- 561 Group MUD &amp; MMO directory</title>
  <meta name="description" content="A directory of the 561 Group's MUDs and graphical MMOs: live listings, per-game pages, and honest web-play links, drawn from the same catalog play.561.group uses." />
  <link rel="stylesheet" href="css/style.css" />
  <link rel="icon" href="${FAVICON}" />
</head>
<body>
  <a class="skip-link" href="#catalog-grid">Skip to catalog</a>
  <header class="site-header">
    <div class="header-inner">
      <div class="title-block">
        <p class="brand-wordmark">561 Group</p>
        <h1>mud<span class="domain">.561.group</span></h1>
        <p class="tagline">
          The 561 Group's own MUD and graphical-MMO directory: live listings, per-game pages,
          and honest web-play links -- drawn from the same catalog
          <a href="https://play.561.group/">play.561.group</a> uses, filtered to text MUDs
          and graphical MMOs (a graphical MMO counts as a MUD here). A shared player chat
          network across these worlds is a future pass, not part of this directory yet.
        </p>
      </div>
    </div>
  </header>
  <main>
    ${offlineNote(entries)}
    <p class="result-count" id="result-count">${entries.length} world${entries.length === 1 ? '' : 's'}</p>
    <div class="catalog-grid-wrap" id="catalog-grid" role="region" aria-label="MUD and MMO catalog">${gridFragment}</div>
  </main>
  <footer class="site-footer">
    <div class="footer-inner">
      <p>
        Catalog data: <a href="catalog.json">catalog.json</a> -- a keyword-filtered view of
        <a href="https://play.561.group/catalog.json">play.561.group's own catalog.json</a>,
        per <a href="catalog-filter.json">catalog-filter.json</a>. Each entry's play link is
        gated by a real, dated live check (liveProbe), not just router membership.
      </p>
    </div>
  </footer>
</body>
</html>
`;
}

async function build() {
  const catalog = JSON.parse(await readFile(path.join(ROOT, 'catalog.json'), 'utf8'));
  const entries = Array.isArray(catalog.games) ? catalog.games : [];
  const fragment = renderTufteFragment(catalogModel(entries));
  await writeFile(path.join(ROOT, 'index.html'), indexHtml(fragment, entries));
  process.stdout.write(`build.mjs: wrote index.html (${fragment.length} bytes of grid, ${entries.length} entries)\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await build();
}

export { build, indexHtml };
