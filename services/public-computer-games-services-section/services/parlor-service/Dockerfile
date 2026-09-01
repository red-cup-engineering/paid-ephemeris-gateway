# Minimal Cloud Run deploy image for parlor-service.
# No npm install at build time: node_modules is already vendored on disk
# (the @red-cup-engineering/parlor-kernel and @red-cup-engineering/cartridge runtime dependencies
# resolve only from a local-only Verdaccio registry that Cloud Build cannot reach), so this just
# copies the tree as-is and runs the existing zero-dependency server, which already reads PORT
# from the environment.
#
# ENV HOST=0.0.0.0 is not cosmetic here: web/server.mjs reads `process.env.HOST ?? '127.0.0.1'`
# explicitly (the exact storefront bug class documented in the deploy runbook's PORT/HOST
# convention section) — without this line the container binds only to loopback and Cloud Run's
# health check/traffic can never reach it. Deploys, then never becomes healthy, silently.
FROM node:24-slim
WORKDIR /app
COPY . .
ENV NODE_ENV=production
ENV HOST=0.0.0.0
CMD ["node", "web/server.mjs"]
