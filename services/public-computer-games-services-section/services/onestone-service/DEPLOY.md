# Deploying onestone.561.group to Google Cloud Run

Cloud Run runs the Dockerfile in this directory, scales to zero when idle (free at this
traffic under the always-free tier), and maps the custom domain. One command deploys from
source — Cloud Build sees the Dockerfile and does the rest.

## One-time setup

```sh
gcloud auth login
gcloud projects create onestone-561 --set-as-default   # or use an existing project
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
```

Billing must be enabled on the project (stays $0 at hobby traffic; set a budget alert).

## Deploy

From this directory:

```sh
gcloud run deploy onestone \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 1 \
  --memory 256Mi \
  --session-affinity
```

- `--max-instances 1` is required for correctness, not just cost: game state lives in one
  process (tmpfs save file). Do not raise it until the roadmap's durable-store work lands.
- `--session-affinity` keeps a player's SSE stream and inputs on the same instance.
- Redeploys and scale-to-zero wipe state (players, purchases). That is acceptable for the
  free/ephemeral phase; it must be fixed (GCS/Firestore-backed save + ledger) before real
  payment credentials are configured. The mock provider is the default and clears nothing
  real, so an ephemeral wipe never destroys money — only progress.

## Custom domain

```sh
gcloud beta run domain-mappings create --service onestone --domain onestone.561.group --region us-central1
```

Then add the DNS record it prints — for a subdomain this is:

```
onestone.561.group.  CNAME  ghs.googlehosted.com.
```

TLS is provisioned automatically (allow ~15 minutes after DNS propagates).

## Real payments (later — read this first)

Do NOT set `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `HIVE_ACCOUNT` until:
1. durable state exists (see above), and
2. the 561-group payment-identity decision is made (shared Stripe account with per-game
   SKUs vs a separate product — see ROADMAP.md). When ready, pass them as secrets:

```sh
gcloud run services update onestone --set-secrets STRIPE_SECRET_KEY=onestone-stripe-key:latest,...
```

The Stripe webhook endpoint is `https://onestone.561.group/webhook/stripe`.
