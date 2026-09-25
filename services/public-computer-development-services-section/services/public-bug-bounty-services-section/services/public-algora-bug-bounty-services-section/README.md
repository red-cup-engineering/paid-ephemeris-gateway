# Algora bounties

This is one Node program for working through Algora bounties. It discovers and
ranks public bounties, keeps an evidence journal, can prepare a disposable
repository workspace, applies a caller-supplied patch, runs a caller-supplied
test command, compares the result with the baseline, and accepts an explicit
remote-execution adapter. It never claims a bounty or posts a comment.

`src/` is organized by ordinary responsibilities, not pseudo-services:

- `bounty.mjs` holds the `Bounty` and `Attempt` data classes plus Algora comment parsing.
- `github.mjs` fetches and normalizes GitHub issues and comments.
- `selection.mjs` makes the deliberately simple, explainable ranking.
- `repository.mjs`, `validation.mjs`, and `solve.mjs` are the patch-work path; a
  caller supplies the patch author, so model credentials and policy stay outside.
- `github-actions.mjs` dispatches a caller-selected existing Actions workflow.
- `outcomes.mjs` records content-addressed outcomes and finds repeated patterns.
- `algora.mjs` composes those functions for callers; it has no hidden loop.

`scripts/` contains only command-line entry points.

```sh
# List current bounties as JSON. GH_TOKEN raises GitHub's rate limit.
GH_TOKEN=... npm run list -- --limit 20

# List the same bounties in priority order.
GH_TOKEN=... npm run plan -- --minimum-reward 25

# Review repeated wins, losses, or failures in a local JSONL outcome journal.
npm run history -- .algora

npm run check
```
