# @emsenn/producing-content/content-farm

The agentic content-generation service of the content spine (newsroom lineage): `apps/content-computer` is the domain's computing, `services/content-tics` its trace/transport form, and CONTENT-FARM is the generation organism built over them.
A farm is configured with **properties** — publications it cultivates.
Each property declares its content dir, its data dir, its seed terms, its demand source (an optional Search Console pull), its voice, its ask model, and its gates' parameters.
The farm hard-codes no publication.

It subsumes the koios.news mill (2026-06-12): the gates, story selection, prophecy/repetition/title-fidelity machinery, the demand table, and the run cycle moved here, parameterized by `producing-content.config.json` in each publication package.

## The cycle

One `cultivate(property, { at, ask, ... })` call is one witnessed cycle — recurrence belongs to the farm tick (or a systemd timer), and time enters as the `at` parameter:

1. **Demand creates the assignment** — seed terms + earned views + Search Console queries − coverage decay (`demandTable`).
  Demand creates assignments, never evidence.
2. **Witnessed intake** for the assignment's beat; transport failures are obstruction values inside the cycle.
3. **Demand meets supply** — the assignment settles on the highest-ranked term today's intake actually supports, judged on the term's distinctive words.
  When no term in the beat is supported, the result is the `unsupported-demand` **CultivationObstruction**: no article, witnessed, and the term stays in the table for the day its event arrives.
4. **One story, one article** — the term is the lens; `selectStory` picks the single best-supporting source story; at most two other intake items travel as supporting context.
5. **Draft → eleven gates → at most two revisions** — the ask enters as a value; the gates (length, seo-lede, seo-subheader, citations, no-prophecy, repetition, summary-length, title-fidelity, template-monotony, prose, extras) are values with evidence.
6. **Projection** — the candidate is written into the property's content dir **always `draft: true`** (the farm never publishes; publication is the orchestrator's editorial read); the gate verdict travels in `<termKey>.gates_clear`.
7. **The run trace** — every run (shipped, withheld, obstructed) is appended to the property's `runs.jsonl` with full gate evidence.
8. **The editorial desk** — when a hub is configured, the candidate is deposited as a work item on the 561 swarm hub (`POST /work-board/<gateModel>/deposit`; `requiredSkill` names the gate model, `office` names the property; already-open work is skipped).

**Compost**: withheld drafts and the run trace ARE the compost — subpar output retained as learning substrate.
`compost(replayRuns(path))` reads the withheld and obstructed runs back with their gate evidence; the service serves it at `/compost.json`.

## The service form

`ContentFarmService` (configured by a persistent JSON document shaped as `{ name, port, properties }`; legacy package manifests may still wrap it under `561:content-farm`) runs a farm tick per cycle ordinal: per property, demand pull (when `property.demand` configures a Search Console property) then cultivation.
`tick()` is the witness-driven advance; `start()` installs a polling fallback only.
The HTTP surface binds to **127.0.0.1**:

- `GET /healthz`
- `GET /runs.json` — the replayed run traces, per property
- `GET /compost.json` — the compost reading, per property
- `GET /snapshot.json`

The ask computing is **never** exposed over HTTP.

## Quick start

```ts
import { cultivate, isCultivationObstruction } from "@emsenn/producing-content/content-farm";

const result = await cultivate(property, { at: "2026-06-12", dryRun: true });
if (isCultivationObstruction(result)) {
  console.log(`no article (demand exceeds warrant): ${result.evidence}`);
} else {
  console.log(`${result.shipped ? "gates clear" : "withheld"}: ${result.slug}`);
}
```

CLI: `content-farm producing-content.config.json` runs one cycle and exits (the systemd-timer mode).
With no argument it first looks for `./producing-content.config.json`, then falls back to `./package.json` for legacy manifests.
Hub deposit is configured by `CONTENT_FARM_HUB` (or `SWARM_561_HUB`) and `CONTENT_FARM_HUB_TOKEN_FILE`.

## Export groups

- **drafting** — `draftPrompt` (voice as a value: `ArticleVoice`), `parseDraftReply`, `PostDraft`, `FORM_EXEMPLAR_DEFAULT`.
- **gates** — `judgeDraft`, `gateFindings`, `lintSuggestions`, and the individual readings (`wordCount`, `prophecyFindings`, `repetitionFindings`, `titleFidelityFindings`, `templateMonotonyCount`, `extractLinks`).
- **story** — `selectStory`, `distinctiveTermWords`, `termSupportCount`.
- **demand** — `demandTable`, `readSearchConsole`, `SeedTerm`, `DemandEntry`.
- **property** — `FarmProperty`, `normalizeFarmProperty`, `candidateDocument`, `loadCandidates`, `runsPath`.
- **cultivation** — `cultivate`, `isCultivationObstruction`, `editorialWorkItem`, `depositEditorialWork`, `replayRuns`, `compost`.
- **computer** — `runProductionCycle`, `gateWitness`, `gateObstruction`, `productionMove`, and `productionStrategyReading` for representing content production as the same game played in different arenas by different strategies.
- **service** — `ContentFarmService`, `createContentFarmService`, `contentFarmConfigFromDocument`, `contentFarmConfigFromManifest`.
