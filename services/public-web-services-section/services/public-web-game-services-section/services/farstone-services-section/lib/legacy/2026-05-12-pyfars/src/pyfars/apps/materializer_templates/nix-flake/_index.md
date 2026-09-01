---
kind: harness
title: "Nix flake harness"
type: harness
target-default: "."
target-runtime: "repo-root"
spec: governance/specifications/nix-harness.md
manifest: ".pyfars/harness-manifests/nix-flake.json"
emits:
  - template: "flake.nix.j2"
    target-pattern: "flake.nix"
    mode: aggregate
    context: ["nix-flake"]
---


Generates the polity's `flake.nix` from substrate state plus a template owned by this harness, so the flake stays in sync with substrate cells (computer-system records, tool inputs, polity-task-shell declarations) rather than drifting as static prose.

Per [`governance/specifications/nix-harness.md`](../../../governance/specifications/nix-harness.md): this harness emits ONLY structure — `inputs`, `packages`, `apps`, `devShells`, `nixosConfigurations`.
Operator-orchestration verbs (deploy, rollback, status, dev-iterate) are NOT projected here; they live outside the flake projection and compose the emitted package/app surface.

## What it writes

| File | Template | Consumer |
|---|---|---|
| `flake.nix` | [`templates/flake.nix.j2`](templates/flake.nix.j2) | `nix develop`, `nix build`, `nix run`; any nix-aware deployment |

The manifest is written to `.pyfars/harness-manifests/nix-flake.json`.

## What the flake provides

Per spec §4.1 (outbound projection):

- **`inputs.<tool>`** — one per tool registered in the polity (driven by each tool's own `_index.md` `nix-package:` frontmatter — the spec's `kind: nix-input` cell, in the current substrate shape).
- **`packages.<tool>`** — the default package of each tool input.
  `packages.default` aliases `packages.pyfars`.
- **`apps.pyfars`** — `nix run .#pyfars -- <args>` invokes pyfars.
  Operators compose this for everything (`nix run .#pyfars -- run /path/to/polity` for the engine; `nix run .#pyfars -- nix-build <cell>` for builds; etc.).
  The polity Makefile wraps these for orchestration verbs.
- **`devShells.default`** — minimal: python + pyfars + git.
- **`devShells.<computer-system-slug>`** — one per registered computer-system whose `nix-system` matches the build host.
- **`devShells.<task-shell-slug>`** — one per polity-task-shell declared in `governance/assets/computing/nix-flake.md` `devshells:` section.
- **`nixosConfigurations.<host-slug>`** — one per computer-system with `nixos-managed: true`.
- **`nixosModules.{host-defaults,host-users,pyfars-engine,nginx-tls,publication-serving}`** — the polity's reusable NixOS modules.
- **`deploy.nodes.<host-slug>`** — for `deploy-rs` and similar tooling.

## What the flake does NOT provide

Per spec §5: no `apps.install-prod`, `apps.install-dev`, `apps.rollback`, `apps.install`, `apps.clean`.
These were operator-orchestration procedures masquerading as flake structure; they now live in the polity Makefile and call into the wrappers.

No profile-path constants.
No `nix profile` management.
The `pyfars nix-build --for-deploy` wrapper writes gc-roots directly per spec §6.3; the systemd unit's `--pin`'d ExecStart binds a service to a settled store path; no profile in the chain.

## Substrate context the template sees

Built by `_build_context` in `pyfars.programs.nix_flake_materializer.
NixFlakeMaterializerProgram`, exposed to the generic harness executor as the `nix-flake` context provider:

- `polity` — title and slug from the active command group records.
- `computer_systems` — the polity's registered computer-system records.
- `tool_packages` — substrate-derived flake inputs (per tool `_index.md` `nix-package:` blocks).
- `tool_input_names` — set of tool input slugs the flake actually declares (used to filter task-shell merges).
- `polity_devshells` — declared task-shells from `governance/assets/computing/nix-flake.md`.
- `substrate_root` — relative path to the FARS records/theory root.
- `generated_at`, `generation_command` — provenance.

## Run

```bash
pyfars materialize nix-flake                  # write flake.nix at repo root
pyfars materialize nix-flake --root <polity>  # write against a specific polity root
```

## Status

v0.2 (post-strip per `nix-harness.md`).
This harness's job is the outbound projection only: substrate cells to Nix flake structure.
The inbound/operator side is intentionally not encoded in the flake template.
