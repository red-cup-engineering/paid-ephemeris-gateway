/**
 * freedoms — Graeber & Wengrow's THREE PRIMORDIAL FREEDOMS (The Dawn of Everything, 2021), the
 * marginal anthropology-of-freedom lens that supplies the package's normative spine (frontier register §2).
 *
 * Freedom, on their account, is not abstract but three concrete capacities: the freedom to LEAVE, the
 * freedom to DISOBEY, and the freedom to REORGANIZE the terms of association. Each is already a primitive
 * in the package — `secede` (leave), `refuse` (disobey), constitutional self-amendment (reorganize). This
 * module makes the COMPLETENESS reading explicit: a polity is free iff all three remain callable. And it
 * states californication precisely against that bar — the regime that keeps all three STRUCTURALLY
 * callable while the affective register forecloses the desire to call them, so the polity reads as free
 * by every structural test and is nonetheless unfree.
 *
 * A pure reading over three boolean capacities (computed by the caller from `secede`/`foreclosureWatch`,
 * `refuse`-admissibility, and the presence of constitutional-level acts) plus the affective
 * `recuperated` flag (from `affectiveRecuperationIndex`).
 */

/** The three-freedoms reading of a polity. */
export interface ThreeFreedoms {
  readonly kind: "socializing.three-freedoms";
  /** the freedom to LEAVE — secession is admissible (a bloc can withdraw into its own field). */
  readonly canLeave: boolean;
  /** the freedom to DISOBEY — refusal is admissible (the exit is not structurally foreclosed). */
  readonly canDisobey: boolean;
  /** the freedom to REORGANIZE — constitutional self-amendment of the terms of association is available. */
  readonly canReorganize: boolean;
  /** STRUCTURALLY free: all three capacities remain callable (the completeness reading). */
  readonly free: boolean;
  /** CALIFORNICATED: structurally free yet the affective register has foreclosed the desire to use the
   *  freedoms (the humane unfreedom — free by every structural test, unfree in fact). */
  readonly californicated: boolean;
  /** the verdict: `free`, `californicated` (structurally free but affectively foreclosed), or `unfree`. */
  readonly verdict: "free" | "californicated" | "unfree";
}

/**
 * threeFreedoms — read a polity's freedom as the conjunction of the three primordial freedoms (leave,
 * disobey, reorganize), and cross-check against the affective register: a structurally-free polity whose
 * contestation is being recuperated (the `recuperated` flag, from `affectiveRecuperationIndex`) is
 * californicated, not free. This is the normative spine the californication argument leans on: free ⟺
 * all three callable AND the desire to use them not foreclosed.
 */
export function threeFreedoms(input: {
  readonly canLeave: boolean;
  readonly canDisobey: boolean;
  readonly canReorganize: boolean;
  readonly recuperated?: boolean;
}): ThreeFreedoms {
  const free = input.canLeave && input.canDisobey && input.canReorganize;
  const californicated = free && (input.recuperated ?? false);
  return Object.freeze({
    kind: "socializing.three-freedoms" as const,
    canLeave: input.canLeave,
    canDisobey: input.canDisobey,
    canReorganize: input.canReorganize,
    free,
    californicated,
    verdict: !free ? "unfree" : californicated ? "californicated" : "free",
  });
}
