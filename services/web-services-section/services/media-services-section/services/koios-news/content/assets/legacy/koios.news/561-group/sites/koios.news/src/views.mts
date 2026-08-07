// views.mts — the privacy-light view counter: an append-only trace of witnessed
// page views, folded into counts on read. No IP, no user agent, no cookie, no
// identifier ever enters the trace: a view assertion is {p, r?, t} — path,
// referrer host, and a wall-clock day stamp kept as testimony.
//
// This trace is the demand side of the mill's feedback loop: viewCounts() is
// what the assignment desk reads to learn which keywords earn attention.

import { isJsonRecord } from "@emsenn/relating/codecs";
import { appendJsonl, readJsonl } from "@emsenn/relating/holography/projecting";

export type ViewAssertion = Readonly<{
  /** Site-relative path viewed, e.g. "/posts/thailand-rice-export-ban". */
  p: string;
  /** Referrer host, if the browser offered one. */
  r?: string;
  /** Day stamp (YYYY-MM-DD). Testimony of when, never an ordering. */
  t: string;
}>;

export type ViewCounts = Readonly<{
  total: number;
  byPath: Readonly<Record<string, number>>;
  byReferrer: Readonly<Record<string, number>>;
  byDay: Readonly<Record<string, number>>;
}>;

const PATH_PATTERN = /^\/[\x21-\x7e]{0,512}$/;

/** Judge a candidate view assertion from query material; null when malformed. */
export function viewAssertion(input: { p?: string | null; r?: string | null; day: string }): ViewAssertion | null {
  const path = input.p ?? "";
  if (!PATH_PATTERN.test(path)) return null;
  const referrer = (input.r ?? "").slice(0, 256);
  return Object.freeze({
    p: path,
    ...(referrer === "" ? {} : { r: referrer }),
    t: input.day,
  });
}

/** Today's day stamp. Wall-clock as testimony of when a view was witnessed. */
export function dayStamp(): string {
  return new Date().toISOString().slice(0, 10); // law-allow: wall-clock-as-data — testimony on a view witness, never ordering
}

export class ViewTrace {
  readonly path: string;

  constructor(path: string) {
    this.path = path;
  }

  /** Append one witnessed view. The trace only ever extends — and never dedupes,
   *  since each line is a counted view. The raw append-only JSONL fs idiom is the
   *  congregated binding's `appendJsonl` (advisory: a failed view-write never
   *  breaks a page render). */
  append(view: ViewAssertion): void {
    appendJsonl(this.path, [view]);
  }

  /** Replay the recorded trace. Unparseable lines are held aside, not folded. */
  replay(): readonly ViewAssertion[] {
    const views: ViewAssertion[] = [];
    for (const parsed of readJsonl(this.path)) {
      if (isJsonRecord(parsed) && typeof parsed.p === "string" && typeof parsed.t === "string") {
        views.push(Object.freeze({ p: parsed.p, ...(typeof parsed.r === "string" ? { r: parsed.r } : {}), t: parsed.t }));
      }
    }
    return Object.freeze(views);
  }

  /** Fold the trace into counts — the derived value; the trace is the truth. */
  counts(): ViewCounts {
    const byPath: Record<string, number> = {};
    const byReferrer: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    let total = 0;
    for (const view of this.replay()) {
      total += 1;
      byPath[view.p] = (byPath[view.p] ?? 0) + 1;
      if (view.r) byReferrer[view.r] = (byReferrer[view.r] ?? 0) + 1;
      byDay[view.t] = (byDay[view.t] ?? 0) + 1;
    }
    return Object.freeze({ total, byPath: Object.freeze(byPath), byReferrer: Object.freeze(byReferrer), byDay: Object.freeze(byDay) });
  }
}
