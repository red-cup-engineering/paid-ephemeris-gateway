#!/usr/bin/env node
/**
 * @skill listing-open-obligations
 * @verb-phrase listing open obligations
 * @closure-kind process
 * @description Thin re-export of the published owner @561-group/listing-open-obligations: listOpenObligations, officeSeats, and the identical CLI. Kept as a same-directory file so this skill's sibling scripts keep resolving it with a relative import, and so `node list-open-obligations.js` still works from here — the obligations-query law itself lives once, at the owning package, never copied.
 *
 * @postcondition every export and the CLI behavior are exactly the owning package's — this file adds no logic of its own
 * @postcondition office resolution uses the owning package's current NEAREST strategy, not the superseded GLOBAL strategy some vendored copies carried — the GLOBAL strategy is refused by @561-group/resolving-an-identifier since the ownership.json membrane hardening (2026-07-17)
 */
export * from "@561-group/listing-open-obligations";
import { main } from "@561-group/listing-open-obligations";

if (import.meta.url === `file://${process.argv[1]}`) main();
