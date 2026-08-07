/**
 * expressing — playing morphisms expressed as typed total CHL proof terms.
 *
 * These are not JSON helpers with a fancy hat on: they are the playing proofs
 * whose carrier-level computation is expressible by the current product,
 * fold, conditional, coincidence, and bilattice-charge constructors in
 * `@emsenn/relating/notating`. When a playing operation seems to need
 * a new primitive, first factor it through these constructors; only genuine
 * non-structural operations should extend the evaluator.
 */
import {
  tm,
  type Tm,
} from "@emsenn/relating/notating";
import {
  arrayTerm,
  objectTerm,
  stringTerm,
} from "@emsenn/relating/evaluating/projecting";

const boolFalse: Tm = tm.bool(false);
const boolTrue: Tm = tm.bool(true);
const absurd: Tm = tm.charge("absurd");
const stable: Tm = tm.charge("stable");

const isString = (term: Tm, value: string): Tm => tm.coincide(term, stringTerm(value));
const isCharge = (term: Tm, value: "absurd" | "potential" | "active" | "stable"): Tm =>
  tm.coincide(term, tm.charge(value));

const appendOne = (list: Tm, item: Tm): Tm => tm.append(list, arrayTerm([item]));

const mapArray = (fn: Tm, list: Tm): Tm =>
  tm.fold(
    tm.lam(tm.lam(appendOne(tm.var(1), tm.app(fn, tm.var(0))))),
    arrayTerm([]),
    list,
  );

const actCharge = (act: Tm): Tm =>
  tm.cond(
    isString(act, "proponent"),
    tm.charge("potential"),
    tm.cond(
      isString(act, "opponent"),
      tm.charge("active"),
      tm.cond(isString(act, "daimon"), stable, absurd),
    ),
  );

const chargeAct = (charge: Tm): Tm =>
  tm.cond(
    isCharge(charge, "potential"),
    stringTerm("proponent"),
    tm.cond(
      isCharge(charge, "active"),
      stringTerm("opponent"),
      tm.cond(isCharge(charge, "stable"), stringTerm("daimon"), stringTerm("none")),
    ),
  );

const designEntryFromActEntry = (entry: Tm): Tm =>
  objectTerm([
    ["charge", actCharge(tm.field("act", entry))],
    ["locus", tm.field("locus", entry)],
  ]);

/** `design`: `{ entries: [{ locus, act }] } -> `{ entries: [{ locus, charge }] }`.
 *
 * The `none` act is the absent/absurd value, so it is not emitted into the
 * partial design support. This matches the runtime `designFromActs` path.
 */
export const designTerm: Tm = tm.lam(
  objectTerm([
    ["entries", tm.fold(
      tm.lam(tm.lam(
        tm.cond(
          isString(tm.field("act", tm.var(0)), "none"),
          tm.var(1),
          appendOne(tm.var(1), designEntryFromActEntry(tm.var(0))),
        ),
      )),
      arrayTerm([]),
      tm.field("entries", tm.var(0)),
    )],
  ]),
);

const dualizeEntryTerm: Tm = tm.lam(
  objectTerm([
    ["charge", tm.negate(tm.field("charge", tm.var(0)))],
    ["locus", tm.field("locus", tm.var(0))],
  ]),
);

/** `dualize`: pointwise bilattice negation on a Design's charge valuation. */
export const dualizeTerm: Tm = tm.lam(
  objectTerm([
    ["entries", mapArray(dualizeEntryTerm, tm.field("entries", tm.var(0)))],
  ]),
);

/** `hasLocus`: `locus -> entries -> bool`, using structural coincidence. */
const hasLocusTerm: Tm = tm.lam(tm.lam(
  tm.fold(
    tm.lam(tm.lam(
      tm.cond(tm.var(1), boolTrue, tm.coincide(tm.field("locus", tm.var(0)), tm.var(3))),
    )),
    boolFalse,
    tm.var(0),
  ),
));

const hasLocus = (entries: Tm, locus: Tm): Tm => tm.app(tm.app(hasLocusTerm, locus), entries);

/** `chargeAt`: `locus -> entries -> charge`, defaulting to absurd outside support. */
const chargeAtTerm: Tm = tm.lam(tm.lam(
  tm.fold(
    tm.lam(tm.lam(
      tm.cond(
        tm.coincide(tm.field("locus", tm.var(0)), tm.var(3)),
        tm.field("charge", tm.var(0)),
        tm.var(1),
      ),
    )),
    absurd,
    tm.var(0),
  ),
));

const chargeAt = (entries: Tm, locus: Tm): Tm => tm.app(tm.app(chargeAtTerm, locus), entries);

/** `unionEntries`: append right-only loci to the left entries, preserving order. */
const unionEntriesTerm: Tm = tm.lam(tm.lam(
  tm.fold(
    tm.lam(tm.lam(
      tm.cond(
        hasLocus(tm.var(1), tm.field("locus", tm.var(0))),
        tm.var(1),
        appendOne(tm.var(1), tm.var(0)),
      ),
    )),
    tm.var(1),
    tm.var(0),
  ),
));

const unionEntries = (left: Tm, right: Tm): Tm => tm.app(tm.app(unionEntriesTerm, left), right);

const normalEntriesTerm: Tm = tm.lam(tm.lam(
  tm.fold(
    tm.lam(tm.lam(
      appendOne(tm.var(1), objectTerm([
        ["charge", tm.joinK(
          chargeAt(tm.var(3), tm.field("locus", tm.var(0))),
          chargeAt(tm.var(2), tm.field("locus", tm.var(0))),
        )],
        ["locus", tm.field("locus", tm.var(0))],
      ])),
    )),
    arrayTerm([]),
    unionEntries(tm.var(1), tm.var(0)),
  ),
));

const normalEntries = (left: Tm, right: Tm): Tm => tm.app(tm.app(normalEntriesTerm, left), right);

const meetingOf = (leftEntries: Tm, rightEntries: Tm, locus: Tm): Tm => {
  const leftCharge = chargeAt(leftEntries, locus);
  const rightCharge = chargeAt(rightEntries, locus);
  const joined = tm.joinK(leftCharge, rightCharge);
  return objectTerm([
    ["daimonized", tm.coincide(joined, stable)],
    ["joined", joined],
    ["left", chargeAct(leftCharge)],
    ["locus", locus],
    ["right", chargeAct(rightCharge)],
  ]);
};

const meetingsTerm: Tm = tm.lam(tm.lam(
  tm.fold(
    tm.lam(tm.lam(
      tm.cond(
        hasLocus(tm.var(2), tm.field("locus", tm.var(0))),
        appendOne(tm.var(1), meetingOf(tm.var(3), tm.var(2), tm.field("locus", tm.var(0)))),
        tm.var(1),
      ),
    )),
    arrayTerm([]),
    tm.var(1),
  ),
));

const meetingsOf = (left: Tm, right: Tm): Tm => tm.app(tm.app(meetingsTerm, left), right);

const daimonLociOf = (meetings: Tm): Tm =>
  tm.fold(
    tm.lam(tm.lam(
      tm.cond(
        tm.field("daimonized", tm.var(0)),
        appendOne(tm.var(1), tm.field("locus", tm.var(0))),
        tm.var(1),
      ),
    )),
    arrayTerm([]),
    meetings,
  );

/** `interact`: the ludics cut report, composed as pointwise knowledge-join. */
export const interactTerm: Tm = tm.lam(
  objectTerm([
    ["daimonLoci", daimonLociOf(meetingsOf(
      tm.field("entries", tm.field("designA", tm.var(0))),
      tm.field("entries", tm.field("designB", tm.var(0))),
    ))],
    ["meetings", meetingsOf(
      tm.field("entries", tm.field("designA", tm.var(0))),
      tm.field("entries", tm.field("designB", tm.var(0))),
    )],
    ["normalForm", objectTerm([
      ["entries", normalEntries(
        tm.field("entries", tm.field("designA", tm.var(0))),
        tm.field("entries", tm.field("designB", tm.var(0))),
      )],
    ])],
  ]),
);

export const playingTerms = Object.freeze({
  design: designTerm,
  dualize: dualizeTerm,
  interact: interactTerm,
} as const);
