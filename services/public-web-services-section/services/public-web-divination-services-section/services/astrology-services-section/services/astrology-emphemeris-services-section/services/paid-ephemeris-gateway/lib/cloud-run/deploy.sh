#!/usr/bin/env bash
set -euo pipefail

script_dir=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)

: "${GOOGLE_CLOUD_PROJECT:?set GOOGLE_CLOUD_PROJECT to the production project}"
: "${X402_PAY_TO:?set X402_PAY_TO to the production Base payout address}"

region=${CLOUD_RUN_REGION:-us-central1}
service=${CLOUD_RUN_SERVICE:-paid-ephemeris-gateway}
repository=${ARTIFACT_REPOSITORY:-ephemeris}
image_tag=${IMAGE_TAG:-$(date -u +%Y%m%dT%H%M%SZ)}
data_bucket=${EPHEMERIS_DATA_BUCKET:-${GOOGLE_CLOUD_PROJECT}-paid-ephemeris-data}
runtime_service_account=${CLOUD_RUN_SERVICE_ACCOUNT:-paid-ephemeris-gateway@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com}
image_uri=${region}-docker.pkg.dev/${GOOGLE_CLOUD_PROJECT}/${repository}/${service}:${image_tag}

for command in gcloud mktemp npm find grep; do
  command -v "$command" >/dev/null || { echo "required command not found: $command" >&2; exit 69; }
done

context_dir=$(mktemp -d /tmp/paid-ephemeris-cloud-build.XXXXXXXX)
cleanup() { rm -rf -- "$context_dir"; }
trap cleanup EXIT
"$script_dir/prepare-context.sh" "$context_dir" >/dev/null

gcloud builds submit "$context_dir" \
  --project "$GOOGLE_CLOUD_PROJECT" \
  --config "$context_dir/cloudbuild.yaml" \
  --substitutions "_IMAGE_URI=$image_uri"

gcloud run deploy "$service" \
  --project "$GOOGLE_CLOUD_PROJECT" \
  --region "$region" \
  --image "$image_uri" \
  --service-account "$runtime_service_account" \
  --execution-environment gen2 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 1 \
  --concurrency 20 \
  --cpu 1 \
  --memory 1Gi \
  --timeout 30s \
  --port 8080 \
  --clear-volumes \
  --add-volume "name=ephemeris-data,type=cloud-storage,bucket=$data_bucket,readonly=false,mount-options=uid=1000;gid=1000" \
  --clear-volume-mounts \
  --add-volume-mount "volume=ephemeris-data,mount-path=/var/lib/ephemeris" \
  --set-env-vars "X402_NETWORK=eip155:8453,X402_FACILITATOR_PROVIDER=cdp,X402_FACILITATOR=https://api.cdp.coinbase.com/platform/v2/x402,X402_PAY_TO=$X402_PAY_TO,X402_SETTLEMENT_ACCOUNT=eip155:8453:$X402_PAY_TO,PAID_EPHEMERIS_DATA_ROOT=/var/lib/ephemeris" \
  --set-secrets "CDP_API_KEY_ID=cdp-api-key-id:latest,CDP_API_KEY_SECRET=cdp-api-key-secret:latest"

service_url=$(gcloud run services describe "$service" --project "$GOOGLE_CLOUD_PROJECT" --region "$region" --format='value(status.url)')
curl --fail --silent --show-error "$service_url/v1/status"
printf '\nservice_url=%s\nimage=%s\n' "$service_url" "$image_uri"
