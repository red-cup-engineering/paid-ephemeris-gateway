# Minimal Cloud Run deploy image for you-are-conscious-service.
# No npm install at build time: node_modules is already vendored on disk
# (the @red-cup-engineering/cartridge and @lenticule-science/metrologic runtime dependencies resolve only from a
# local-only Verdaccio registry that Cloud Build cannot reach), so this just copies the tree as-is
# and runs the existing zero-dependency server, which already reads PORT from the environment.
# Same pattern as this fleet's other games (see gambling-trainer-service/Dockerfile).
FROM node:24-slim
WORKDIR /app
COPY . .
ENV NODE_ENV=production
CMD ["node", "web/server.mjs"]
