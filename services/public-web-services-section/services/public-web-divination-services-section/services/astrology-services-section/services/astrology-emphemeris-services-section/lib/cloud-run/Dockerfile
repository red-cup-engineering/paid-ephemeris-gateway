# syntax=docker/dockerfile:1.7
FROM rust:1.91.1-bookworm AS oxieph-builder

RUN cargo install --locked oxiephemeris-cli --version 0.1.1

FROM node:22.18-bookworm-slim AS runtime

ARG DE440_URL=https://ssd.jpl.nasa.gov/ftp/eph/planets/Linux/de440/linux_p1550p2650.440
ARG DE440_SHA256=29915576d0a6555766b99485ac3056ee415e86df4fce282611c31afb329ad062

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /opt/ephemeris \
    && curl --fail --location --retry 3 "$DE440_URL" --output /opt/ephemeris/de440.440 \
    && echo "$DE440_SHA256  /opt/ephemeris/de440.440" | sha256sum --check --strict \
    && chmod 0444 /opt/ephemeris/de440.440

COPY --from=oxieph-builder /usr/local/cargo/bin/oxieph /usr/local/bin/oxieph
COPY --chown=node:node app /app

WORKDIR /app
RUN node --check src/deployment.mjs

ENV NODE_ENV=production \
    PORT=8080 \
    OXIEPH_BIN=/usr/local/bin/oxieph \
    OXIEPH_DE=/opt/ephemeris/de440.440 \
    PAID_EPHEMERIS_DATA_ROOT=/var/lib/ephemeris

USER node
EXPOSE 8080
CMD ["node", "src/deployment.mjs"]
