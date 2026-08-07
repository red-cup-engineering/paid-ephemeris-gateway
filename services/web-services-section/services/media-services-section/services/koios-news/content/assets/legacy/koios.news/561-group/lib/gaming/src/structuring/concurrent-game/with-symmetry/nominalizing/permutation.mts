/** Finite permutations of names: the executable fragment of FSym(A). */

export type NominalName = string;
export type NamePair = readonly [from: NominalName, to: NominalName];

export interface FinitePermutation {
  readonly kind: "game.nominal.fsym.permutation";
  readonly mappings: readonly NamePair[];
}

const samePair = (left: NamePair, right: NamePair): boolean =>
  left[0] === right[0] && left[1] === right[1];

function normalize(mappings: readonly NamePair[]): readonly NamePair[] {
  const out: NamePair[] = [];
  const seenFrom = new Set<NominalName>();
  const seenTo = new Set<NominalName>();
  for (const pair of mappings) {
    if (pair[0] === pair[1]) continue;
    if (seenFrom.has(pair[0])) throw new TypeError(`finitePermutation: duplicate source name ${pair[0]}`);
    if (seenTo.has(pair[1])) throw new TypeError(`finitePermutation: duplicate target name ${pair[1]}`);
    seenFrom.add(pair[0]);
    seenTo.add(pair[1]);
    out.push(Object.freeze([pair[0], pair[1]] as const));
  }
  for (const name of seenFrom) {
    if (!seenTo.has(name)) {
      throw new TypeError("finitePermutation: mappings must present a bijection on their finite support");
    }
  }
  for (const name of seenTo) {
    if (!seenFrom.has(name)) {
      throw new TypeError("finitePermutation: mappings must present a bijection on their finite support");
    }
  }
  return Object.freeze(out);
}

/** Build a finite permutation, fixing every name not mentioned by `mappings`. */
export function finitePermutation(mappings: readonly NamePair[] = []): FinitePermutation {
  return Object.freeze({
    kind: "game.nominal.fsym.permutation" as const,
    mappings: normalize(mappings),
  });
}

/** The transposition generator `(a b)` of FSym(A). */
export const transposition = (left: NominalName, right: NominalName): FinitePermutation =>
  left === right ? finitePermutation() : finitePermutation([[left, right], [right, left]]);

/** The finite support moved by a permutation. */
export const permutationSupport = (permutation: FinitePermutation): readonly NominalName[] =>
  Object.freeze([...new Set(permutation.mappings.flatMap((pair) => [pair[0], pair[1]]))].sort());

/** Apply a finite permutation to a name; names outside support are fixed. */
export function applyPermutation(permutation: FinitePermutation, name: NominalName): NominalName {
  return permutation.mappings.find((pair) => pair[0] === name)?.[1] ?? name;
}

/** Whether the permutation fixes every supplied name pointwise. */
export function fixesNames(permutation: FinitePermutation, names: readonly NominalName[]): boolean {
  return names.every((name) => applyPermutation(permutation, name) === name);
}

/** Inverse in FSym(A). */
export const inversePermutation = (permutation: FinitePermutation): FinitePermutation =>
  finitePermutation(permutation.mappings.map((pair) => Object.freeze([pair[1], pair[0]] as const)));

/** Composition `(left . right)(a) = left(right(a))`. */
export function composePermutations(left: FinitePermutation, right: FinitePermutation): FinitePermutation {
  const names = new Set([...permutationSupport(left), ...permutationSupport(right)]);
  const mappings: NamePair[] = [];
  for (const name of names) {
    const image = applyPermutation(left, applyPermutation(right, name));
    if (image !== name) mappings.push(Object.freeze([name, image] as const));
  }
  return finitePermutation(mappings);
}

export const samePermutation = (left: FinitePermutation, right: FinitePermutation): boolean =>
  left.mappings.length === right.mappings.length
  && left.mappings.every((pair) => right.mappings.some((other) => samePair(pair, other)));
