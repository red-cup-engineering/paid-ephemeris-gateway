/**
 * `@emsenn/computing/cartesianizing` — the Kleisli sub-CCC $\mathcal{K}\ell(!)$ where
 * typed programs live.
 *
 * By the Girard decomposition, the Kleisli category of the linear-exponential
 * comonad $!$ on the $*$-autonomous $\mathbf{CGS}$ is Cartesian closed — a model
 * of typed $\lambda$-calculus. This module carries that structure:
 *
 *   - `product`     — the additive conjunction $A \mathbin{\&} B$ as the CCC
 *     product, the terminal object, and the two projections.
 *   - `exponential` — the exponential object $A \Rightarrow B = {!}A \multimap B$
 *     and the Girard-closure witness.
 *   - `fixedPoints` — recursive types as $\mu$/$\nu$ fixed points of endofunctors:
 *     bounded-unrolling approximants of the initial algebra / final coalgebra,
 *     with Lambek's lemma machine-checked at a small stage and the $\omega$-colimit
 *     named (same discipline as `bang`).
 *
 * The comonad $!$ itself lives in `@emsenn/computing/categorifying` (`exponential`).
 */
export * from "./product.mjs";
export * from "./exponential.mjs";
export * from "./fixedPoints.mjs";
