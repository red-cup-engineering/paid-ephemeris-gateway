# market.561.group

The 561 Group's market: the public catalog of operated services, their prices, and the
addresses they settle to.

## Why this is its own site

This site declares `market.561.group` under its own worker name, `561-group-market-site`, so
the domain is owned by the configuration that serves it.

## Deploying

Deployment is a `wrangler deploy` from this directory. Note the ordering hazard: while the
domain remains attached to `561-group-site`, a deploy of this worker and a deploy of the apex
worker are both trying to own the same hostname. Cloudflare will let the most recent claim
win, so the apex worker's stale binding should be released — through the Cloudflare dashboard
or API, not from here — rather than left to race.

## Content

`public/index.html` is a copy of the market page committed to the apex site at
`/market/`, adapted for this origin. That duplication is deliberate and temporary: the apex
copy is what a reader following an existing link will hit, and this one is what the domain is
for. Once this site is deployed and the hostname is cleanly owned, the apex path should become
a redirect here rather than a second copy, so there is one statement of what the
Group sells and at what price.

Every figure on the page is read from the endpoint's own live `402` challenge rather than
copied forward, and the page says outright that the challenge is authoritative where the two
disagree. That rule is what keeps this page from becoming a second source of truth that drifts
from the services it describes.
