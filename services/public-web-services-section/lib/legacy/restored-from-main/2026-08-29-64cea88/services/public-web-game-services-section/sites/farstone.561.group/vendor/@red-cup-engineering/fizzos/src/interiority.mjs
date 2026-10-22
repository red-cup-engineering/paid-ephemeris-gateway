import { createHash } from "node:crypto";
import { declareFunctional, perceive, settleSubject, tell, value } from "./world.mjs";

export const FACULTIES = Object.freeze(["logic", "empathy", "perception", "shivers", "volition", "half-light"]);
export const FACULTY_MAX = 10;
const predicate = (faculty) => `faculty:${faculty}`;

function sample(seed, actor, faculty) {
  return createHash("sha256").update(`${seed}\u0000${actor}\u0000${faculty}`).digest()[0] % 6 + 1;
}

export function dealCabinet(world, actor, seed = "fizzos") {
  const claims = FACULTIES.map((faculty) => ({ subject: actor, predicate: predicate(faculty), object: sample(seed, actor, faculty) }));
  return tell(declareFunctional(world, claims.map(({ predicate }) => predicate)), claims, { source: "fizzos.interiority" });
}

export function facultyLevel(world, actor, faculty) {
  return Number(value(world, actor, predicate(faculty)) ?? 0);
}

export function practiceFaculty(world, actor, faculty, amount = 1) {
  const level = Math.min(FACULTY_MAX, facultyLevel(world, actor, faculty) + amount);
  return tell(declareFunctional(world, [predicate(faculty)]), { subject: actor, predicate: predicate(faculty), object: level }, { source: "fizzos.interiority.practice" });
}

/** The observer's faculty is an enacted cut: keener observers receive a larger section. */
export function regard(world, observer, target, faculty = "perception") {
  const visible = perceive(world, observer).subjects.includes(target);
  if (!visible) return Object.freeze({ observer, target, faculty, level: facultyLevel(world, observer, faculty), cells: Object.freeze([]) });
  const level = facultyLevel(world, observer, faculty);
  const cells = settleSubject(world, target);
  const count = Math.min(cells.length, Math.max(1, level));
  return Object.freeze({ observer, target, faculty, level, cells: Object.freeze(cells.slice(0, count)) });
}

export function cabinet(world, actor) {
  return Object.freeze(Object.fromEntries(FACULTIES.map((faculty) => [faculty, facultyLevel(world, actor, faculty)])));
}

export function whisper(world, actor) {
  const strongest = [...FACULTIES].sort((a, b) => facultyLevel(world, actor, b) - facultyLevel(world, actor, a) || (a < b ? -1 : 1))[0];
  return Object.freeze({ faculty: strongest, text: `${strongest} attends to the world.`, level: facultyLevel(world, actor, strongest) });
}
