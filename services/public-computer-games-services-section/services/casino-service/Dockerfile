# Minimal Cloud Run deploy image for casino-service.
# No npm install at build time: node_modules is already vendored on disk (the
# @red-cup-engineering/energy-bank and @red-cup-engineering/cartridge runtime dependencies
# resolve only from a local-only Verdaccio registry that Cloud Build cannot reach), so this just
# copies the tree as-is and runs the existing server, which already reads PORT from the
# environment — see parlor-service's own Dockerfile for the exact precedent this one follows.
#
# ENV HOST=0.0.0.0 is not cosmetic here: src/server.mts reads `process.env.HOST ?? '127.0.0.1'`
# explicitly. Without this line the container binds only to loopback and Cloud Run's health
# check/traffic can never reach it — deploys, then never becomes healthy, silently.
#
# CASINO_SNAPSHOT is left unset here deliberately: Cloud Run's container filesystem is
# ephemeral between deploys/restarts anyway, so a snapshot path only makes sense once this
# service is wired to a mounted volume or GCS (see src/persistence.mts's header for that seam).
# Until then this service runs max-instances 1, in-process, in-memory — the house pattern for a
# single-instance economy — and simply starts fresh on every cold start.
FROM node:24-slim
WORKDIR /app
COPY . .
ENV NODE_ENV=production
ENV HOST=0.0.0.0
CMD ["node", "src/server.mts"]
