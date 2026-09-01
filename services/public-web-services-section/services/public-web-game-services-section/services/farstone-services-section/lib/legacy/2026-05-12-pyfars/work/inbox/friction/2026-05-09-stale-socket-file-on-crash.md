---
type: friction-report
authored: 2026-05-09
status: open
surface: deployment, engine-supervision
domain: nix-flake, install-prod, engine-uds, halt-cleanup
---

# Stale `.pyfars/run.sock` on crash blocks `make install-prod`

When the engine's clean-halt path doesn't run to completion — SIGKILL after the systemd halt-timeout, OOM, hard crash — the Unix-domain-socket inode at `<polity-root>/.pyfars/run.sock` persists on disk as a dead file.
The next `make install-prod` then fails before it ever reaches the build step:

```
==> updating tool inputs to track main
==> building pyfars at the new pinned revisions
error: file '/home/emsenn/561/.pyfars/run.sock' has an unsupported type
```

## Why this happens (the actual Nix issue)

The nix-store data model supports three filesystem entry types: regular files, directories, and symlinks.
Sockets, FIFOs, character devices, and block devices are **not store-ingestible** — they're stateful kernel objects with no meaningful content-hash.

`make install-prod` resolves to the flake script's `nix build "path:$root#pyfars" --out-link "$root/.pyfars/prod-result"`.
The path-fetcher's first move is to copy the entire flake source tree into the nix store so it can read `flake.nix` from a stable hash.
When the tree-walk hits a socket inode, it errors with `unsupported type` and aborts.
There's no skip-this-entry flag at that layer because the layer's job is "make a faithful, content-addressed copy" — silently dropping entries would break reproducibility.

The `.pyfars/run.sock` entry is `.gitignore`'d, but **the path-fetcher walks the filesystem, not the git index**, so `.gitignore` doesn't help here.

## Why this is structural, not just one stale file

The engine's `governance/specifications/services/pyfars-engine.md` declares `halt-timeout-seconds: 30`. systemd-user sends SIGTERM, waits 30s, then SIGKILL. **Any** tick whose clean-halt exceeds 30s — long-running LLM call, blocked write, stuck closure-rule firing, slow flush of the event log — produces a SIGKILL'd engine and therefore a stale socket.
The next operator's `make install-prod` then fails at the path-fetch step before reaching `nix build`.

So the failure mode isn't bound to one crash; it's bound to "ever taking longer than 30s to halt cleanly."

## The immediate dead-inode garbage collection

For a one-off recovery: `rm <root>/.pyfars/run.sock` while the engine is not running.
The engine recreates the socket on next start.
This unblocks the current install-prod attempt and is what was done to unstick the 561 polity on 2026-05-09.

This is a manual GC step, not a fix.

## Canonical directions worth weighing

Roughly in order of likely engineering payoff:

- **Switch install-prod's flake fetcher from `path:` to `git+file://`.** The git-fetcher only ingests git-tracked content; untracked runtime state (`run.sock`, `result*`, `prod-result`, `profile/`, etc.) is invisible to it by construction. install-prod already refuses on dirty trees, so happy-path behavior is unchanged.
  This makes install-prod immune to *any* live runtime state in the polity tree, not just sockets — the whole class of "Nix path-fetcher chokes on something the polity emitted" goes away.

- **Move the live UDS out of the flake source tree.** Bind the socket at `$XDG_RUNTIME_DIR/pyfars-<polity-slug>/run.sock` (per-polity, populated by systemd's `RuntimeDirectory=`), with a symlink at `<root>/.pyfars/run.sock` so wiring-protocols §4.5 stays literally true and clients connect transparently.
  Symlinks ARE store-ingestible; their target need not exist at fetch time.
  This deviates from the implicit "the socket inode lives at this path" reading of the spec and probably warrants a §4.5 update.

- **Engine pre-start GC.** Have the engine, on startup, `unlink(2)` any stale socket at its bind path before `bind(2)`.
  Standard pattern for daemons binding UDS.
  Doesn't help with install-prod fetching the polity tree before the engine restarts (the path-fetcher still sees the stale inode), but it's good hygiene independent of the deploy-path fix.

- **Engine halt path shortening.** The 30s halt-timeout exists for a reason; it's the upper bound where the supervisor escalates.
  Engine-side halt should be designed to always finish in ≤10s under any in-flight tick state — which probably means cancelling LLM calls on SIGTERM, not waiting for them to complete.
  This is its own piece of work and doesn't fully solve the deploy-path issue, but reduces frequency.

## What is being done about it now

For the 2026-05-09 incident: just the manual `rm` to unblock that install-prod attempt, plus this report.
No engine or harness changes.
The captain has been notified that the underlying issue is structural, not handled in the unblocking step.

## Cleanup, when someone picks it up

Pick one or more of the canonical directions, file as engineering tasks under `work/tasks/engineering/`, and link them back to this report.
The first direction (`git+file://`) is the cheapest and broadest-coverage fix; the second is the most "right" architecturally; the third and fourth are independent hardening that ought to happen regardless.

## Provenance

Surfaced 2026-05-09 by the executive officer (Claude-Opus-4.7) during the audit-substrate-bootstrap project, while attempting to redeploy the 561 polity engine with `--pin` substitution.
The redeploy failed because a prior stop-sigterm timed out and SIGKILL'd the engine, leaving its UDS socket inode stale on disk.
The 30s halt-timeout was hit during normal operation, not under unusual load, suggesting the bound is too tight or the halt path is doing too much.
