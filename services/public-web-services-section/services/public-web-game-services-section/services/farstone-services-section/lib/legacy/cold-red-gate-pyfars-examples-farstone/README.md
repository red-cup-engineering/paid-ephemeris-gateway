# Farstone

A small island polity, built as PyFARS's primary downstream-package example.

**Mt Farstone** rises at the island's center; the **town of Farston** sits on the harbor at the mouth of the Farr River.
The polity's substrate scope is the whole island — the town and its government share it with the mountain, the salt marsh, the farms, the working harbor, and the mainland-ferry.
See [`_index.md`](_index.md) for the full setting.

## What this repo is

This is a **polity-as-package** — a Python package that bundles the Farstone substrate and depends on [PyFARS](https://github.com/emsenn/pyfars) as the engine that interprets it.
Most of the application is markdown + YAML substrate; the small `farstone` Python package provides the console entry point and access to the bundled corpus.

The shape mirrors how a Pygame game depends on Pygame: Farstone is its own package, PyFARS is the runtime dependency, and the packaged substrate is the domain program PyFARS runs.

Farstone is meant to stand on its own.
Treat PyFARS as an upstream package/flake and Farstone as a downstream Python package/flake; local development can override the `pyfars` input, but the repo should not rely on living inside the 561 Group checkout.
The default `pyfars` input resolves over SSH from `git@github.com:emsenn/pyfars` at `main`, so operators need SSH access to the private PyFARS repository.

## Running farstone standalone

Requires a working Nix install with flakes enabled.
From a clone of this repo:

```bash
nix run .#farstone-engine
```

When run from a Farstone checkout, this boots the engine against the checkout so runtime state lands under `.pyfars/`.
When run from some other directory, the Python package creates a temporary writable copy of its bundled corpus and prints that path; use `FARSTONE_ROOT` when you want persistent state:

```bash
FARSTONE_ROOT="$PWD" nix run .#farstone-engine
uv run farstone-engine --help
pyfars run "$PWD"
```

To test Farstone against a local PyFARS checkout without pretending both repos are one project:

```bash
nix run --override-input pyfars path:/path/to/pyfars .#farstone-engine
```

Or as a supervised systemd-user service (Linux):

```bash
pyfars materialize systemd-user --root "$PWD"
mkdir -p ~/.config/systemd/user
cp .pyfars/harness-output/systemd-user/farstone-engine.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now farstone-engine.service
```

The supervision spec lives at [`governance/specifications/services/farstone-engine.md`](governance/specifications/services/farstone-engine.md).
Edit it (substrate-root, ports, env-file) before running the materializer if your layout differs.

## Running farstone as part of another polity's deployment

Polities that want to host farstone alongside their own services (the [561 Group](https://github.com/emsenn/561) hosting it at `farstone.
561.group`, for instance) wire it as a flake input and author their own service-spec under their substrate.
They don't use the standalone default in this repo.
The colocation principle: the running deployment lives where it runs, not where the polity it hosts is authored.

## Layout

| Path | Mirrors |
|---|---|
| `governance/charter.md` | the city charter — hard-core commitments and procedural rules |
| `governance/decisions/` | council-adopted resolutions and binding decisions |
| `governance/specifications/` | technical specs (water-quality, geography, biome, services) |
| `governance/places/` | named places — neighborhoods, landmarks, the mountain, the marsh |
| `governance/cadences/` | substrate-resident cadences (heartbeat, hour, day, season) |
| `governance/offices/` | mayor, council, dept director offices |
| `governance/agents/` | named human + automated incumbents |
| `governance/skills/` | procedural skills offices exercise |
| `governance/runbooks/` | composed procedures (skill-sequences with branching) |
| `governance/duties/` | mandatory recurring duties |
| `governance/jural-relations/` | citizen↔council and council↔dept normative pairs |
| `governance/state/` | live substrate cells the engine reads each tick (world-clock, weather, tide) |
| `governance/assets/computing/web/` | website asset cells declaring the engine's web + MCP services |
| `objects/` | closure-rule records active for this polity |
| `work/tasks/` | workitems across all four subtypes |
| `operations/triage/dispatch-intents/` | citizen-filed intents awaiting routing |
| `src/farstone/` | Python package entry point and bundled-corpus launcher |

## Status

Sketch.
The records are believable enough to dispatch, but the island's history is not deeply specified.
Extend incident records, council minutes, citizen rosters, biome surveys, etc., as later work needs richer context.
