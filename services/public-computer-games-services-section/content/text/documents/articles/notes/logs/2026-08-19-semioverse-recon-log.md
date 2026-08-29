---
title: Semioverse Recon Log
description: One correction and one spot-check made to the semiotic-exchange-chain and ActivityPub sections while surveying the Semioverse.
date: 2026-08-19
keywords: ["semioverse", "activitypub", "recon"]
---

# Semioverse Recon Log

See [the Semioverse architecture note](../2026-08-19-note-on-semioverse-architecture.md)
for the current state.

`semiotic-exchange-chain-services-section/README.md` claimed all tests in the section
failed with `ERR_MODULE_NOT_FOUND` from a missing `npm install`. That was wrong: rerunning
`npm test` in each of the three packages gave `semiotic-exchange-chain-services-section`
6/6 pass, `sovereign-membrane-admission-service` 6/6 pass, and `modeled-union-dimension`
18/19 pass — the one failure is a genuinely unwritten dependency
(`@red-cup-engineering/typed-resource-catalog/temporal-failure-normalization`), not a
setup problem. The README now states the true counts and attributes the one real failure
correctly. A spot-check of `@red-cup-engineering/activitypub-services-section` also
passed clean, 39/39.

The 2026-08-16 Molt Ledger, found while cross-checking outside this recon's assigned
sections, rates the ActivityPub service mid-flight and names the same live-deploy blocker
this recon closed — the closest thing to ground truth this tree held before the deploy
landed.
