# Cloud Run carrier

This carrier restores the proven deployment shape while using the
current registry-packaged service boundary. `prepare-context.sh` performs the
private-registry install locally and sends the resulting exact JavaScript
closure to Cloud Build; private registry credentials and URLs never enter the
container image.

The preparation step refuses dependency links, missing lockfiles, and native
host modules. The image independently builds pinned OxiEphemeris 0.1.1 and
verifies the official DE440 SHA-256 before admitting it.

Required deployment bindings:

- `GOOGLE_CLOUD_PROJECT`
- `X402_PAY_TO`
- Artifact Registry repository `ephemeris` (or `ARTIFACT_REPOSITORY`)
- Cloud Storage bucket `${GOOGLE_CLOUD_PROJECT}-paid-ephemeris-data` (or
  `EPHEMERIS_DATA_BUCKET`)
- runtime service account with write access to that bucket
- Secret Manager secrets `cdp-api-key-id` and `cdp-api-key-secret`

Run `./ops/cloud-run/deploy.sh` only after the registry-only clean-install gate
has generated and verified `package-lock.json`.
