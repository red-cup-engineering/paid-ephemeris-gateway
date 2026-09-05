# onestone — zero-dependency Node service, so the image is just the runtime + sources.
# Node >= 24 is required (native TypeScript type-stripping runs the .mts files directly).
FROM node:24-alpine

WORKDIR /app
COPY package.json tsconfig.json ./
COPY src ./src

# Cloud Run injects PORT; the server prefers ONESTONE_PORT then PORT. Bind all interfaces
# (the 127.0.0.1 default is for local dev), and keep game state on the instance's tmpfs —
# it is ephemeral by design until the roadmap's durable-store work (see DEPLOY.md).
ENV HOST=0.0.0.0 \
    ONESTONE_SAVE=/tmp/onestone-save.json \
    ONESTONE_LEDGER=/tmp/onestone-ledger.journal

USER node
CMD ["node", "src/server.mts"]
