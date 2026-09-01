# Minimal Cloud Run deploy image for stoke-service.
# No npm install at build time: node_modules is already vendored on disk
# (the @lenticule-science/metrologic and @red-cup-engineering/cartridge runtime dependencies resolve only from
# a local-only Verdaccio registry that Cloud Build cannot reach), so this just copies the tree
# as-is and runs the existing zero-dependency server, which already reads PORT from the
# environment. HOST is set explicitly even though this server's own listen() call takes no host
# argument (so it already binds broadly by Node's own default) — house convention documents this
# as ENV HOST=0.0.0.0 on every service's Dockerfile, since it is the one line that prevents the
# storefront's own "deploys, then only reachable from inside the container" bug class the moment
# any server.mjs here is ever changed to read process.env.HOST explicitly (as parlor-service's
# already does).
FROM node:24-slim
WORKDIR /app
COPY . .
ENV NODE_ENV=production
ENV HOST=0.0.0.0
CMD ["node", "web/server.mjs"]
