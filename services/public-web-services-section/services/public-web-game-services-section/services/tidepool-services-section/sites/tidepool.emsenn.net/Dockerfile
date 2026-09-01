# Minimal Cloud Run deploy image for Tidepool (the LLM-native tidal-shore MUD, src/serve.mts).
# Same minimal house pattern as this estate's other services (per the deploy runbook's
# farstone/aletheon rows): FROM node:24-slim, COPY the tree as-is, no `npm install`/`npm ci` at
# build time — Cloud Build has no access to the house Verdaccio registry (127.0.0.1:4873,
# local-only), confirmed by aletheon's own Dockerfile comment recording exactly this. Instead
# this ships the ALREADY-Verdaccio-resolved local node_modules directly: qwzspace and arnold are
# genuinely real, non-symlinked directories under node_modules/@red-cup-engineering/ (verified
# before writing this file), so a plain `COPY . .` packages them correctly with no vendoring
# step, matching aletheon's own precedent for its own real dependencies.
#
# feltos is the ONE exception, matching farstone's own fizzos-era precedent (see
# vendor/@red-cup-engineering/feltos/VENDORED.md for the full account) — but for a narrower
# reason than that precedent originally had. Verdaccio's published `feltos` (0.5.0) is now an
# EXACT match for the active source tree (unlike the fizzos-era gap this replaces, where
# Verdaccio lagged one patch behind), so local dev's own
# `node_modules/@red-cup-engineering/feltos` is already a genuine, non-symlinked, Verdaccio-
# resolved directory — same shape as qwzspace/arnold, not a broken-in-context symlink. This
# Dockerfile still swaps it for the vendored copy anyway, purely for **provenance pinning**: the
# vendor copy is a fixed, audited snapshot (see VENDORED.md), so the deployed image never
# silently depends on whatever Verdaccio happens to hold at some future `npm install` time. See
# VENDORED.md's own "Notable difference" section — a human may reasonably decide this swap step
# no longer earns its complexity and drop it, treating feltos exactly like qwzspace/arnold; this
# Dockerfile keeps it, matching what this migration was asked to do.
#
# `.gitignore` here (unlike Farstone's) carries no unanchored `node_modules/` rule — the same
# fix aletheon's own Dockerfile documents — so nothing under node_modules is at risk of being
# silently dropped by the upload ignore-list either.
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
RUN mkdir -p node_modules/@red-cup-engineering \
 && rm -rf node_modules/@red-cup-engineering/feltos \
 && cp -r vendor/@red-cup-engineering/feltos node_modules/@red-cup-engineering/feltos \
 && mkdir -p node_modules/@red-cup-engineering/feltos/node_modules/@lenticule-science \
 && mv node_modules/@red-cup-engineering/feltos/deps/@lenticule-science/metrologic node_modules/@red-cup-engineering/feltos/node_modules/@lenticule-science/metrologic \
 && rm -rf node_modules/@red-cup-engineering/feltos/deps
ENV HOST=0.0.0.0
ENV NODE_ENV=production
# PORT is injected by Cloud Run at container start; src/serve.mts already reads process.env.PORT
# (falling back to FELTOS_PORT, then 18830) — no source edit needed.
CMD ["node", "src/serve.mts"]
