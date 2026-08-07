import { Buffer } from "node:buffer";

import { seavt } from "@red-cup-engineering/witness-journal-entry-service";
import { appendSeavt } from "@red-cup-engineering/witness-journal-log-service";

function niSurface(role, token) {
  const match = /^ni:\/\/\/sha-256;([A-Za-z0-9_-]{43})$/u.exec(token);
  if (match === null) throw new TypeError(`${role} must be one semantic-content ni token`);
  return `semantic-content.${role}.sha256.${Buffer.from(match[1], "base64url").toString("hex")}`;
}

export function appendEditorialContributionWitness(root, at, { proposal, completion, witness, inference, disposition }) {
  const entity = niSurface("completion", completion);
  const positiveEvidence = disposition === "completion";
  const negativeEvidence = disposition !== "completion";
  return appendSeavt(root, "newswire.editorial-contribution", [
    seavt(entity, "editorial-contribution:proposal", niSurface("proposal", proposal), at),
    seavt(entity, "editorial-contribution:completion", entity, at),
    seavt(entity, "editorial-contribution:transition-witness", niSurface("transition-witness", witness), at),
    seavt(entity, "editorial-contribution:child-completion", niSurface("child-completion", inference), at),
    seavt(entity, "editorial-contribution:disposition", `editorial-contribution.disposition.${disposition}`, at),
    seavt(entity, "four:positive-evidence", `four.positive.${positiveEvidence}`, at),
    seavt(entity, "four:negative-evidence", `four.negative.${negativeEvidence}`, at),
  ], at);
}
