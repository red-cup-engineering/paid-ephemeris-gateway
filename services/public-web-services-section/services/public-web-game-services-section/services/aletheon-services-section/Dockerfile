# Aletheon — Cloud Run image. Same minimal pattern as this estate's other services (see
# deploy-runbook-2026-08-19.md): FROM node:24-slim, COPY the tree as-is (this ships the already-
# Verdaccio-resolved node_modules, sidestepping Cloud Build's lack of access to the local
# registry — no `npm install`/`npm ci` at build time), ENV HOST=0.0.0.0 (the one line every prior
# deploy in this estate needed; the app itself already reads PORT from Cloud Run's injected env).
#
# UNLIKE Farstone's sole dependency (a live filesystem symlink into a sibling package that had to
# be vendored to survive the build context), Aletheon's three dependencies
# (@561-group/{computer,math,qwzspace}) are already REAL, non-symlinked directories under
# node_modules/@561-group/ (verified with `readlink -f` before writing this file) — so a plain
# `COPY . .` packages them correctly with no vendoring step. `.gitignore` here also carries no
# unanchored `node_modules/` rule (Farstone's build-context gotcha), so nothing under
# node_modules is at risk of being silently dropped by the upload ignore-list either.
FROM node:24-slim

WORKDIR /app
COPY . .

ENV HOST=0.0.0.0
# PORT is injected by Cloud Run at container start; scripts/aletheon-server.mjs already reads
# process.env.PORT (falling back to the 561:serve block's port, then 8787) — no source edit needed.

CMD ["node", "scripts/aletheon-server.mjs"]
