# flickering — roadmap

## Shipped (v0.0.1)

- The full loop: click → idle cascade → arm the delver → standing orders → single-button full autonomy → rekindle, with the interface collapsing as you automate and a Lisp strategy editor as the endgame surface.
- Deterministic shared procedural cave; Coyote/Crow trickster floors.
- World-as-state on the FizzOS kernel; event-sourced save/restore; guest→account federation.
- Double-entry audit ledger with real Stripe + Hive adapters (mock fallback) and `GET /audit`.
- 54 tests; a balance sim that reaches full autonomy and a active prestige loop.

## Next

- **Wire live payments.** Set `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` and `HIVE_ACCOUNT`; add a real Stripe Elements confirm step to the client (currently the intent is created and the webhook clears it server-side).
- **Bigger numbers.** Swap `economy`'s `number` for a break_infinity-style decimal when the late game pushes past ~1e308; the formatter and cost curves are already isolated.
- **Leaderboard.** `fameDepth` is already a persistent, server-authoritative cell — surface a read-only board (deepest delvers) and per-seed weekly caves.
- **Richer strategy surface.** Expose more cells/verbs to the editor (e.g. `buy <gen>` targets, spend ratios) so the endgame program is more expressive; add a strategy validate/preview call wired to `strategy.validateStrategy`.
- **More content.** Deeper biomes, boss floors (μ-quest style), and trickster events that reshape a run (Coyote's wager as a real gamble UI).
- **Multi-shard federation.** Today migration is guest→account on one shard; lift to true multi-shard via `@red-cup-engineering/fizzos/federation` so caves can scale horizontally.

## Known edges

- Account authentication failures are explicit `401` JSON responses from the native transport.
- The quote shorthand `'x` in the strategy editor needs the FizzOS Lisp reader fix (already in `services/fizzos/src/lisp.mts`) to be built; until then use `(quote x)`.
  Composed strategies already use the explicit form.
