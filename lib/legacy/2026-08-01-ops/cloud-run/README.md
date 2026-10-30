# Cloud Run carrier

This carrier is prepared for a scale-to-zero Cloud Run service in
`us-central1`, where the request CPU and memory allowance can fit both Node and
the pinned DE440 calculation. It deliberately limits the service to one
instance while the WitnessJournal plate is a Cloud Storage FUSE mount; Cloud Storage FUSE
does not supply concurrent-write locking or full POSIX semantics.

The image build downloads the official 102,272,352-byte DE440 classic binary
from JPL and refuses a checksum mismatch. It compiles OxiEphemeris 0.1.1 from
the locked crates.io release. The slim build context contains only the explicit
provider settlements hired by this service.

`deploy.sh` assumes these resources already exist:

- a billing-enabled Google Cloud project with Cloud Build, Artifact Registry,
  Cloud Run, Cloud Storage, and Secret Manager APIs enabled;
- the named Artifact Registry repository and a Cloud Storage bucket with
  hierarchical namespace enabled;
- a dedicated Cloud Run service account with Artifact Registry read,
  Secret Manager access, and `roles/storage.objectUser` on the data bucket;
- Secret Manager secrets `cdp-api-key-id`, `cdp-api-key-secret`,
  `witness-journal-agent-signing-key`, and matching public `witness-journal-agent-jwks`.

The script does not create IAM, billing, secrets, or payout identities because
those acts require the account owner's authority. It builds, deploys, mounts
the durable plate, and verifies `/v1/status` after those prerequisites exist.

Run from any directory:

```bash
GOOGLE_CLOUD_PROJECT=your-project \
X402_PAY_TO=0xYourBaseMainnetPayoutAddress \
./ops/cloud-run/deploy.sh
```

After deployment, map `ephemeris.561.group` to the returned service URL using a
Cloud Run domain mapping and the DNS records Google supplies. Keep Cloud Run's
generated URL enabled because Bazaar discovery records the exact paid resource
URL that settles first.
