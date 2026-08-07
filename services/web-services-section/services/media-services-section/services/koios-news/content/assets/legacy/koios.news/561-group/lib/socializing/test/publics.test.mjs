// Tests for publics: addressed circulation and counterpublic isolation priced as currency.
import { test } from "node:test";
import assert from "node:assert/strict";

import { charge, chargeValue } from "@emsenn/relating";
import {
  completeTranslations,
  publics,
  ungroundedSection,
} from "../dist/index.mjs";

const meme = (issue, standing) => Object.freeze({
  kind: "predication.fiber.meme",
  subject: Object.freeze({ kind: "public.issue", id: issue }),
  predicate: Object.freeze({ kind: "public.stance" }),
  charge: charge(chargeValue(standing)),
});

const member = (identity, issue, standing) => Object.freeze({
  kind: "socializing.member",
  agent: Object.freeze({ kind: "animating.agent", identity }),
  memes: Object.freeze([meme(issue, standing)]),
});

function field(members, translations) {
  return Object.freeze({
    kind: "socializing.social-field",
    members: Object.freeze(members),
    base: Object.freeze({
      kind: "socializing.social-base",
      translations: Object.freeze(translations),
    }),
    section: ungroundedSection(),
  });
}

test("publics clears when a fully addressed audience reaches common knowledge", () => {
  const f = field([
    member("assembly", "rent", "potential"),
    member("tenant", "rent", "potential"),
  ], completeTranslations(2));

  const r = publics({
    name: "rent-public",
    field: f,
    issue: "rent",
    minimumAudience: 2,
  });

  assert.equal(r.kind, "socializing.publics");
  assert.equal(r.public, true);
  assert.equal(r.counterpublic, false);
  assert.equal(r.commonKnowledge.attained, true);
  assert.equal(r.consensus.obstruction, 0);
  assert.equal(r.currency.issued, 0);
});

test("publics prices missing address, failed common knowledge, and counterpublic isolation", () => {
  const f = field([
    member("tenant", "rent", "potential"),
    member("landlord", "rent", "active"),
  ], []);

  const r = publics({
    name: "rent-counterpublic",
    field: f,
    issue: "rent",
    minimumAudience: 2,
    subalternAgents: ["tenant"],
  });

  assert.equal(r.public, false);
  assert.equal(r.counterpublic, true);
  assert.equal(r.missingAddressEdges, 2);
  assert.equal(r.commonKnowledge.attained, false);
  assert.equal(r.currency.issued, 4);
  assert.equal(r.currency.cells.some((cell) => cell.id.endsWith(":counterpublic-isolation") && cell.issued === 1), true);
  assert.equal(r.theory.counterpublics.includes("real public-making"), true);
});
