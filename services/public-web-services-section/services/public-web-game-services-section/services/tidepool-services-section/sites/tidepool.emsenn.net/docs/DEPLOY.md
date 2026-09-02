# Deploy

Tidepool deploys to **cold-red-gate** (the VPS) under the release convention — release dir +
`current` symlink + release-local `.npmrc` + systemd `--user` unit + Caddy block — fronted by the
`cloudflare-router` Worker mapping `tidepool.561.group` to `http://ops.561.group:<port>`. This is
the same shape `farstone.561.group` uses (world-host-runtime note, 2026-09-01, deploy-lane
section); GCP billing stays permanently off, so there is no Cloud Run lane any more.

**Live** as of release `20260902-1`: `tidepool.service` active on cold-red-gate, Caddy `:8082`
fronting it, `cloudflare-router` deployed with `ORIGIN_BY_HOST["tidepool.561.group"]` pointed
here — `https://tidepool.561.group/` serves real content end to end (deployment receipt in this
section's `data/logs/`).

## Release

```sh
# on cold-red-gate, as emsenn:
rsync -az --exclude node_modules --exclude .git --exclude package-lock.json \
  <checkout>/ ~/.local/share/561-group/releases/tidepool/<tag>/
cd ~/.local/share/561-group/releases/tidepool/<tag>/
printf '@red-cup-engineering:registry=https://registry.561.group/\n@causeway-services:registry=https://registry.561.group/\n@lenticule-science:registry=https://registry.561.group/\n' > .npmrc
npm install --no-audit --no-fund
npm test
ln -sfn ~/.local/share/561-group/releases/tidepool/<tag> ~/.local/share/561-group/releases/tidepool/current
```

`current` is what the systemd unit's `WorkingDirectory` points at — a symlink flip is the whole
cutover, same as farstone's.

## Persistence: a local file, not GCS

`FELTOS_SAVE=/home/emsenn/.local/state/561-group/tidepool/world.json`, no `FELTOS_BUCKET`. GCS is
unreachable from the VPS by design — the house GCS client authenticates by ambient workload
identity only, and no metadata server exists there — so footing's GCS transport (bundled inside
`@red-cup-engineering/world-hosting`) is a capability of the runtime, not the VPS production path.

## systemd unit

`~/.config/systemd/user/tidepool.service`:

```ini
[Unit]
Description=Tidepool (FeltOS/QwzSpace tidal shore) HTTP
After=network-online.target
Wants=network-online.target

[Service]
Type=exec
WorkingDirectory=/home/emsenn/.local/share/561-group/releases/tidepool/current
Environment=NODE_ENV=production
EnvironmentFile=/home/emsenn/.config/561-group/tidepool.env
ExecStart=/home/emsenn/.nvm/versions/node/v24.16.0/bin/node src/serve.mts
Restart=always
RestartSec=2
TimeoutStopSec=10

[Install]
WantedBy=default.target
```

`~/.config/561-group/tidepool.env`:

```sh
FELTOS_SAVE=/home/emsenn/.local/state/561-group/tidepool/world.json
FELTOS_PORT=18830
HOST=127.0.0.1
```

Tidepool has no telnet transport (unlike farstone), so `HOST` stays loopback-only — no ufw rule
is needed for a wider bind on the internal port; only the Caddy-facing port below is opened.

## Caddy block

Hand-maintained in `~/.config/caddy/Caddyfile`, marked to survive `deploy-caddy` managed-section
rewrites. A bare numeric-port block (not a domain block) — this is the origin the
`cloudflare-router` Worker fetches, same shape as farstone's `:8080` and casino's `:8081`:

```
# tidepool.561.group — Tidepool FeltOS/QwzSpace world, HTTP+WS face. Hand-maintained; survives
# deploy-caddy managed-section rewrites. Numeric-port block: this is the origin the
# cloudflare-router Worker fetches (ORIGIN_BY_HOST["tidepool.561.group"]), same shape as
# farstone (8080) and casino (8081).
http://:8082 {
	reverse_proxy 127.0.0.1:18830
}
```

Reload (not restart) after editing: `caddy reload --config ~/.config/caddy/Caddyfile` (or the
house `systemctl --user reload caddy` equivalent).

## Router

`cloudflare-router` (`public-computer-games-services-section/sites/cloudflare-router`)
`ORIGIN_BY_HOST["tidepool.561.group"]` points at `http://ops.561.group:8082` — the dead Cloud Run
hostname is retired. `tidepool.561.group` is already a Cloudflare route; `tidepool.emsenn.net`
has no DNS record and is not the property's address.

## `--max-instances 1` has no VPS equivalent to configure — it's structural

There is exactly one systemd unit, one process, one local file. The multi-writer hazard
`world-hosting`'s bucket-mode conditional-REPLACE-with-retry exists to guard against a Cloud Run
scale-out never arises here.

## Environment variables

| var | default | meaning |
|---|---|---|
| `PORT` / `HOST` | `18830` / `127.0.0.1` | listen address (`serve.mts`'s own `defaultPort`) |
| `FELTOS_SAVE` | unset | local file path for durable persistence (no `FELTOS_BUCKET` on the VPS) |
| `FELTOS_TICK_MS` | `300000` | real ms per world tick (5 real minutes — a tidal pace) |
| `FELTOS_MAX_CATCHUP_TICKS` | `50` | ticks caught up per request, capped so a long-idle instance doesn't stall one request |
| `FELTOS_SAVE_MS` | `30000` | the flush backstop interval (persists current state only — never runs a tick) |
