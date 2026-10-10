# Turntide Islands

Turntide Islands is a Discord-native community settlement built as a
sovereign RMN membrane: every market it runs — the knowledge vault, the
contributor market, union media, locality answers, steward inference — is
typed admissions, typed refusals, content-addressed records, and witnessed
writes, with circuits that machine-check how far each value path is from
closing. Every activation record reads honestly: `not-admitted` means
nothing has been admitted, and no path claims a state it hasn't earned. The
package name is `@causeway-services/turntide-islands-settlement`, per the
ruling that Turntide/Farstone packages belong under @causeway-services.

## Component map

- **`services/`** — six independently publishable leaf packages, each with
  its own `package.json`, `src/`, `test/`, and `check`/`test`/`verify`
  scripts. See each package's own README:
  - [`colony-report-team`](services/colony-report-team/README.md) — interval
    activity reporting from the witness journal.
  - [`community-source-topical-knowledge-cell`](services/community-source-topical-knowledge-cell/README.md)
    — URL-lead community knowledge curation.
  - [`state-of-harmonious-union-reporting-service`](services/state-of-harmonious-union-reporting-service/README.md)
    (published as `@causeway-services/tti-rich-news-publication-operations`) —
    the hourly "State of the Harmonious Union" reporting state machine.
  - [`turntide-steward-inference-procurement-service`](services/turntide-steward-inference-procurement-service/README.md)
    — bounded steward inference procurement market.
  - [`turntide-union-media-syndication-service`](services/turntide-union-media-syndication-service/README.md)
    — Union Media contract, admissions, auction, and settlement.
  - [`turntide-witness-journal-binding-service`](services/turntide-witness-journal-binding-service/README.md)
    — the shared witness-journal binding substrate the other services and
    the settlement root depend on.
- **`src/apps/turntide-islands-discord-platform/`** — the Discord
  application itself (`@red-cup-engineering/turntide-islands`): gateway
  interactions, the steward CLI, the vault/checkout/provider-offer HTTP
  surface, and the union-media ActivityPub origin. See its own
  [README](src/apps/turntide-islands-discord-platform/README.md).
- **`lib/management/`** — the settlement root's own management scripts:
  observers, simulators, launch/install scripts, and the compatibility
  re-export shims (`export * from "@red-cup-engineering/<package>"`) that let root
  code and root tests consume each extracted `services/` package.
- **`lib/schemas/`** — shared schema definitions. **`lib/legacy/`** —
  archived, superseded source, not part of the live tree.
- **`content/`** — the settlement's content-addressed records: `admissions`,
  `circuits`, `configurations`, `contracts`, `documents`, `offices`,
  `products`, `provider-admissions`, `service-admissions`, `solicitations`,
  `terms`. This is the record layer every `not-admitted`/`admitted`
  disposition in the code reads against.
- **`data/`** — runtime state: `agency` (e.g. the Zelo work roster) and
  `news-editions`.
- **`test/`** — root-level integration tests (`node --test test/*.test.mjs`),
  exercising the management scripts and services together.

## Install

```sh
npm install
```

resolves at the root, pulling every dependency from `services/*` and
`src/apps/*` alongside `@red-cup-engineering/*`, `@red-cup-engineering/*`, and
`@coesite-operations/*` scoped packages.

**Registry**: reads resolve through the per-project `.npmrc`, which sets a
default registry (a local proxy cache) and scopes the private
`@red-cup-engineering` scope to Google Artifact
Registry's virtual repo (`https://us-central1-npm.pkg.dev/five-six-one-group-dev/npm/`).
Each `services/*` package and the app carry their own matching `.npmrc`.
Publishing (not needed for ordinary install/verify) must target the
Artifact Registry sovereign-npm repo explicitly and requires a fresh
`gcloud auth print-access-token` in `~/.npmrc`; a package's own scoped
`.npmrc` silently overrides an explicit `--registry` flag during publish and
must be moved aside first.

## Verify

```sh
npm test
```

runs, in order: the Discord app's `check` (`tsc --noEmit`) and `build`
(`tsc`); the root's `node --test test/*.test.mjs`; then the Discord app's
own `test`. Each `services/*` package verifies independently via its own
`npm test` — see each package's README for its exact test command.

## Deployment

Deployment targets a GCE box (`bare-cedar-fog-cloud-mirror`, under the
existing content-addressed release convention) for the stateful, always-on
Discord gateway server and the steward CLI, and Cloud Run for the
stateless, least-authority union-media ActivityPub origin, with secrets in
Google Secret Manager rather than a checked-in `.env`. The full reasoning —
including the registry-strategy recommendation and the sequenced work
packages (`WP-DEPLOY-01` through `WP-DEPLOY-09`) — is recorded in the
deployment architecture memo.

## Further reading

- [`src/apps/turntide-islands-discord-platform/dev/content/notes/2026-08-20-turntide-islands-synthesis.md`](src/apps/turntide-islands-discord-platform/dev/content/notes/2026-08-20-turntide-islands-synthesis.md)
  — a working synthesis of the 2026-08-20 repair-and-recon campaign:
  Turntide's three-descriptions framing (philosophical, technical, social),
  an honest assessment of the machine's state, and the roadmap across
  personas, web presence, product lanes, and the proof-of-adaptation/DAO
  arc.
- [`src/apps/turntide-islands-discord-platform/dev/content/notes/`](src/apps/turntide-islands-discord-platform/dev/content/notes/)
  — further dated working notes from the same campaign.
