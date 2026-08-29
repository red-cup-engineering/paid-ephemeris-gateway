# Minimal Cloud Run deploy image for be-not-so-fearful-service.
# No npm install at build time: node_modules is already vendored on disk (both
# @red-cup-engineering/abrash and @red-cup-engineering/cartridge resolve only from a local-only
# Verdaccio registry that Cloud Build cannot reach), so this just copies the tree as-is and runs the
# existing zero-runtime-dependency server, which already reads PORT (and HOST) from the environment
# per the deploy runbook's PORT/HOST convention.
FROM node:24-slim
WORKDIR /app
COPY . .
ENV NODE_ENV=production
ENV HOST=0.0.0.0
CMD ["node", "src/server.mjs"]
