# Minimal Cloud Run deploy image for play.561.group's storefront.
# No npm install at build time: node_modules is already vendored on disk
# (the @red-cup-engineering/cartridge devDependency resolves only from a local-only
# Verdaccio registry that Cloud Build cannot reach), so this just copies
# the tree as-is and runs the existing zero-dependency server.
FROM node:24-slim
WORKDIR /app
COPY . .
ENV NODE_ENV=production
# serve.mjs defaults HOST to 127.0.0.1 (loopback), which is unreachable
# from outside the container on Cloud Run; override without touching source.
ENV HOST=0.0.0.0
CMD ["node", "serve.mjs"]
