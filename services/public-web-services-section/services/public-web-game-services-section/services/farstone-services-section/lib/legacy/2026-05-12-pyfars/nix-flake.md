---
kind: tool-flake-contribution
title: "pyfars contributions to a parent polity's Nix flake"
description: "What pyfars contributes when consumed as a flake input by a parent polity. Schema defined in the polity's `governance/assets/computing/nix-flake.md` (section 13)."

# pyfars's own _index.md carries the nix-package: block that names this
# tool as a flake input. This file is the polity-side contribution
# declaration: what shell-packages, apps, modules, or extra inputs the
# parent flake should pick up when it merges pyfars in.

contributes-shell-packages:
  source: "this tool's flake `devShells.${system}.default.nativeBuildInputs`"
  notes: |
    Implicit: the parent polity's nix-flake harness merges this tool's
    devShell packages into any polity task-shell that lists `pyfars` in
    `tool-shell-merge`. No explicit list needed unless a parent wants a
    subset.

contributes-apps:
  - { slug: pyfars,         description: "the pyfars CLI" }
  - { slug: pyfars-engine,  description: "boot the polity engine (web + MCP + control-plane)" }
  - { slug: pyfars-bootstrap, description: "first-time setup for a checkout" }
  - { slug: pyfars-install, description: "project active harnesses + add to dev profile" }
  - { slug: pyfars-clean,   description: "uninstall + clean projected outputs" }
  - { slug: pyfars-deploy,  description: "build + advance prod profile + restart services" }
  - { slug: pyfars-help,    description: "list polity flake catalog" }
  notes: |
    These apps are emitted by the polity's nix-flake harness as
    `apps.<slug>` (without the `pyfars-` prefix where the parent
    chooses to drop it for ergonomics).

contributes-extra-inputs:
  - input-name: pypredcalc
    follows-from-parent: true
    notes: "pyfars depends on pypredcalc; if the parent polity also declares pypredcalc as an input, pyfars's pypredcalc input should follow the parent's via `inputs.pypredcalc.follows = \"pypredcalc\"`. This is what `_index.md` `nix-package.follows-inputs:` is for; add `pypredcalc` to that list to enable the follow."

contributes-nixos-modules:
  source: "currently authored hand-coded in pyfars-flake harness template"
  current-modules:
    - pyfars-engine
  notes: "Future: move module bodies into pyfars itself and have the parent harness import them via this asset."

---

# pyfars — flake contributions

This file declares what pyfars contributes to a parent polity's Nix flake.
The pyfars `nix-flake` harness (this tool's own product) reads files of this shape across all tool inputs and merges their contributions into the polity flake.

Today this file is **mostly documentation** — the harness already auto-merges each tool's `devShells.default.nativeBuildInputs` into polity task-shells via `tool-shell-merge`, so `contributes-shell-packages:` is implicit.
The other fields (`contributes-apps`, `contributes-extra-inputs`, `contributes-nixos-modules`) describe what *would* be authored once the harness reads this file.

Until the harness consumes this asset (tracked in the polity's `nix-flake.md` migration backlog), edit this file as an authoritative record of what pyfars *intends* to contribute, and update the harness when the gap closes.
