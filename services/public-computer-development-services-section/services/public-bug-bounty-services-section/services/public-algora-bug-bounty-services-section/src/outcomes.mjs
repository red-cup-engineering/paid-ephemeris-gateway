import { appendFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";


/** An immutable account of a bounty attempt, suitable for a JSONL journal. */
export class Outcome {
  constructor({ repository, issueNumber, status, observedAt, id: _storedId, ...details }) {
    if (!repository || !Number.isInteger(issueNumber)) throw new TypeError("an outcome needs repository and issueNumber");
    if (!['planned', 'attempted', 'won', 'lost', 'failed', 'skipped'].includes(status)) throw new TypeError(`unknown outcome status: ${status}`);
    Object.assign(this, { repository, issueNumber, status, observedAt: observedAt ?? new Date().toISOString(), ...details });
    this.id = semanticId({ ...this });
    Object.freeze(this);
  }
}

export async function readOutcomes(directory) {
  try { return (await readFile(join(directory, "outcomes.jsonl"), "utf8")).split("\n").filter(Boolean).map((line) => new Outcome(JSON.parse(line))); }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
}

export async function recordOutcome(directory, value) {
  const outcome = value instanceof Outcome ? value : new Outcome(value);
  await mkdir(directory, { recursive: true });
  await appendFile(join(directory, "outcomes.jsonl"), `${JSON.stringify(outcome)}\n`);
  return outcome;
}

/** Turn repeated, evidenced outcomes into suggestions; never mutate policy automatically. */
export function findPatterns(outcomes, { threshold = 2 } = {}) {
  const groups = new Map();
  for (const outcome of outcomes) {
    const key = `${outcome.repository}:${outcome.status}`;
    groups.set(key, [...(groups.get(key) ?? []), outcome]);
  }
  return [...groups.values()].filter((group) => group.length >= threshold).map((group) => ({
    repository: group[0].repository,
    status: group[0].status,
    evidence: group.map((outcome) => outcome.id),
    suggestion: group[0].status === "won" ? "prefer this repository" : "review this repository before another attempt",
  }));
}
