# @lenticule-science/metrologic/spectral

**The spectral morphisms of a substitution — re-derived over our own numbers, no roots ever computed.**

Where a substitution's characteristic roots sit relative to the unit circle is not a foreign stability question — it is the **inversion duality `z ↦ 1/z`**, the spectral face of the Anderson–Putnam colimit's `×M`-invertibility (so `M⁻¹` acts, and `char-poly(M⁻¹)` is the reciprocal polynomial) and of Verdier's transpose dual.
The unit circle is that duality's **self-dual fixed locus** — the spectral analog of the Klein gauge's fixed set `{⊤, ⊥}`.
Everything here is exact over `@lenticule-science/metrologic/number` (ℤ and ℚ); no root is ever computed numerically.

```js
import { inversion, location } from "@lenticule-science/metrologic/spectral";

const fib = inversion.fromInts([-1, -1, 1]);  // λ² − λ − 1 (Fibonacci)
inversion.reciprocal(fib);            // p* = reversed coefficients (z ↦ 1/z), an involution
inversion.inversionSymmetric(fib);    // → false: no reciprocal pair, none on the circle
location.rootLocation(fib);           // → { expanding: 1, contracting: 1, neutral: 0, degenerate: false }
location.isPisot(fib);                // → true (one root outside, all conjugates strictly inside)
```

## API

### `inversion` — the duality `z ↦ 1/z` and the self-dual locus - `reciprocal` (p ↦ p*, reversed coefficients), `isSelfReciprocal` - `resultant` (Sylvester determinant, pure ℤ), `sharesRoot`, `inversionSymmetric` (res(p, p*) = 0) - `fromInts`, `toInts`, `degree`, `equal`

### `location` — root-location via the Cayley map + an owned Routh/Sturm count - `mobius` (the Cayley map to the half-plane) - `rightHalfPlaneRoots` (the Routh array as the even/odd Sturm sequence; sign changes = Cauchy index, over ℚ) - `rootLocation` (expanding / contracting / neutral counts — exact in the non-degenerate case) - `isPisot` (one expanding root, none neutral)

The direct unit-circle descent (Schur–Cohn/Jury) degenerates for a monic det-±1 characteristic polynomial (every unimodular substitution), so root-location goes through the half-plane instead, which handles that case cleanly.
Pisot / Salem / cyclotomic / Mahler are readings of where the roots sit; the exact split of the degenerate (on-circle) case is still to be derived.

## Testing

```sh
node --test
```

Property/law tests over named substitutions and controls (`test/`).
Migrated out of `math/playground/src/spectral/` onto the stable `@lenticule-science/metrologic/number`.

## License

Follows the repository.
