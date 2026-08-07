import {
  chargeValueName,
  joinKnowledge,
  mark,
  negate,
  predicationTermIdentity,
  valueOf,
  witnessedPotential,
  type ChargeCarrier,
  type ChargeValueName,
  type PredicationTerm,
} from "@emsenn/relating";

import {
  workAgent,
  type OfficeName,
  type WorkEvidenceCarrier,
  type WorkAgent,
} from "../../algebra/index.mjs";

/**
 * A single recognition or withdrawal of an agent into an office: carries the
 * office, the agent, a charge carrier, the witness ("by"), and optional
 * timestamp and reason.
 */
export type OfficeRecognition = Readonly<{
  office: OfficeName;
  agent: WorkAgent;
  charge: ChargeCarrier;
  by: WorkEvidenceCarrier;
  at?: WorkEvidenceCarrier;
  reason?: WorkEvidenceCarrier;
}>;

/**
 * The resolved standing of an agent in an office: carries the office, the
 * agent, the joined charge of its recognitions, the resulting charge value name
 * as status, and the contributing recognitions.
 */
export type OfficeHolder = Readonly<{
  office: OfficeName;
  agent: WorkAgent;
  charge: ChargeCarrier;
  status: ChargeValueName;
  recognitions: readonly OfficeRecognition[];
}>;

/**
 * An append-only log of office recognitions and withdrawals: records each
 * recognition as a charge carrier and resolves current office holders by
 * joining the charges per office/agent seat.
 */
export class OfficeRegistry {
  #recognitions: OfficeRecognition[] = [];

  recognize(
    officeName: OfficeName,
    workAgentValue: WorkAgent,
    by: WorkEvidenceCarrier,
    at?: WorkEvidenceCarrier,
    reason?: WorkEvidenceCarrier,
  ): OfficeRecognition {
    const office = officeName;
    const agent = workAgent(workAgentValue);
    return this.#record({
      office,
      agent,
      charge: witnessedPotential(recognitionWitness(office, agent.term, "recognized-by", by)),
      by,
      ...(at === undefined ? {} : { at }),
      ...(reason === undefined ? {} : { reason }),
    });
  }

  withdraw(
    officeName: OfficeName,
    workAgentValue: WorkAgent,
    by: WorkEvidenceCarrier,
    at?: WorkEvidenceCarrier,
    reason?: WorkEvidenceCarrier,
  ): OfficeRecognition {
    const office = officeName;
    const agent = workAgent(workAgentValue);
    return this.#record({
      office,
      agent,
      charge: negate(witnessedPotential(recognitionWitness(office, agent.term, "withdrawn-by", by))),
      by,
      ...(at === undefined ? {} : { at }),
      ...(reason === undefined ? {} : { reason }),
    });
  }

  holders(officeName?: OfficeName): readonly OfficeHolder[] {
    const bySeat: { office: OfficeName; agent: WorkAgent; charge: ChargeCarrier; recognitions: OfficeRecognition[] }[] = [];
    for (const recognition of this.#recognitions) {
      if (officeName !== undefined && !sameTerm(recognition.office, officeName)) continue;
      const prior = bySeat.find((seat) => sameTerm(seat.office, recognition.office) && sameTerm(seat.agent.term, recognition.agent.term));
      if (prior === undefined) {
        bySeat.push({
          office: recognition.office,
          agent: recognition.agent,
          charge: recognition.charge,
          recognitions: [recognition],
        });
      } else {
        prior.charge = joinKnowledge(prior.charge, recognition.charge);
        prior.recognitions = [...prior.recognitions, recognition];
      }
    }
    return Object.freeze(
      bySeat
        .map(
          (seat): OfficeHolder =>
            Object.freeze({
              ...seat,
              status: chargeValueName(valueOf(seat.charge)),
              recognitions: Object.freeze([...seat.recognitions]),
            }),
        )
        .filter((seat) => seat.status === "potential" || seat.status === "stable"),
    );
  }

  get recognitions(): readonly OfficeRecognition[] {
    return Object.freeze([...this.#recognitions]);
  }

  #record(recognition: OfficeRecognition): OfficeRecognition {
    this.#recognitions.push(recognition);
    return recognition;
  }
}

function recognitionWitness(office: OfficeName, agent: PredicationTerm, predicate: string, witness: WorkEvidenceCarrier) {
  return mark(Object.freeze(["animating", "office-recognition", office, agent, predicate, witness] as const));
}

function sameTerm(left: PredicationTerm, right: PredicationTerm): boolean {
  return predicationTermIdentity(left, right).kind === "predication.termIdentity:witness";
}
