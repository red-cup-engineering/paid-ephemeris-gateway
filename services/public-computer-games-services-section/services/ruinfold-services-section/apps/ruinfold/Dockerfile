# Minimal Cloud Run deploy image for ruinfold (the daily server, src/server.mts).
# One dependency, @red-cup-engineering/footing (the daily-tournament plumbing this app's own
# server/* modules used to duplicate with apps/durante, now extracted) -- already vendored on
# disk from the local-only Verdaccio registry Cloud Build can't reach, same as every other
# 561.group game service's own @red-cup-engineering/* deps. Pure .mts run directly by Node's
# native TypeScript type-stripping (node:24 supports this without a build step), so this just
# copies the tree as-is (node_modules included) and runs the server — same minimal pattern as
# the other 561.group game services' Dockerfiles (crucible, solitaire, gambling-trainer,
# durante): FROM node:24-slim, COPY . ., no npm install at build time, CMD the entrypoint.
# server.mts already reads PORT from the environment (see resolvePort() in src/server.mts) and
# binds "0.0.0.0" by default, so no HOST override is needed here (unlike the storefront's
# Dockerfile).
#
# Persistence: RUINFOLD_BUCKET is set at deploy time (gcloud run deploy --set-env-vars), which
# routes src/server/store-factory.mts to the GCS bucket-store (src/server/bucket-store.mts) —
# ambient service-account credentials via the metadata server, no key file, no credential env
# var. Unset (e.g. local `node --experimental-strip-types src/server.mts`), it falls back to the
# local JSONL file-store under apps/ruinfold/data/, exactly as before this deploy.
FROM node:24-slim
WORKDIR /app
COPY . .
ENV NODE_ENV=production
CMD ["node", "src/server.mts"]
