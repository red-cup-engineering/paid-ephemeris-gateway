// mud.561.group's binding of the shared catalog shaping: unlike play.561.group's hand-
// maintained LIVE_SUBDOMAINS, "live" here is catalog.json's own dated liveProbe.ok (a real
// HTTP check at generation time -- scripts/build-mud-catalog.mjs), recomputed from the data.

import { catalogModel as catalogModelBase } from '@red-cup-engineering/games-catalog-storefront';

export function liveSubdomainsFromProbes(entries) {
  return new Set(entries.filter((entry) => entry.liveProbe && entry.liveProbe.ok).map((entry) => entry.subdomain));
}

export function catalogModel(entries) {
  return catalogModelBase(entries, liveSubdomainsFromProbes(entries));
}
