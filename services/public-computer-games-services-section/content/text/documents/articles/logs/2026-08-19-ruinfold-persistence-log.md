# Ruinfold persistence — 2026-08-19

Decision: persist game state in object storage (buckets) behind ruinfold's existing
`store.mts` interface, as append-only JSONL objects, day-keyed. Cloud Run services use
GCS with ambient service-account credentials from the metadata server (no keys shipped).
R2 stays the named second region for later use.

Landed the same day: live at https://ruinfold.561.group/, bucket
`gs://five-six-one-ruinfold-daily`, deployed on Cloud Run (`ruinfold`, `us-central1`,
`min-instances 0`).

Verified with a real HTTP run: a daily run was submitted through the live API, appeared
on the live leaderboard, survived a forced instance churn (a fresh Cloud Run revision
serving 100% of traffic, no shared memory with the instance that took the submission),
and the one-scored-run-per-day lock still rejected a second attempt afterward, because
the lock lives in the bucket (a GCS conditional-create) rather than in any one instance.

Two bugs were caught and fixed along the way: `server.mts` was not yet wired to the
bucket backend, and the bucket object-name prefix was leaking the container's local
filesystem path. Regression tests for both live in the ruinfold service's test suite.
