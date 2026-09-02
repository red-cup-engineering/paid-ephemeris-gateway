# Deploy

Same shape as the farstone/aletheon rows in the deploy runbook: Cloud Run, `Dockerfile`,
`FELTOS_BUCKET` for durable persistence, `--min-instances 0 --max-instances 1`.

```sh
gcloud run deploy tidepool \
  --source . \
  --region <region> \
  --min-instances 0 --max-instances 1 \
  --set-env-vars FELTOS_BUCKET=<bucket-name> \
  --allow-unauthenticated
```

## `--max-instances 1` is load-bearing, not a cost knob

`src/world-store.mts`'s bucket save is a conditional REPLACE guarded by GCS's own object
generation, retried on 412. That's only a genuine multi-writer hazard if two Tidepool instances
tick the same world concurrently — the instance cap is what guarantees that never happens. The
retry loop is a correctness backstop against transient contention, not a substitute for the cap.

## `--no-cpu-throttling`

Not set by default, same cost posture Farstone documents. Consequence, disclosed in
`catalog-entry.json`'s `statusNote`: Cloud Run's default per-request CPU throttling means the
world's catch-up/flush only runs while a request is actually in flight — if traffic is sparse
enough that no request/upgrade lands for a long stretch, the *next* one just catches up more
ticks at once (bounded by `FELTOS_MAX_CATCHUP_TICKS`), which is the intended behavior, not data
loss. Set `--no-cpu-throttling` if ticks need to land more promptly against low-traffic health
probes alone; same alternative Farstone's own runbook entry notes.

## No `npm install` at build time

Cloud Build has no access to the house Verdaccio registry (127.0.0.1:4873, local-only) —
confirmed live by aletheon's own Dockerfile comment. `Dockerfile` therefore ships the
already-Verdaccio-resolved local `node_modules` as-is via a plain `COPY . .` — feltos, qwzspace,
and arnold are all real, non-symlinked, exact-pinned directories there, no vendoring for any of
them. `.gitignore` deliberately carries no unanchored `node_modules/` rule, so nothing under
`node_modules/` is silently dropped from the upload context — the exact failure Farstone's own
build hit and documented.

## Environment variables

| var | default | meaning |
|---|---|---|
| `PORT` / `HOST` | `18830` / `127.0.0.1` | listen address (Cloud Run injects `PORT`) |
| `FELTOS_BUCKET` | unset | GCS bucket name — set this for durable persistence |
| `FELTOS_SAVE` | unset | bucket-mode: object name (default `world.json`); no-bucket mode: a local file path |
| `FELTOS_TICK_MS` | `300000` | real ms per world tick (5 real minutes — a tidal pace) |
| `FELTOS_MAX_CATCHUP_TICKS` | `50` | ticks caught up per request, capped so a long-idle instance doesn't stall one request |
| `FELTOS_SAVE_MS` | `30000` | the flush backstop interval (persists current state only — never runs a tick) |
| `TIDEPOOL_NO_WEB` | unset | set to `1` to disable the static web face (headless/agent-only deploys) |

## Router

Untouched — same subdomain-routing shape as the other `gaming-services-section` services;
`catalog-entry.json`'s `subdomain: "tidepool"` is what the router keys off.
