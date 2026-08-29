# deploy — aletheon (historical: nginx/systemd VPS, decommissioned)

> **This document describes a decommissioned deploy path.** Aletheon is actually live today on
> **Cloud Run**, routed through a Cloudflare Worker — see the top-level `../README.md`'s "Deploy"
> section for the real, current command, bucket, and live-verification evidence. This file is
> kept as history (`CONSOLIDATION.md` independently confirms the VPS target below is fully
> decommissioned), not as current instructions — nothing here should be followed to deploy
> Aletheon as it actually runs now.

The game **used to be** served at **`aletheon.
561.group`** (covered by the `*.
561.group` wildcard DNS → `45.76.19.133`), reverse-proxied by nginx to the server on a loopback port.
Aletheon is a **WebSocket** app, so its nginx block forwarded the `Upgrade`/`Connection` headers.

## The one place the deploy is parameterized

Domain and port live in **one** declaration — the `561:serve` block in [`../package.json`](../package.json):

```jsonc
"561:serve": {
  "domain": "aletheon.561.group",   // the nginx server_name
  "kind":   "proxy",
  "port":   18794,                  // the loopback port the app binds AND nginx proxies to
  "ws":     true                    // forward the WebSocket Upgrade/Connection headers
}
```

Nothing else hard-codes these.
The server reads `port` from this block at startup (`scripts/aletheon-server.mjs`; `PORT`/`HOST` env still override for local runs), and the repo-root nginx generator reads the same block.
To **change the port or domain**: edit this block, run `node deploy/generate-nginx.mjs` from the repo root, and `sudo systemctl restart aletheon`.

## Pieces

| file | what |
| --- | --- |
| `../package.json` → `561:serve` | the source of truth for domain + port (above). |
| `../../../../deploy/nginx/aletheon.561.group.conf` | the nginx block — **generated**, do not hand-edit. |
| `../../../../deploy/systemd/aletheon.service` | the systemd unit (central, installed by `make deploy`); carries only host facts (user, checkout path, node), not port/domain. |
| `aletheon-world.jsonl` | optional append-only EAVT world log for replay (generated; git-ignored). |

## Install

Deployment is centralized: `make deploy` (repo root) reads every `561:serve` block, generates the nginx vhosts (`deploy/generate-nginx.mjs`), installs the systemd units from `deploy/systemd/`, runs certbot for any missing certs, and reloads nginx/systemd.
So the whole install for this game is:

```sh
make deploy        # from the repo root (needs sudo; see deploy/README.md)
```

TLS: certbot clones the `:80` block into a `:443` server carrying the ws config; `wss://` then rides the same upgrade (no client change — it picks the scheme from `location.protocol`).
DNS for `aletheon.
561.group` is covered by the `*.
561.group` wildcard.
Verify at `https://aletheon.
561.group/` in a WebGL2 browser.

## Notes

- **Zero dependencies, zero build.** Node serves the `.mjs` straight to the browser, and the voidmath kernel is reached by a relative path.
  Deploy = check out the repo, run the one process.
- **Rollout after code changes:** `git pull && sudo systemctl restart aletheon`.
- **State.** (True of this old VPS path only.) The world was the in-memory EAVT trace, optionally
  mirrored to `WORLD_LOG` — but nothing ever read that file back at boot here, so restarting
  reseeded the realm regardless. The live Cloud Run deploy no longer has this gap — see
  `../README.md`'s "Persistence" and "Deploy" sections for the real, current, restore-on-boot
  behavior (still no player *accounts*, just world-state persistence).
