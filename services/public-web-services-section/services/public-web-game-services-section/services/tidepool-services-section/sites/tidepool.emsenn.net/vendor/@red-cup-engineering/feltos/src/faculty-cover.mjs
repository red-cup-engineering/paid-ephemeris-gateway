import { fourName, fourNamed, joinKnowledge } from "./four.mjs";

export function facultySection(faculty, cells) {
  return Object.freeze({ kind: "feltos.faculty-section.v1", faculty, cells: Object.freeze({ ...cells }) });
}

/** Glue face sections only where coincident cells agree in the truth order. */
export function glueFacultyCover(sections) {
  const cells = {};
  const contradictions = [];
  for (const section of sections) {
    for (const [key, charge] of Object.entries(section.cells)) {
      if (cells[key] === undefined) cells[key] = charge;
      else {
        const joined = fourName(joinKnowledge(fourNamed(cells[key]), fourNamed(charge)));
        cells[key] = joined;
        if (joined === "both") contradictions.push(Object.freeze({ cell: key, faculties: Object.freeze(sections.filter(({ cells }) => key in cells).map(({ faculty }) => faculty)) }));
      }
    }
  }
  return Object.freeze({ kind: "feltos.faculty-cover.v1", glued: contradictions.length === 0, cells: Object.freeze(cells), contradictions: Object.freeze(contradictions) });
}
