# Minimal Cloud Run deploy image for durante (the browser-playable QUAKE-like shooter, src/server.mjs).
# Zero build-time deps: node_modules (@red-cup-engineering/abrash, @red-cup-engineering/daleske,
# @red-cup-engineering/cartridge, @red-cup-engineering/footing -- the daily-tournament plumbing this
# app's own src/server/* modules used to duplicate with apps/ruinfold, now extracted -- and their own
# transitive @561-group/computer + @lenticule-science/metrologic) is already vendored on disk from the local-only
# Verdaccio registry Cloud Build can't reach, so this just copies the tree as-is and runs the existing
# server — same minimal pattern as the other 561.group game services' Dockerfiles (crucible, solitaire,
# gambling-trainer, ruinfold): FROM node:24-slim, COPY . ., no npm install at build time, CMD the
# entrypoint. src/server.mjs already reads PORT from the environment (resolvePort()) and binds
# "0.0.0.0" by default, so no HOST override is needed here.
#
# Daily tournament persistence: DURANTE_BUCKET is set at deploy time (gcloud run deploy
# --set-env-vars DURANTE_BUCKET=durante-daily), which routes @red-cup-engineering/footing's
# store-factory to the GCS bucket-store — ambient service-account credentials via the metadata
# server, no key file, no credential env var — matching ruinfold's own DURANTE_BUCKET-style pattern
# exactly. Unset (local dev, `npm start`), it falls back to the local JSONL file-store under
# apps/durante/data/. A single-instance local file-store is fine for dev, but is NOT safe for a
# multi-instance Cloud Run deploy (the one-scored-attempt lock and JSONL appends need the bucket's
# atomic conditional writes to stay correct across concurrent instances) — DURANTE_BUCKET must be set
# for any real multi-instance production deploy of the daily routes.
FROM node:24-slim
WORKDIR /app
COPY . .
ENV NODE_ENV=production
CMD ["node", "src/server.mjs"]
