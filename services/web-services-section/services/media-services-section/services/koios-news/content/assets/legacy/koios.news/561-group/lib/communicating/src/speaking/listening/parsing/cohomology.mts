
import type { CohomologyObstruction, CohomologyResult, ParseResult, ParsedAnswer } from "./types.mjs";

export function cohomology(result: ParseResult): CohomologyResult {
  const overdetermined = result.conflicts.map((answer) => obstruction("conflict", answer));
  const underdetermined = result.voids.map((answer) => obstruction("void", answer));
  const obstructions = [...overdetermined, ...underdetermined];
  const glued = overdetermined.length === 0;
  return {
    glued,
    h0: glued ? 1 : 0,
    h1: obstructions.length,
    obstructions,
    overdetermined,
    underdetermined,
  };
}

function obstruction(kind: CohomologyObstruction["kind"], answer: ParsedAnswer): CohomologyObstruction {
  return {
    kind,
    label: answer.question,
    on: answer.on,
    value: answer.value,
  };
}
