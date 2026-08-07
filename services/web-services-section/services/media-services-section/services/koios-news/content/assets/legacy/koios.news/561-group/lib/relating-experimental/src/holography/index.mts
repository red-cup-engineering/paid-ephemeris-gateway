/**
 * holography — the projection kernel: how a *type* scopes to a resource.
 *
 * A holographic projector reads a boundary resource (a path + its content) into
 * carried items of some type `T`, and writes them back. A type is DEFINED BY
 * these morphisms (Yoneda), not by a folder or a spec. The codecs specialize
 * this kernel; each supplies its own `T` and its own recognize/read/write.
 *
 * Restriction is done HERE, in code — no `restricting/` directory.
 * `restrict(parent, …)` composes a child whose recognition ENTAILS the
 * parent's (`recognize_child = recognize_parent ∧ local`): a Curry–Howard
 * entailment edge. read/write inherit from the parent unless overridden, so
 * carrier-bearing behavior appears exactly at the node that owns it.
 *
 * Generic over the carried type `T`: this module imports nothing.
 */

/** A boundary resource presented to a projector: its address and its content. */
export interface Resource {
  readonly path: string;
  readonly content: string;
}

/** A holographic projector — a node in the restriction lattice, defined by its
 *  morphisms, carrying items of type `T`. */
export interface Projector<T> {
  /** the type this projector scopes to (e.g. "json", "eavt"). */
  readonly type: string;
  /** the projector this one restricts — null at the root. */
  readonly parent: Projector<T> | null;
  /** derive whether a resource is of this type. Entails the parent's recognition. */
  recognize(resource: Resource): boolean;
  /** read a resource of this type into carried items. Absent where not carrier-bearing. */
  readonly read?: ((resource: Resource) => T[]) | undefined;
  /** write carried items back to this type's content. Absent where not carrier-bearing. */
  readonly write?: ((items: readonly T[]) => string) | undefined;
}

/** The root spec: the most general type, recognized on its own terms. */
export interface RootSpec<T> {
  readonly type: string;
  readonly recognize: (resource: Resource) => boolean;
  readonly read?: ((resource: Resource) => T[]) | undefined;
  readonly write?: ((items: readonly T[]) => string) | undefined;
}

/** A restriction spec: the ADDED constraint and any overridden morphisms. */
export interface RestrictSpec<T> {
  readonly type: string;
  readonly recognize?: ((resource: Resource) => boolean) | undefined;
  readonly read?: ((resource: Resource) => T[]) | undefined;
  readonly write?: ((items: readonly T[]) => string) | undefined;
}

/** Define a root projector (no parent). */
export function define<T>(spec: RootSpec<T>): Projector<T> {
  return { type: spec.type, parent: null, recognize: spec.recognize, read: spec.read, write: spec.write };
}

/** Restrict a parent into a child: recognition is conjoined (child ⊢ parent);
 *  read/write inherit unless overridden. */
export function restrict<T>(parent: Projector<T>, spec: RestrictSpec<T>): Projector<T> {
  const local = spec.recognize;
  return {
    type: spec.type,
    parent,
    recognize: (resource) => parent.recognize(resource) && (local ? local(resource) : true),
    read: spec.read ?? parent.read,
    write: spec.write ?? parent.write,
  };
}

/** The entailment chain of a projector: itself, then everything it restricts, root last. */
export function entails<T>(projector: Projector<T>): Projector<T>[] {
  const chain: Projector<T>[] = [];
  let p: Projector<T> | null = projector;
  while (p) {
    chain.push(p);
    p = p.parent;
  }
  return chain;
}

/** A resource's most specific type: the deepest projector in the catalog that
 *  recognizes it (null if none). */
export function classify<T>(resource: Resource, catalog: readonly Projector<T>[]): Projector<T> | null {
  let best: Projector<T> | null = null;
  let bestDepth = -1;
  for (const projector of catalog) {
    if (!projector.recognize(resource)) continue;
    const depth = entails(projector).length;
    if (depth > bestDepth) {
      best = projector;
      bestDepth = depth;
    }
  }
  return best;
}
