# Studio filing correction — 2026-08-19

Filing had drifted to placing things by proximity and recency instead of by kind. Corrected:

| Kind | Wrong place (dissolved) | Right place |
|---|---|---|
| Published games, storefront, vision/design notes | invented top-level section | public games section |
| Game systems (cartridge, energy-bank, engines) | invented "gaming systems" section | computer-game-system section |
| Science / theory / study of gaming | scattered | game-science section |

Moves made: cartridge and energy-bank to the systems home; enterprise notes, the estate
map/inventory, planned-game notes (now under `notes/planned/`), and the play.561.group
site to the games home; the invented sections deleted. A compatibility symlink remains
at the old enterprises-section path for any in-flight caches; remove it once nothing
references it.

## Decisions taken the same day

- Server-shaped services (ruinfold, the tidepool MUD, the ActivityPub instance) target
  Google Cloud Run; static/game frontends stay on Cloudflare. The small VPS is reserved
  for things that want a stable tiny box (package registry mirror, cron), not game
  traffic.
- Planned games are notes under `notes/planned/`, not stub services — a game earns a
  real services directory once real code exists.
- New systems (storylet compiler, city-builder kernel, render-family recovery) go under
  the computer-game-system section from day one as small composable packages.

## Registry reachability check — 2026-08-19

Local registry (`127.0.0.1:4873`) confirmed reachable: answers `npm ping`, serves full
metadata for the math and cartridge packages.

Remote registry (`registry.561.group`, on the house's small VPS) confirmed reachable
after a disk cleanup freed space on that box: `npm ping` returns `PONG`; a from-scratch
`npm install` in an empty directory resolved and fetched real tarballs from that host;
both packages were then imported and run, not just installed (the math package's
bilattice module exported 37 functions, the cartridge package's root export 16).
Mirroring the rest of the package scope to the remote registry was in progress at time
of writing and continues unattended.

Policy going forward: publish to both registries, local first, then the remote mirror,
until one is designated authoritative.
