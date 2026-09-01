import { orthogonal } from "./playing.mjs";

export function castTroupe(candidates, disciplines) {
  const admitted = [];
  const refused = [];
  for (const candidate of candidates) {
    const mastered = disciplines.filter((discipline) => discipline.generators.some((generator) => candidate.designs.some((design) => orthogonal(design, generator))));
    if (mastered.length > 0) admitted.push(Object.freeze({ candidate: candidate.id, disciplines: Object.freeze(mastered.map(({ id }) => id)) }));
    else refused.push(Object.freeze({ candidate: candidate.id, reason: "no practiced orthogonal discipline" }));
  }
  return Object.freeze({ kind: "feltos.troupe-cast.v1", admitted: Object.freeze(admitted), refused: Object.freeze(refused) });
}
