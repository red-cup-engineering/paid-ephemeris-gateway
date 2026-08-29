FROM node:24-slim
WORKDIR /app

# Cloud Build cannot reach the private workstation Verdaccio registry. The deployment
# context therefore carries the exact package-lock-resolved node_modules tree installed
# beside this Dockerfile. .gcloudignore intentionally includes it.
COPY package.json package-lock.json ./
COPY node_modules ./node_modules
COPY catalog-entry.json ./
COPY docs ./docs
COPY src ./src

ENV HOST=0.0.0.0
ENV NODE_ENV=production
CMD ["node", "src/serve.mts"]
