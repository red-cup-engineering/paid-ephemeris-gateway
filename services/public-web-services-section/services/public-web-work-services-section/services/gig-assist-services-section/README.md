# Gig Assist Services Section

The app seat of the 561 Group's work program's public face, Towpath
Work, a division of Causeway Services, beneath
[public-web-work-services-section](../../README.md). Founded 2026-09-05
from the program carrier,
[561 Group Work Services Section](../../../../../../../../../561-group-services-section/services/561-group-operations-services-section/services/561-group-work-services-section/README.md),
which names Gig Assist as its bootstrap public product: an AI assistant
and companion for American gig economy workers that helps them optimize
their costs and opportunities in micro and macro ways.

## Not built as of 2026-09-05

Nothing of Gig Assist exists as code. `gig-assist.561.group` does not
resolve (`curl: (6) Could not resolve host`, checked 2026-09-05). This
section exists so the app has a seat and so its deploy shape is named
before the app is built.

## The deploy shape it will take

The pacing app's shape, the closest built precedent
([pacing-app](../../../public-web-health-services-section/services/pacing-services-section/services/pacing-app/README.md)
at pacing.561.group): a Cloudflare Worker whose `wrangler.jsonc` binds a
`public/` directory as static assets (`assets: { directory: "public",
binding: "ASSETS" }`) with a custom-domain route, and whose entire
server-side surface (`src/worker.mjs`) does exactly one thing — hand
every request to the Workers Assets binding. No accounts, no database,
no KV, no Durable Object; every observation a person enters (the
gig-platform statements, mileage, and bank rows the work program's
theory names) stays in that browser's `localStorage` and never reaches
the Worker or any server, the same privacy stance PACER's companion
specification and the pacing app both hold. The compute it will vendor
in is Odometer Work Systems' published package, copied byte-for-byte
into the browser bundle at build time the way the pacing app vendors
`@red-cup-engineering/pacing-intelligence-services-section`, never hand-
copied. Deploys run by hand (`npm run build && npx wrangler deploy`,
or one `npm run deploy` script) until this app has a CI, the same
operations pattern the pacing app and its paid gateway use.
