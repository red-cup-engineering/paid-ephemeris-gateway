# Minimal Cloud Run deploy image for education-platform-service (Equivo, theme #1).
# No npm install at build time: node_modules is already vendored on disk
# (the @lenticule-science/metrologic runtime dependency resolves only from a local-only
# Verdaccio registry that Cloud Build cannot reach), and web/ is already fully
# self-contained (npm run build:web already ran, compiling world JSON and
# vendoring browser-side checker/theme modules into web/js/vendor) -- so this
# just copies the tree as-is and runs the existing zero-dependency server.
# HOST is forced to 0.0.0.0 -- the server's own default (127.0.0.1) is
# unreachable from outside the container, the same fix the storefront needed
# per the deploy runbook's PORT/HOST convention.
FROM node:24-slim
WORKDIR /app
COPY . .
ENV NODE_ENV=production
ENV HOST=0.0.0.0
CMD ["node", "web/server.mjs"]
