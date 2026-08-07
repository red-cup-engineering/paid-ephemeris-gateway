---
title: "jsnode as the workspace-topology layer"
date: 2026-06-16
description: "Notes from replacing the old repo-local agent skills with the jsnode library as the carrier-backed way to read package topology, conformance, consumption, linked data, and documentation surfaces."
---

# jsnode as the workspace-topology layer

The old `.agents/skills/*` directory was an ad hoc operational layer: scripts for describing packages, mapping topology, writing skills, and nudging package boundaries.
It was useful before the refactor, but it sat beside the codebase as a tool pile.

`@emsenn/jsnode` is the better replacement because it makes the workspace itself a carrier-backed object:

- `workspace` is the impure filesystem reader.
  It walks package strata once and reads `package.json` into `JSNodePackage` carriers.
- `topology` admits package facts as `Mark`/`Utterance` carriers: layer, exports, dependencies, lifecycle, maturity, scripts, bins, types, functions, and consumption.
- `graph` projects the settled package carriers into dependency graphs and ego graphs.
- `codecs` projects the same package terms into RDF/Turtle/JSON-LD linked data.
- `conformance` judges package boundaries against repository invariants as charged findings.
- `content` turns package surfaces into documentation cycles, reusing the same draft/gate/revise pattern as content production.

There is now a CLI projection for this carrier:

```sh
jsnode-workspace graph --focus @emsenn/koios.news --up 1 --down 3
jsnode-workspace graph --focus @emsenn/content-production --up 2 --down 3 --json
jsnode-workspace turtle --base https://repo.561.group/
```

This replaces the old package-topology skill script without recreating its data model.
The command reads `JSNodeWorkspace` carriers and renders graph or RDF projections.

Named concept: **workspace topology carrier**.
A package graph is not a report format; it is a settled reading over package utterances.
Reports, RDF, diagrams, search results, conformance output, and docs are projections of that carrier.

## Current Koios neighbourhood

Using `@emsenn/jsnode/workspace` plus `workspaceDependencyGraph()` and `egoGraph()`, the Koios neighbourhood reads:

```text
@emsenn/koios.news
  -> @emsenn/content-production
  -> @emsenn/content
  -> @emsenn/web
  -> @emsenn/communicating

@emsenn/content-production
  -> @emsenn/computing
  -> @emsenn/content
  -> @emsenn/communicating

@emsenn/computing
  -> @emsenn/animating
  -> @emsenn/gaming
  -> @emsenn/relating

@emsenn/gaming
  -> @emsenn/animating
  -> @emsenn/relating
```

So Koios is not outside the deeper computing/game system.
It is a site-level projection over `content-production`, and `content-production` already descends through `computing` into `games` and `relationality`.
The missing work is mostly name and surface alignment: make the farm cycle visibly a finite observation / strategy / gate trace, rather than a bespoke content tool.

## Shared structure

The recurring shape is:

1. Read or admit domain material as carriers.
2. Produce `witness | obstruction` judgments, never bare booleans.
3. Preserve an ordered trace with ordinals.
4. Project the settled carrier into a boundary surface: graph, RDF, HTML, feed, CLI output, MCP tool response, or documentation.

This appears in:

- `content-production`: demand/support meet, draft/gate/revise, farm tick, newsroom fiber, mill projection.
- `computing`: finite derivation provenance, observation map, arena projection, run judgments.
- `games`: arena/strategy laws, symmetry and strategy well-formedness judgments.
- `jsnode`: package/workspace topology, consumption edges, conformance findings, documentation cycles.
- `web`: HTTP resources, middleware/session witnesses, OpenAPI-ish and route projections.

Named concept: **projection ladder**.
The same underlying carrier is read at several heights: topology, graph, linked data, web resource, command output, agent work item, or editorial document.

## Practical consequence

Future content-mill work should prefer `jsnode` for repo orientation instead of recreating package graph scripts.
If we need an MCP or browser view of the system, the likely path is:

1. `discoverWorkspace()` reads packages.
2. `induceWorkspaceTopology()` settles package utterances.
3. `workspaceDependencyGraph()` / `egoGraph()` bound the view.
4. `workspaceTurtle()` or a web resource projects it for machines/browsers.
5. Content-production can consume that same graph to decide what package docs or dev posts need cultivation.

That gives the agent and the browser the same picture of the repo, instead of separate scripts with separate data models.
