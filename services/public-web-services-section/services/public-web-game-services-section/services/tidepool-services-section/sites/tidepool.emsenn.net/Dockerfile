# Minimal Cloud Run deploy image for Tidepool (the LLM-native tidal-shore MUD, src/serve.mts).
# Same minimal house pattern as this estate's other services (per the deploy runbook's
# farstone/aletheon rows): FROM node:24-slim, COPY the tree as-is, no `npm install`/`npm ci` at
# build time — Cloud Build has no access to the house Verdaccio registry (127.0.0.1:4873,
# local-only), confirmed by aletheon's own Dockerfile comment recording exactly this. Instead
# this ships the ALREADY-Verdaccio-resolved local node_modules directly: feltos, qwzspace, and
# arnold are all genuinely real, non-symlinked directories under
# node_modules/@red-cup-engineering/ (verified before writing this file), so a plain `COPY . .`
# packages every one of them correctly, no vendoring step for any of the three.
#
# `.gitignore` carries no unanchored `node_modules/` rule — the same fix aletheon's own
# Dockerfile documents — so nothing under node_modules is at risk of being silently dropped by
# the upload ignore-list either.
#
# Persistence: FELTOS_BUCKET is set at deploy time (gcloud run deploy --set-env-vars), which
# routes src/world-store.mts to the GCS bucket backend (src/gcs-client.mts) — ambient Cloud Run
# service-account credentials via the metadata server, no key file, no credential env var. Unset
# (local `npm run serve`), FELTOS_SAVE alone still means a local filesystem path exactly as
# before this deploy; neither set means in-memory only.
#
# --max-instances 1 is LOAD-BEARING (not a cost knob): world-store.mts's conditional-write retry
# loop assumes a single writer; see that module's own header.
FROM node:24-slim
WORKDIR /app
COPY . .
ENV HOST=0.0.0.0
ENV NODE_ENV=production
# PORT is injected by Cloud Run at container start; src/serve.mts already reads process.env.PORT
# (falling back to FELTOS_PORT, then 18830) — no source edit needed.
CMD ["node", "src/serve.mts"]
