# Consolidation notes

This repo gathers Aletheon game content into one place. Gather-only pass:
nothing has been fixed, deduplicated, or reconciled yet.

Only one generation of Aletheon was found (no split-out "current" generation
exists, unlike Farstone), so its content sits directly at the repo root rather
than under `lib/legacy/`. `README.md` at the root is Aletheon's own project
README, moved as-is with the rest of the tree — not this file.

Source: was `apps/games/aletheon` inside the `2026-06-17-archive.emsenn.net`
legacy snapshot in the `red-cup-engineering` submodule.

## Not included, on purpose

- `qwzspace-server` and `@561-group/qwzspace` — related engines Aletheon
  depends on / that generalized from Aletheon's prior art, but not Aletheon
  itself. `qwzspace-server` has its own upstream repo
  (`github.com/emsenn/qwzspace-server`) and a from-scratch icosahedral
  geometry substrate unrelated to Aletheon's voidmath spacetime/kernel model.
  Left where they are.

## cold-red-gate

Checked `cold-red-gate` (tailnet 100.118.93.93) for another copy: found
`/home/emsenn/561-group/_archive/from-content-source/apps/games/aletheon/`,
44/47 files byte-identical to the copy here, the other 3 differing only in
prose line-wrapping (same content, different formatting convention). Not
pulled. There was a past production deployment (nginx conf + Let's Encrypt
certs for `aletheon.561.group`) but it is fully decommissioned now — nginx
site not enabled, no Caddy route, no systemd unit, nothing currently live.
Nothing was modified or deleted on cold-red-gate.
