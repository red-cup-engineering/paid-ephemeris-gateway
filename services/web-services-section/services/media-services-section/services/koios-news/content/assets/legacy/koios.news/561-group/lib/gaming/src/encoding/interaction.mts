/**
 * Interaction-report codec — the per-locus meeting of two dual designs.
 *
 * The interaction theorem realizes interaction as the knowledge join of dual
 * valuations; the report records, per shared locus, the two acts, their joined
 * charge, and whether they collide into the Daimon $\top$.  `InteractionReport`
 * and its `MeetingPoint`s are report carriers with no hidden invariant, so we
 * reconstruct frozen literals (with their fixed `kind` discriminants) directly
 * rather than recomputing via `interactionReport`, which would not reproduce an
 * arbitrary serialized report.  The embedded `normalForm` is a design, encoded
 * and decoded through the charge-faithful design codec.
 */
import type { Design } from "../index.mjs";
import type { DesignAct } from "../index.mjs";
import type { Locus } from "../index.mjs";
import type { ChargeValue } from "@emsenn/relating";
import type { InteractionReport, MeetingPoint } from "../index.mjs";
import { decodeCharge, encodeCharge } from "./charge.mjs";
import { decodeDesign, encodeDesign } from "./design.mjs";
import { decodeLocus, encodeLocus } from "./locus.mjs";
import { asArray, asBoolean, asObject, asString, field } from "./json.mjs";
import type { Json } from "./json.mjs";

const DESIGN_ACTS: readonly DesignAct[] = ["proponent", "opponent", "daimon", "none"];

function decodeAct(json: unknown, what: string): DesignAct {
  const name = asString(json, what);
  if (!(DESIGN_ACTS as readonly string[]).includes(name)) {
    throw new TypeError(`game-codecs: expected design act for ${what}, got ${JSON.stringify(json)}`);
  }
  return name as DesignAct;
}

function encodeMeeting(value: MeetingPoint): Json {
  return {
    locus: encodeLocus(value.locus),
    left: value.left,
    right: value.right,
    joined: encodeCharge(value.joined),
    daimonized: value.daimonized,
  };
}

function decodeMeeting(json: unknown): MeetingPoint {
  const obj = asObject(json, "meeting");
  const locusValue: Locus = decodeLocus(field(obj, "locus", "meeting"));
  const left: DesignAct = decodeAct(field(obj, "left", "meeting"), "meeting.left");
  const right: DesignAct = decodeAct(field(obj, "right", "meeting"), "meeting.right");
  const joined: ChargeValue = decodeCharge(field(obj, "joined", "meeting"));
  const daimonized = asBoolean(field(obj, "daimonized", "meeting"), "meeting.daimonized");
  return Object.freeze({
    kind: "game.interaction.meeting" as const,
    locus: locusValue,
    left,
    right,
    joined,
    daimonized,
  });
}

/** Encode an interaction report to `{normalForm, meetings, daimonLoci}`. */
export function encodeInteractionReport(value: InteractionReport): Json {
  return {
    normalForm: encodeDesign(value.normalForm),
    meetings: value.meetings.map(encodeMeeting),
    daimonLoci: value.daimonLoci.map(encodeLocus),
  };
}

/** Decode `{normalForm, meetings, daimonLoci}` back to a frozen `InteractionReport`. */
export function decodeInteractionReport(json: unknown): InteractionReport {
  const obj = asObject(json, "interactionReport");
  const normalForm: Design = decodeDesign(field(obj, "normalForm", "interactionReport"));
  const meetings = asArray(field(obj, "meetings", "interactionReport"), "interactionReport.meetings").map(
    decodeMeeting,
  );
  const daimonLoci = asArray(field(obj, "daimonLoci", "interactionReport"), "interactionReport.daimonLoci").map(
    decodeLocus,
  );
  return Object.freeze({
    kind: "game.interaction.report" as const,
    normalForm,
    meetings: Object.freeze(meetings),
    daimonLoci: Object.freeze(daimonLoci),
  });
}
