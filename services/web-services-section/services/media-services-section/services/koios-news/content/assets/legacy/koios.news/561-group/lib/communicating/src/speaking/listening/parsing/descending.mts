


import type { Entry, SpecializationEdge, DescentResult, Charge } from "./types.mjs";
import { bottom, joinKnowledge, valueOf } from "@emsenn/relating-experimental";


const uk = (s: string, p: string): string => `${s}\x00${p}`;
const bk = (h: string, r: string, d: string): string => `${h}\x00${r}\x00${d}`;

/** Transitively close a set of specialization edges. */
function closeSpecialization(edges: readonly SpecializationEdge[]): SpecializationEdge[] {
  const result: SpecializationEdge[] = [...edges];
  let changed = true;
  while (changed) {
    changed = false;
    const len = result.length;
    for (let i = 0; i < len; i++) {
      for (let j = 0; j < len; j++) {
        const a = result[i];
        const b = result[j];
        if (!a || !b) continue;
        if (a.target === b.source && !result.some((e) => e.source === a.source && e.target === b.target)) {
          result.push({ source: a.source, target: b.target });
          changed = true;
        }
      }
    }
  }
  return result;
}

/** Settle charges along specialization edges to a least fixed point.
 *
 * Algorithm:
 *  1. Load all entries into unary and binary charge maps.
 *  2. Project binary arcs to unary "has-<rel>" / "is-<rel>" predicates.
 *  3. Transitively close the specialization edges.
 *  4. Iterate: for each (source→target) edge and each subject, join
 *     charge[subject,source] into charge[subject,target] until stable.
 */
export function descend(
  entries: readonly Entry[],
  specialization: readonly SpecializationEdge[] = [],
): DescentResult {
  const unary = new Map<string, Charge>();
  const binary = new Map<string, Charge>();

  const join = (map: Map<string, Charge>, key: string, charge: Charge): void => {
    const prior = map.get(key);
    map.set(key, prior ? joinKnowledge(prior, charge) : charge);
  };

  for (const e of entries) {
    if (e.object === undefined) {
      join(unary, uk(e.subject, e.predicate), e.charge);
    } else {
      join(binary, bk(e.subject, e.predicate, e.object), e.charge);
      join(unary, uk(e.subject, `has-${e.predicate}`), e.charge);
      join(unary, uk(e.object, `is-${e.predicate}`), e.charge);
    }
  }

  const closed = closeSpecialization(specialization);

  const subjects = new Set<string>();
  for (const k of unary.keys()) {
    subjects.add(k.slice(0, k.indexOf("\x00")));
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const { source, target } of closed) {
      for (const subject of subjects) {
        const from = unary.get(uk(subject, source));
        if (!from) continue;
        const toKey = uk(subject, target);
        const prev = unary.get(toKey);
        const joined = prev ? joinKnowledge(prev, from) : from;
        if (!prev || valueOf(joined).name !== valueOf(prev).name) {
          unary.set(toKey, joined);
          changed = true;
        }
      }
    }
  }

  return {
    settledCharge: (subject, predicate) => unary.get(uk(subject, predicate)) ?? bottom,
    settledArc: (head, rel, dep) => binary.get(bk(head, rel, dep)) ?? bottom,
  };
}
